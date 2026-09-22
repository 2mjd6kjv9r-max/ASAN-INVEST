using AsanInvest.Application;
using AsanInvest.Domain;
using Microsoft.Extensions.Logging;

namespace AsanInvest.Infrastructure.Integrations;

/// PLAN-PHASE3 §1.3 / §4.2.8 — no invented OIDC/SAML/XML. Available stays false until a spec is in-repo.
public sealed class ENonresidentClientStub : IENonresidentClient
{
    private readonly ILogger<ENonresidentClientStub> _log;
    public ENonresidentClientStub(ILogger<ENonresidentClientStub> log) => _log = log;

    public Task<IntegrationOutcome> StartAsync(Guid userId, CancellationToken ct)
    {
        _log.LogInformation("e-nonresident start stub for user {UserId}", userId);
        _ = ct;
        return Task.FromResult(Unavailable("e_nonresident", "Virtual FİN / e-qeyri-rezident is not connected. Continue via a representative or wait for the protocol."));
    }

    public Task<IntegrationOutcome> CompleteAsync(Guid userId, string? assertion, CancellationToken ct)
    {
        _log.LogInformation("e-nonresident complete stub for user {UserId}", userId);
        _ = assertion;
        _ = ct;
        return Task.FromResult(Unavailable("e_nonresident", "Remote identity proofing is not available. Identification level stays 1. A virtual FİN was not issued."));
    }

    private static IntegrationOutcome Unavailable(string provider, string message) =>
        new(false, Flag.PLANNED.ToString(), null, System.Text.Json.JsonSerializer.Serialize(new { provider, available = false }), message);
}

public sealed class ForeignEsignClientStub : IForeignEsignClient
{
    private readonly ILogger<ForeignEsignClientStub> _log;
    public ForeignEsignClientStub(ILogger<ForeignEsignClientStub> log) => _log = log;

    public Task<IntegrationOutcome> StartAsync(string? issuer, CancellationToken ct)
    {
        _log.LogInformation("foreign e-sign start stub issuer {Issuer}", issuer);
        _ = ct;
        return Task.FromResult(new IntegrationOutcome(
            false,
            Flag.PLANNED.ToString(),
            null,
            System.Text.Json.JsonSerializer.Serialize(new { provider = "foreign_esign", issuer, available = false }),
            "Mutual recognition of foreign e-signatures is not in force. This does not raise identification to LEGAL."));
    }
}

public sealed class VisaClientStub : IVisaClient
{
    private readonly ILogger<VisaClientStub> _log;
    public VisaClientStub(ILogger<VisaClientStub> log) => _log = log;

    public Task<IntegrationOutcome> SubmitAsync(Guid objectId, CancellationToken ct)
    {
        _log.LogInformation("visa submit stub for {ObjectId}", objectId);
        _ = ct;
        return Task.FromResult(Unavailable("visa", "ASAN Viza is not connected. A back-office task will continue the step."));
    }

    private static IntegrationOutcome Unavailable(string provider, string message) =>
        new(false, Flag.PLANNED.ToString(), null, System.Text.Json.JsonSerializer.Serialize(new { provider, available = false }), message);
}

public sealed class CustomsClientStub : ICustomsClient
{
    private readonly ILogger<CustomsClientStub> _log;
    public CustomsClientStub(ILogger<CustomsClientStub> log) => _log = log;

    public Task<IntegrationOutcome> SubmitAsync(Guid objectId, CancellationToken ct)
    {
        _log.LogInformation("customs submit stub for {ObjectId}", objectId);
        _ = ct;
        return Task.FromResult(new IntegrationOutcome(
            false,
            Flag.PLANNED.ToString(),
            null,
            System.Text.Json.JsonSerializer.Serialize(new { provider = "customs", available = false }),
            "Customs incentive API is not specified. The institution completes the case in back-office."));
    }
}

public sealed class UtilityClientStub : IUtilityClient
{
    private readonly ILogger<UtilityClientStub> _log;
    public UtilityClientStub(ILogger<UtilityClientStub> log) => _log = log;

    public Task<IntegrationOutcome> SubmitAsync(string kind, Guid objectId, CancellationToken ct)
    {
        _log.LogInformation("utility {Kind} submit stub for {ObjectId}", kind, objectId);
        _ = ct;
        return Task.FromResult(new IntegrationOutcome(
            false,
            Flag.PLANNED.ToString(),
            null,
            System.Text.Json.JsonSerializer.Serialize(new { provider = kind, available = false }),
            "Utility connection APIs are not specified. Electricity must not claim ONLINE without a live adapter."));
    }
}
