using System.Net;
using System.Text.Json;
using AsanInvest.Application;
using Microsoft.EntityFrameworkCore;

namespace AsanInvest.Api;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _log;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> log, IHostEnvironment env)
    {
        _next = next;
        _log = log;
        _env = env;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
            if (!context.Response.HasStarted && context.Response.StatusCode == (int)HttpStatusCode.NotFound
                && context.GetEndpoint() is null)
            {
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { error = new { code = "NOT_FOUND", message = "No route matched this request" } });
            }
        }
        catch (AppException ex)
        {
            await Write(context, ex.StatusCode, ex.Code, ex.Message, ex.Details);
        }
        catch (DbUpdateException ex)
        {
            _log.LogWarning(ex, "Database conflict");
            await Write(context, 409, "CONFLICT", "A record with this unique value already exists", null);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Unhandled error");
            var message = _env.IsProduction() ? "An unexpected error occurred" : ex.Message;
            await Write(context, 500, "INTERNAL_ERROR", message, null);
        }
    }

    private static async Task Write(HttpContext context, int status, string code, string message, object? details)
    {
        if (context.Response.HasStarted) return;
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { error = new { code, message, details } },
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull });
    }
}

public sealed class RequestIdMiddleware
{
    private readonly RequestDelegate _next;
    public RequestIdMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext context)
    {
        var id = context.Request.Headers["x-request-id"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(id)) id = Guid.NewGuid().ToString();
        context.Items["RequestId"] = id;
        context.Response.Headers["x-request-id"] = id;
        await _next(context);
    }
}

public sealed class HoneypotMiddleware
{
    private readonly RequestDelegate _next;
    public HoneypotMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext context)
    {
        if (HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method) || HttpMethods.IsPatch(context.Request.Method))
        {
            var contentType = context.Request.ContentType ?? "";
            if (contentType.Contains("json", StringComparison.OrdinalIgnoreCase) && (context.Request.ContentLength ?? 0) > 0)
            {
                context.Request.EnableBuffering();
                using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
                var text = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;
                if (!string.IsNullOrWhiteSpace(text))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(text);
                        if (doc.RootElement.ValueKind == JsonValueKind.Object
                            && doc.RootElement.TryGetProperty("website", out var website)
                            && website.ValueKind == JsonValueKind.String
                            && website.GetString() is { Length: > 0 })
                        {
                            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                            context.Response.ContentType = "application/json";
                            await context.Response.WriteAsJsonAsync(new { error = new { code = "RATE_LIMITED", message = "Too many requests" } });
                            return;
                        }
                    }
                    catch (JsonException)
                    {
                        // let model binding report the error
                    }
                }
            }
        }
        await _next(context);
    }
}
