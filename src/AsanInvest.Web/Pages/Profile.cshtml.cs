using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages;

public class ProfileModel(Ctx ctx) : AppPage(ctx)
{
    public InvestorProfile? Profile { get; private set; }
    public List<(Representation Rep, User? User)> Reps { get; private set; } = new();
    public List<(Representation Rep, User? Investor)> Acting { get; private set; } = new();

    public void OnGet()
    {
        Profile = P.Store.Profiles.All().FirstOrDefault(p => p.UserId == Me.Id);
        if (Me.Role == Role.Investor)
            Reps = P.Store.Representations.All().Where(r => r.InvestorUserId == Me.Id)
                .Select(r => (r, P.Store.Users.Find(r.RepresentativeUserId))).ToList();
        if (Me.Role == Role.Representative)
            Acting = P.Store.Representations.All().Where(r => r.RepresentativeUserId == Me.Id)
                .Select(r => (r, P.Store.Users.Find(r.InvestorUserId))).ToList();
    }

    private static string Clip(string? s, int n) => (s ?? "").Trim() is var t && t.Length > n ? t[..n] : (s ?? "").Trim();

    public IActionResult OnPostSave(string? contact, string? authorized, string? beneficial, EsignStatus esign)
    {
        if (Me.Role != Role.Investor) return RedirectToPage();
        var p = P.Store.Profiles.All().FirstOrDefault(x => x.UserId == Me.Id)
                ?? new InvestorProfile { UserId = Me.Id, DisplayName = Me.Name };
        p.Contact = Clip(contact, 200); p.AuthorizedPerson = Clip(authorized, 200); p.BeneficialOwner = Clip(beneficial, 200); p.Esign = esign;
        P.Store.Profiles.Upsert(p);
        P.Audit.Record(Me, "profile.update", "Profile", p.Id.ToString());
        TempData["ok"] = "Profil saxlanıldı.";
        return RedirectToPage();
    }

    public IActionResult OnPostAddRep(string email, string? basis, DateTime validUntil)
    {
        if (Me.Role != Role.Investor) return RedirectToPage();
        var rep = P.Store.Users.All().FirstOrDefault(u => u.Role == Role.Representative && !u.Blocked
                                                        && u.Email.Equals((email ?? "").Trim(), StringComparison.OrdinalIgnoreCase));
        if (rep is null) TempData["err"] = "Bu e-poçtla nümayəndə tapılmadı.";
        else if (validUntil.Date < P.Clock.Today) TempData["err"] = "Etibarlılıq tarixi keçmişdə ola bilməz.";
        else
        {
            P.Store.Representations.Upsert(new Representation
                { InvestorUserId = Me.Id, RepresentativeUserId = rep.Id, Basis = Clip(basis, 100) is { Length: > 0 } b ? b : "e-Təmsilçi", ValidUntil = validUntil.Date });
            P.Audit.Record(Me, "representation.add", "Representation", rep.Id.ToString(), null, rep.Name);
            P.Notifications.Notify(rep.Id, $"rep-add:{Me.Id}:{P.Clock.UtcNow.Ticks}", $"{Me.Name} sizi nümayəndə təyin etdi.", "/Investor/Home");
            TempData["ok"] = "Nümayəndə əlavə edildi.";
        }
        return RedirectToPage();
    }

    public IActionResult OnPostRemoveRep(Guid id)
    {
        var r = P.Store.Representations.Find(id);
        if (Me.Role == Role.Investor && r is not null && r.InvestorUserId == Me.Id)
        {
            P.Store.Representations.Delete(id);
            P.Audit.Record(Me, "representation.remove", "Representation", id.ToString());
            TempData["ok"] = "Təmsilçilik ləğv edildi.";
        }
        return RedirectToPage();
    }
}
