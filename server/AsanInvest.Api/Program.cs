using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using AsanInvest.Api;
using AsanInvest.Application;
using AsanInvest.Application.Validation;
using AsanInvest.Infrastructure.Integrations;
using AsanInvest.Infrastructure.Persistence;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var settings = AppSettings.FromConfiguration(builder.Configuration);
builder.Services.AddSingleton(settings);
builder.Services.Configure<AppSettings>(_ =>
{
    _.DatabaseUrl = settings.DatabaseUrl;
    _.Port = settings.Port;
    _.ClientOrigin = settings.ClientOrigin;
    _.JwtAccessSecret = settings.JwtAccessSecret;
    _.JwtRefreshSecret = settings.JwtRefreshSecret;
    _.JwtAccessExpiresIn = settings.JwtAccessExpiresIn;
    _.JwtRefreshExpiresIn = settings.JwtRefreshExpiresIn;
    _.BcryptRounds = settings.BcryptRounds;
    _.RequireEmailVerification = settings.RequireEmailVerification;
    _.CookieSecure = settings.CookieSecure;
    _.RefreshCookieName = settings.RefreshCookieName;
    _.UploadDir = settings.UploadDir;
    _.MaxUploadBytes = settings.MaxUploadBytes;
    _.DvxCompanyRegistrationUrl = settings.DvxCompanyRegistrationUrl;
});

if (!builder.Environment.IsEnvironment("Testing"))
    builder.WebHost.UseUrls($"http://0.0.0.0:{settings.Port}");

builder.Services.AddSingleton(_ => NpgsqlSetup.CreateDataSource(settings.DatabaseUrl));
builder.Services.AddDbContext<AsanInvestDbContext>((sp, options) =>
{
    options.UseNpgsql(sp.GetRequiredService<Npgsql.NpgsqlDataSource>());
});
builder.Services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AsanInvestDbContext>());
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<PlatformService>();
builder.Services.AddSingleton<AuthChallengeStore>();
builder.Services.AddSingleton<IEmailSender, LoggingEmailSender>();
builder.Services.AddSingleton<ISmsSender, LoggingSmsSender>();
builder.Services.AddSingleton<IAsanLoginClient, AsanLoginStub>();

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(namingPolicy: null));
        options.JsonSerializerOptions.Converters.Add(new DecimalStringConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableDecimalStringConverter());
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var details = context.ModelState
                .Where(kv => kv.Value is { Errors.Count: > 0 })
                .SelectMany(kv => kv.Value!.Errors.Select(err => new
                {
                    path = kv.Key,
                    message = string.IsNullOrWhiteSpace(err.ErrorMessage) ? "Invalid value" : err.ErrorMessage,
                }))
                .ToList();
            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new
            {
                error = new { code = "VALIDATION_ERROR", message = "Request validation failed", details },
            });
        };
    });

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(settings.ClientOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var testing = builder.Environment.IsEnvironment("Testing");
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (ctx, token) =>
    {
        ctx.HttpContext.Response.ContentType = "application/json";
        await ctx.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = new { code = "RATE_LIMITED", message = "Too many authentication attempts. Try again later." },
        }, token);
    };
    options.AddPolicy("auth", httpContext =>
    {
        var key = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(15),
            PermitLimit = testing ? 1000 : 20,
            QueueLimit = 0,
            AutoReplenishment = true,
        });
    });
    options.AddPolicy("api", httpContext =>
    {
        var key = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter("api:" + key, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = testing ? 1000 : 120,
            QueueLimit = 0,
            AutoReplenishment = true,
        });
    });
});

System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultMapInboundClaims = false;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.JwtAccessSecret)),
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "sub",
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var typ = context.Principal?.FindFirst("typ")?.Value;
                if (!string.Equals(typ, "access", StringComparison.Ordinal))
                    context.Fail("Access token required");
                return Task.CompletedTask;
            },
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { error = new { code = "UNAUTHORIZED", message = "Authentication required" } });
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { error = new { code = "FORBIDDEN", message = "Insufficient permissions" } });
            },
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();

if (builder.Environment.IsDevelopment())
    builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

if (app.Environment.IsProduction())
{
    if (settings.JwtAccessSecret.Contains("dev-only", StringComparison.OrdinalIgnoreCase)
        || settings.JwtRefreshSecret.Contains("dev-only", StringComparison.OrdinalIgnoreCase)
        || settings.JwtAccessSecret.Length < 32
        || settings.JwtRefreshSecret.Length < 32
        || settings.DatabaseUrl.Contains("asan_dev_password", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException("Production requires non-default JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, and DATABASE_URL.");
    }
}

app.UseMiddleware<RequestIdMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors();
app.UseRateLimiter();
app.UseMiddleware<HoneypotMiddleware>();
app.UseAuthentication();
app.UseMiddleware<CurrentUserMiddleware>();
app.UseAuthorization();
app.MapControllers().RequireRateLimiting("api");

app.Run();

public partial class Program { }
