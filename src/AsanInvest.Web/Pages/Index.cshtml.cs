using AsanInvest.Core.Domain;
using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages;

public class IndexModel(Ctx ctx) : AppPage(ctx)
{
    public IActionResult OnGet() => Me.Role switch
    {
        Role.Investor or Role.Representative => C.CurrentJob is null ? RedirectToPage("/Investor/Onboarding") : RedirectToPage("/Investor/Home"),
        Role.Coordinator => RedirectToPage("/Coordinator/Jobs"),
        Role.InstitutionOfficer => RedirectToPage("/Officer/Inbox"),
        Role.Admin => RedirectToPage("/Admin/Index"),
        _ => RedirectToPage("/Login")
    };
}
