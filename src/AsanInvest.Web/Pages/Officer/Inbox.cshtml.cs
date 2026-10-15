using AsanInvest.Web.Infrastructure;

namespace AsanInvest.Web.Pages.Officer;

public class InboxModel(Ctx ctx) : AppPage(ctx)
{
    public string Tab { get; private set; } = "new";
    public List<InstitutionRequest> Items { get; private set; } = new();
    public Dictionary<string, int> Counts { get; private set; } = new();
    public double AvgDays { get; private set; }

    public void OnGet(string? tab)
    {
        var all = P.Requests.InboxFor(Me);
        bool In(InstitutionRequest r, string t) => t switch
        {
            "review" => r.Status == RequestStatus.UnderReview,
            "more" => r.Status == RequestStatus.MoreDocsRequired,
            "done" => r.Status is RequestStatus.Approved or RequestStatus.Rejected,
            _ => r.Status == RequestStatus.Sent
        };
        Tab = tab is "review" or "more" or "done" ? tab : "new";
        Counts = new[] { "new", "review", "more", "done" }.ToDictionary(t => t, t => all.Count(r => In(r, t)));
        Items = all.Where(r => In(r, Tab)).ToList();
        var done = all.Where(r => r.Status is RequestStatus.Approved or RequestStatus.Rejected && r.SentAt.HasValue).ToList();
        AvgDays = done.Count == 0 ? 0 : Math.Round(done.Average(r => (r.UpdatedAt - r.SentAt!.Value).TotalDays), 1);
    }
}
