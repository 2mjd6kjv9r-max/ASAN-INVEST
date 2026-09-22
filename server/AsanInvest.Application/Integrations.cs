using System.Text.Json;

namespace AsanInvest.Application;

/// Opaque adapter results. No invented provider schemas (PLAN-PHASE2 §1).
public sealed record IntegrationOutcome(bool Available, string Flag, string? ProviderRef, string RawPayload, string? Message);

public sealed record DvxActivityItem(string TaxId, DateTimeOffset LastActivityAt);

public interface IDvxClient
{
    Task<IntegrationOutcome> SubmitPackageAsync(Guid packageId, object payload, CancellationToken ct);
    Task<IntegrationOutcome> NameAvailabilityAsync(string name, CancellationToken ct);
    Task<IReadOnlyList<DvxActivityItem>> ActivityFeedAsync(CancellationToken ct);
}

public interface IBankKycClient
{
    Task<IntegrationOutcome> SubmitAsync(Guid bankInstitutionId, JsonElement packet, CancellationToken ct);
}

public interface IPaymentProvider
{
    Task<IntegrationOutcome> InitiateAsync(Guid paymentId, decimal amount, string currency, CancellationToken ct);
}
