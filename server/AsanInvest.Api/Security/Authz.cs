using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AsanInvest.Application;
using AsanInvest.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AsanInvest.Api;

public sealed class CurrentUserMiddleware
{
    public const string ItemKey = "CurrentUser";

    private readonly RequestDelegate _next;
    public CurrentUserMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext context, IAppDbContext db, IOptions<AppSettings> settings)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var sub = context.User.FindFirstValue("sub")
                ?? context.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (sub is null || !Guid.TryParse(sub, out var userId))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = new { code = "TOKEN_INVALID", message = "Invalid or expired access token" } });
                return;
            }

            var user = await db.Users.Include(u => u.RoleAssignments).FirstOrDefaultAsync(u => u.Id == userId);
            if (user is null)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = new { code = "UNAUTHORIZED", message = "Account no longer exists" } });
                return;
            }
            if (user.Status == UserStatus.DISABLED)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { error = new { code = "ACCOUNT_DISABLED", message = "Account is disabled" } });
                return;
            }

            var roles = Roles.Active(user.RoleAssignments, DateTimeOffset.UtcNow);
            if (Roles.RequiresTwoFactor(roles) && !user.TwoFactorEnabled
                && string.Equals(context.RequestServices.GetRequiredService<IHostEnvironment>().EnvironmentName, "Production", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { error = new { code = "TWO_FACTOR_REQUIRED", message = "Two-factor authentication is required for internal roles" } });
                return;
            }

            context.Items[ItemKey] = new CurrentUser(user.Id, user.Email, roles, user.IdentificationLevel, user.InstitutionId);
            _ = settings;
        }

        await _next(context);
    }
}

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireRolesAttribute : Attribute, IAsyncActionFilter
{
    private readonly UserRole[] _roles;
    public RequireRolesAttribute(params UserRole[] roles) => _roles = roles;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (context.HttpContext.Items[CurrentUserMiddleware.ItemKey] is not CurrentUser user)
        {
            context.Result = new ObjectResult(new { error = new { code = "UNAUTHORIZED", message = "Authentication required" } }) { StatusCode = 401 };
            return;
        }
        if (_roles.Length > 0 && !_roles.Any(user.Roles.Contains))
        {
            context.Result = new ObjectResult(new { error = new { code = "FORBIDDEN", message = "Insufficient permissions" } }) { StatusCode = 403 };
            return;
        }
        await next();
    }
}
