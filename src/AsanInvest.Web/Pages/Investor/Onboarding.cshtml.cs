using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Investor;

public class OnboardingModel(Ctx ctx) : AppPage(ctx)
{
    [BindProperty] public InvestorKind Kind { get; set; } = InvestorKind.Legal;
    [BindProperty] public Residency Res { get; set; } = Residency.Resident;
    [BindProperty] public ProjectKind Project { get; set; } = ProjectKind.New;
    [BindProperty] public EntryPath Path { get; set; } = EntryPath.Share;
    [BindProperty] public string? Construction { get; set; }
    [BindProperty] public string? ForeignWorker { get; set; }
    [BindProperty] public string? Incentive { get; set; }
    [BindProperty] public string? Land { get; set; }
    [BindProperty] public string? Permit { get; set; }
    [BindProperty] public string? Esign { get; set; }
    [BindProperty] public Guid? InvestorId { get; set; }

    public bool Change { get; private set; }
    public Job? Created { get; private set; }
    public IReadOnlyList<Recommendation> Recs { get; private set; } = new List<Recommendation>();
    public List<User> Principals { get; private set; } = new();

    private void LoadPrincipals()
    {
        if (Me.Role != Role.Representative) return;
        Principals = P.Store.Representations.All()
            .Where(r => r.RepresentativeUserId == Me.Id && r.ValidUntil.Date >= P.Clock.Today)
            .Select(r => P.Store.Users.Find(r.InvestorUserId)).Where(u => u is not null).Select(u => u!).ToList();
    }

    public void OnGet(Guid? done, bool change)
    {
        LoadPrincipals();
        if (done is { } id && P.Store.Jobs.Find(id) is { } j && P.Access.CanView(Me, j))
        {
            Created = j;
            Recs = Recommendations.For(j.Answers);
            return;
        }
        if (change && C.CurrentJob is { } cur)
        {
            Change = true;
            var a = cur.Answers;
            Kind = a.Kind; Res = a.Residency; Project = a.Project; Path = a.Path == EntryPath.None ? EntryPath.Share : a.Path;
            Construction = Tri(a.Construction); ForeignWorker = Tri(a.ForeignWorker); Incentive = Tri(a.IncentiveDoc);
            Land = Tri(a.Land); Permit = Tri(a.HasResidencePermit); Esign = Tri(a.HasEsign);
        }
    }

    private static string? Tri(bool? b) => b is null ? "" : b.Value ? "yes" : "no";
    private static bool? Tri(string? s) => s switch { "yes" => true, "no" => false, _ => null };

    private JobAnswers Answers() => new()
    {
        Kind = Kind, Residency = Res, Project = Project, Path = Project == ProjectKind.New ? EntryPath.None : Path,
        Construction = Tri(Construction), ForeignWorker = Tri(ForeignWorker), IncentiveDoc = Tri(Incentive),
        Land = Tri(Land), HasResidencePermit = Tri(Permit), HasEsign = Tri(Esign)
    };

    public IActionResult OnPostCreate()
    {
        LoadPrincipals();
        var investorId = Me.Role == Role.Representative ? InvestorId ?? Guid.Empty : Me.Id;
        Job? job = null;
        if (!Do(() => job = P.Jobs.CreateJob(Me, investorId, Answers()))) return RedirectToPage();
        Response.Cookies.Append(Ctx.JobCookie, job!.Id.ToString(), new CookieOptions { HttpOnly = true, SameSite = SameSiteMode.Lax });
        return RedirectToPage(new { done = job.Id });
    }

    public IActionResult OnPostChange()
    {
        var cur = C.CurrentJob;
        if (cur is null) return RedirectToPage();
        Job? job = null;
        if (!Do(() => job = P.Jobs.ChangeScenario(Me, cur.Id, Answers()), "Ssenari dəyişdirildi; yeni yol xəritəsi yaradıldı. Göndərilmiş sorğular köhnə işdə qalır."))
            return RedirectToPage(new { change = true });
        Response.Cookies.Append(Ctx.JobCookie, job!.Id.ToString(), new CookieOptions { HttpOnly = true, SameSite = SameSiteMode.Lax });
        return RedirectToPage(new { done = job.Id });
    }
}
