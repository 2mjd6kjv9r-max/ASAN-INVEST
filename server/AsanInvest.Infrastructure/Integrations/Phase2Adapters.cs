using System.Text.Json;
using AsanInvest.Application;
using AsanInvest.Domain;
using Microsoft.Extensions.Logging;

namespace AsanInvest.Infrastructure.Integrations;

/// Stubs until a DVX / bank / payment spec exists in-repo. Never invent request bodies.
public sealed class DvxClientStub : IDvxClient
{
    private readonly ILogger<DvxClientStub> _log;
    public DvxClientStub(ILogger<DvxClientStub> log) => _log = log;

    public Task<IntegrationOutcome> SubmitPackageAsync(Guid packageId, object payload, CancellationToken ct)
    {
        _log.LogInformation("DVX submit stub: package {PackageId} not sent", packageId);
        _ = payload;
        _ = ct;
        return Task.FromResult(Unavailable("dvx"));
    }

    public Task<IntegrationOutcome> NameAvailabilityAsync(string name, CancellationToken ct)
    {
        _log.LogInformation("DVX name-availability stub for a name of length {Length}", name.Length);
        _ = ct;
        return Task.FromResult(Unavailable("dvx"));
    }

    public Task<IReadOnlyList<DvxActivityItem>> ActivityFeedAsync(CancellationToken ct)
    {
        _ = ct;
        // Empty feed: Aftercare must not mark companies inactive (PLAN-PHASE2 §4.2.6 / QA §9).
        return Task.FromResult<IReadOnlyList<DvxActivityItem>>([]);
    }

    private static IntegrationOutcome Unavailable(string provider) =>
        new(false, Flag.PLANNED.ToString(), null, JsonSerializer.Serialize(new { provider, available = false }),
            "Integration is not configured. A back-office task will continue the step.");
}

public sealed class BankKycClientStub : IBankKycClient
{
    private readonly ILogger<BankKycClientStub> _log;
    public BankKycClientStub(ILogger<BankKycClientStub> log) => _log = log;

    public Task<IntegrationOutcome> SubmitAsync(Guid bankInstitutionId, JsonElement packet, CancellationToken ct)
    {
        _log.LogInformation("Bank KYC stub: packet not sent to institution {BankId}", bankInstitutionId);
        _ = packet;
        _ = ct;
        return Task.FromResult(new IntegrationOutcome(
            false,
            Flag.PLANNED.ToString(),
            null,
            JsonSerializer.Serialize(new { provider = "bank_kyc", bankInstitutionId, available = false }),
            "Bank KYC API is not configured. Bank staff complete the case in back-office."));
    }
}

public sealed class PaymentProviderStub : IPaymentProvider
{
    private readonly ILogger<PaymentProviderStub> _log;
    public PaymentProviderStub(ILogger<PaymentProviderStub> log) => _log = log;

    public Task<IntegrationOutcome> InitiateAsync(Guid paymentId, decimal amount, string currency, CancellationToken ct)
    {
        _log.LogInformation("Payment provider stub: payment {PaymentId} not charged ({Currency})", paymentId, currency);
        _ = amount;
        _ = ct;
        return Task.FromResult(new IntegrationOutcome(
            false,
            Flag.PLANNED.ToString(),
            paymentId.ToString("N"),
            JsonSerializer.Serialize(new { provider = "payment", paymentId, available = false }),
            "Payment provider is not configured. State fees can still be recorded as EXTERNAL / PLAN."));
    }
}
