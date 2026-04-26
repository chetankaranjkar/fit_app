using System.Diagnostics;
using GymManagement.Core.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Middleware;

/// <summary>
/// Converts unhandled exceptions into RFC7807 responses with correlation information.
/// </summary>
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
            var (statusCode, title, detail, type) = MapException(ex);
            _logger.LogError(ex, "Unhandled exception mapped to {StatusCode}. TraceId: {TraceId}", statusCode, traceId);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/problem+json";

            var problem = new ProblemDetails
            {
                Title = title,
                Detail = detail,
                Status = statusCode,
                Type = type,
                Instance = context.Request.Path
            };
            problem.Extensions["traceId"] = traceId;

            await context.Response.WriteAsJsonAsync(problem);
        }
    }

    private static (int StatusCode, string Title, string Detail, string Type) MapException(Exception ex)
    {
        return ex switch
        {
            BadRequestException badReqEx => (
                StatusCodes.Status400BadRequest,
                "Invalid request.",
                string.IsNullOrWhiteSpace(badReqEx.Message) ? "Request payload is invalid." : badReqEx.Message,
                "https://httpstatuses.com/400"),
            NotFoundException notFoundEx => (
                StatusCodes.Status404NotFound,
                "Resource not found.",
                string.IsNullOrWhiteSpace(notFoundEx.Message) ? "Requested resource does not exist." : notFoundEx.Message,
                "https://httpstatuses.com/404"),
            ConflictException conflictEx => (
                StatusCodes.Status409Conflict,
                "Operation conflict.",
                string.IsNullOrWhiteSpace(conflictEx.Message) ? "The requested operation conflicts with existing data." : conflictEx.Message,
                "https://httpstatuses.com/409"),
            ArgumentException argEx => (
                StatusCodes.Status400BadRequest,
                "Invalid request.",
                string.IsNullOrWhiteSpace(argEx.Message) ? "Request payload is invalid." : argEx.Message,
                "https://httpstatuses.com/400"),
            KeyNotFoundException keyEx => (
                StatusCodes.Status404NotFound,
                "Resource not found.",
                string.IsNullOrWhiteSpace(keyEx.Message) ? "Requested resource does not exist." : keyEx.Message,
                "https://httpstatuses.com/404"),
            InvalidOperationException invalidOpEx => (
                StatusCodes.Status409Conflict,
                "Operation conflict.",
                string.IsNullOrWhiteSpace(invalidOpEx.Message) ? "The requested operation could not be completed." : invalidOpEx.Message,
                "https://httpstatuses.com/409"),
            UnauthorizedAccessException unauthorizedEx => (
                StatusCodes.Status403Forbidden,
                "Forbidden.",
                string.IsNullOrWhiteSpace(unauthorizedEx.Message) ? "You are not allowed to perform this action." : unauthorizedEx.Message,
                "https://httpstatuses.com/403"),
            _ => (
                StatusCodes.Status500InternalServerError,
                "An unexpected error occurred.",
                "The server could not process this request. Please retry or contact support.",
                "https://httpstatuses.com/500")
        };
    }
}
