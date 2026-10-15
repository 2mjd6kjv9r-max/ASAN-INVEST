using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Investor;

public class InstitutionsModel(Ctx ctx) : AppPage(ctx)
{
    public JobView? View { get; private set; }
    public IActionResult OnGet()
    {
        if (C.CurrentJob is not { } job) return RedirectToPage("Onboarding");
        View = P.Jobs.Build(job.Id);
        return Page();
    }
}
