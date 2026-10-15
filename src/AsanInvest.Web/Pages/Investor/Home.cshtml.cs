using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Investor;

public class HomeModel(Ctx ctx) : AppPage(ctx)
{
    public JobView? View { get; private set; }
    public List<Job> Jobs { get; private set; } = new();
    public List<InstitutionRequest> Recent { get; private set; } = new();

    public IActionResult OnGet()
    {
        if (C.CurrentJob is not { } job) return RedirectToPage("Onboarding");
        Jobs = P.Jobs.JobsOf(Me).Where(j => !j.Closed).ToList();
        View = P.Jobs.Build(job.Id);
        Recent = P.Store.Requests.All().Where(r => r.JobId == job.Id && r.Status != RequestStatus.Draft)
            .OrderByDescending(r => r.UpdatedAt).Take(5).ToList();
        return Page();
    }

    public IActionResult OnPostSwitch(Guid jobId)
    {
        var job = P.Jobs.JobsOf(Me).FirstOrDefault(j => j.Id == jobId && !j.Closed);
        if (job is not null)
            Response.Cookies.Append(Ctx.JobCookie, job.Id.ToString(), new CookieOptions { HttpOnly = true, SameSite = SameSiteMode.Lax });
        return RedirectToPage();
    }
}
