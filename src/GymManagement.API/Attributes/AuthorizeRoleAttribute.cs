using System.Security.Claims;
using GymManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GymManagement.API.Attributes
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class AuthorizeRoleAttribute : Attribute, IAuthorizationFilter
    {
        private readonly Role[] _allowedRoles;

        public AuthorizeRoleAttribute(params Role[] allowedRoles)
        {
            _allowedRoles = allowedRoles;
        }

        public void OnAuthorization(AuthorizationFilterContext context)
        {
            if (!context.HttpContext.User.Identity?.IsAuthenticated ?? true)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var userRole = context.HttpContext.User.FindFirstValue("role");

            if (string.IsNullOrEmpty(userRole))
            {
                context.Result = new ForbidResult();
                return;
            }

            if (!Enum.TryParse<Role>(userRole, out var role))
            {
                context.Result = new ForbidResult();
                return;
            }

            if (!_allowedRoles.Contains(role))
            {
                context.Result = new ForbidResult();
                return;
            }
        }
    }
}

