using AsanInvest.Web.Infrastructure;

namespace AsanInvest.Web.Pages.Admin;

public class IndexModel(Ctx ctx) : AppPage(ctx)
{
    public int Jobs, ActiveJobs, Users, OpenRequests, LateRequests, OverdueDeadlines;
    public Dictionary<string, int> ByScenario { get; private set; } = new();
    public Dictionary<string, (int Total, int Late)> ByInst { get; private set; } = new();

    public void OnGet()
    {
        var jobs = P.Store.Jobs.All();
        Jobs = jobs.Count; ActiveJobs = jobs.Count(j => !j.Closed);
        Users = P.Store.Users.All().Count;
        var reqs = P.Store.Requests.All().Where(r => r.Status != RequestStatus.Draft).ToList();
        OpenRequests = reqs.Count(r => r.Status is RequestStatus.Sent or RequestStatus.UnderReview or RequestStatus.MoreDocsRequired);
        LateRequests = reqs.Count(P.Requests.IsLate);
        ByScenario = jobs.Where(j => !j.Closed).GroupBy(j => j.ScenarioCode).OrderBy(g => g.Key).ToDictionary(g => g.Key, g => g.Count());
        ByInst = reqs.GroupBy(r => r.InstitutionCode).ToDictionary(g => g.Key, g => (g.Count(), g.Count(P.Requests.IsLate)));
        OverdueDeadlines = jobs.Where(j => !j.Closed).Count(j => P.Jobs.Build(j.Id).Stages.Any(s => s.Deadline?.Severity == DeadlineSeverity.Overdue));
    }
}
