using AsanInvest.Web.Infrastructure;

namespace AsanInvest.Web.Pages.Coordinator;

public class RequestsModel(Ctx ctx) : AppPage(ctx)
{
    public List<(InstitutionRequest R, Job J)> Items { get; private set; } = new();
    public string? Status { get; private set; }

    public void OnGet(string? status)
    {
        Status = status;
        var jobs = P.Jobs.JobsOf(Me).ToDictionary(j => j.Id);
        var q = P.Store.Requests.All().Where(r => jobs.ContainsKey(r.JobId) && r.Status != RequestStatus.Draft);
        if (Enum.TryParse<RequestStatus>(status, out var st)) q = q.Where(r => r.Status == st);
        Items = q.OrderByDescending(r => r.UpdatedAt).Select(r => (r, jobs[r.JobId])).ToList();
    }
}
