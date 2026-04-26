using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace GymManagement.API.Swagger;

/// <summary>
/// Adds 401 Unauthorized and 403 Forbidden to the Swagger doc for operations that require authentication.
/// </summary>
public class UnauthorizedAndForbiddenOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var hasAuth = context.MethodInfo.DeclaringType?
            .GetCustomAttributes(true)
            .Any(a => a is AuthorizeAttribute)
            ?? false;
        hasAuth = hasAuth || context.MethodInfo
            .GetCustomAttributes(true)
            .Any(a => a is AuthorizeAttribute);

        if (!hasAuth)
            return;

        operation.Security.Add(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                Array.Empty<string>()
            }
        });
        operation.Responses.TryAdd("401", new OpenApiResponse
        {
            Description = "Unauthorized – missing or invalid JWT. Use the Authorize button and enter: Bearer &lt;token&gt;"
        });
        operation.Responses.TryAdd("403", new OpenApiResponse
        {
            Description = "Forbidden – authenticated but not allowed (e.g. wrong role)"
        });
    }
}
