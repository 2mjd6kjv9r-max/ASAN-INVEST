using AsanInvest.Application;
using Microsoft.Extensions.Logging;

namespace AsanInvest.Infrastructure.Integrations;

public interface IAsanLoginClient
{
    object Describe();
}

public sealed class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _log;
    public LoggingEmailSender(ILogger<LoggingEmailSender> log) => _log = log;

    public Task SendAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        _log.LogInformation("Email adapter stub: queued message to {To} subject {Subject}", to, subject);
        return Task.CompletedTask;
    }
}

public sealed class LoggingSmsSender : ISmsSender
{
    private readonly ILogger<LoggingSmsSender> _log;
    public LoggingSmsSender(ILogger<LoggingSmsSender> log) => _log = log;

    public Task SendAsync(string to, string body, CancellationToken ct = default)
    {
        _log.LogInformation("SMS adapter stub: queued message to {To}", to);
        return Task.CompletedTask;
    }
}

public sealed class AsanLoginStub : IAsanLoginClient
{
    public object Describe() => new
    {
        provider = "asan_login",
        available = false,
        identificationLevelIfCompleted = "LEGAL",
        message = "ASAN Login is not connected in Phase 1. Use email registration (level 1) and continue legal actions via a representative or when the provider is specified.",
    };
}
