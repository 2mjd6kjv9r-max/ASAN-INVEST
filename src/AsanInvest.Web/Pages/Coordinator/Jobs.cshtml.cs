using AsanInvest.Web.Infrastructure;

namespace AsanInvest.Web.Pages.Coordinator;

public class JobsModel(Ctx ctx) : AppPage(ctx)
{
    public record Row(JobView V, int OpenRequests, bool Overdue, bool HasReady);
    public List<Row> Rows { get; private set; } = new();
    public bool Kanban { get; private set; }

    public void OnGet(string? mode)
    {
        Kanban = mode == "kanban";
        Rows = P.Jobs.JobsOf(Me).Where(j => !j.Closed).Select(j =>
        {
            var v = P.Jobs.Build(j.Id);
            var open = v.Stages.SelectMany(s => s.Requests).Count(r => r.Status is RequestStatus.Sent or RequestStatus.UnderReview or RequestStatus.MoreDocsRequired);
            return new Row(v, open, v.Stages.Any(s => s.Deadline?.Severity == DeadlineSeverity.Overdue),
                v.Stages.Any(s => s.Applicable && s.Run.ReadyToSend && s.Requests.Count < s.Run.InstitutionCodes.Count && s.Run.InstitutionCodes.Count > 0));
        }).ToList();
    }
}
