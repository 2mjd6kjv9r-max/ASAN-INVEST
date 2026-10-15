using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Domain;

namespace AsanInvest.Infrastructure;

/// <summary>
/// Qurum inteqrasiyası simulyasiyası (TZ: «Real inteqrasiya yoxdur, bütün qurum cavabları nümunə məlumatla simulyasiya olunur»).
/// Real API gələndə hər qurum üçün IInstitutionGateway implementasiyası yazılır, qalan kod dəyişmir.
/// </summary>
public sealed class MockInstitutionGateway : IInstitutionGateway
{
    public GatewayReceipt Dispatch(InstitutionRequest request, Job job, IReadOnlyList<Document> documents) =>
        new($"SIM-{request.InstitutionCode}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}", request.Channel, true);

    public IReadOnlyList<SystemDataItem> GetSystemData(InstitutionRequest request, Job job, InvestorProfile? profile)
    {
        // Statik nümunə: digər qurumların informasiya sistemindən avtomatik gələn məlumat (uydurma).
        return new List<SystemDataItem>
        {
            new("Mənbə", "Nümunə məlumat (simulyasiya)"),
            new("Subyekt", profile?.DisplayName ?? job.Title),
            new("VÖEN / reyestr nömrəsi", "0000000000 (nümunə)"),
            new("Hüquqi ünvan", "Bakı şəhəri, Nümunə küçəsi 1 (nümunə)"),
            new("Vergi borcu", "Yoxdur (nümunə)"),
            new("Payın üzərində yüklülük", "Yoxdur (nümunə)")
        };
    }
}
