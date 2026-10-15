using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Investor;

public class RoadmapModel(Ctx ctx) : AppPage(ctx)
{
    public JobView? View { get; private set; }
    public string ViewMode { get; private set; } = "stages";
    public string? Kind { get; private set; }
    public string? Status { get; private set; }
    public string? Inst { get; private set; }
    public List<StageView> Stages { get; private set; } = new();

    public IActionResult OnGet(string? mode, string? kind, string? status, string? inst)
    {
        if (C.CurrentJob is not { } job) return RedirectToPage("Onboarding");
        View = P.Jobs.Build(job.Id);
        ViewMode = mode == "inst" ? "inst" : "stages";
        Kind = kind; Status = status; Inst = inst;
        IEnumerable<StageView> q = View.Stages;
        if (Enum.TryParse<StageKind>(kind, out var k)) q = q.Where(s => s.Template.Kind == k);
        if (Enum.TryParse<StageStatus>(status, out var st)) q = q.Where(s => s.Status == st);
        if (!string.IsNullOrEmpty(inst)) q = q.Where(s => s.Run.InstitutionCodes.Contains(inst, StringComparer.OrdinalIgnoreCase));
        Stages = q.ToList();
        return Page();
    }
}
