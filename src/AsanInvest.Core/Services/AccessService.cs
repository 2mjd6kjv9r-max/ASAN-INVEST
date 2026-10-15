using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Services;

/// <summary>Resurs səviyyəsində icazələr (TZ 2.1 matrisi və 14: qurum əməkdaşı yalnız öz sorğusuna əlavə olunmuş sənədi görür).</summary>
public sealed class AccessService(IDataStore store, IClock clock)
{
    public Representation? ActiveRepresentation(User user, Job job) =>
        user.Role != Role.Representative ? null :
        store.Representations.All().FirstOrDefault(r => r.RepresentativeUserId == user.Id && r.InvestorUserId == job.InvestorUserId);

    public bool CanView(User user, Job job) => user.Role switch
    {
        Role.Investor => job.InvestorUserId == user.Id,
        Role.Representative => ActiveRepresentation(user, job) is not null,
        Role.Coordinator => job.CoordinatorId == user.Id,
        Role.Admin => true,
        _ => false
    };

    /// <summary>Redaktə: investor, qüvvədə olan nümayəndə, təyin olunmuş koordinator. Etibarnamənin müddəti bitibsə nümayəndə yalnız baxa bilər.</summary>
    public bool CanEdit(User user, Job job)
    {
        if (job.Closed) return false;
        return user.Role switch
        {
            Role.Investor => job.InvestorUserId == user.Id,
            Role.Representative => ActiveRepresentation(user, job) is { } r && r.ValidUntil.Date >= clock.Today,
            Role.Coordinator => job.CoordinatorId == user.Id,
            _ => false
        };
    }

    /// <summary>Hərəkət nümayəndə tərəfindən edilirsə «kimin adından» investor id-si.</summary>
    public Guid? OnBehalfOf(User user, Job job) =>
        user.Role == Role.Representative ? job.InvestorUserId : null;

    public bool CanViewRequest(User user, InstitutionRequest req, Job job) => user.Role switch
    {
        Role.InstitutionOfficer => !string.IsNullOrEmpty(user.InstitutionCode)
                                   && req.InstitutionCode.Equals(user.InstitutionCode, StringComparison.OrdinalIgnoreCase),
        _ => CanView(user, job)
    };

    public bool CanViewDocument(User user, Document doc)
    {
        var job = store.Jobs.Find(doc.JobId);
        if (job is null) return false;
        if (user.Role == Role.InstitutionOfficer)
        {
            if (string.IsNullOrEmpty(user.InstitutionCode)) return false;
            return store.Requests.All().Any(r =>
                r.JobId == doc.JobId
                && r.InstitutionCode.Equals(user.InstitutionCode, StringComparison.OrdinalIgnoreCase)
                && (r.DocumentIds.Contains(doc.Id) || r.ResultDocumentId == doc.Id));
        }
        return CanView(user, job);
    }
}
