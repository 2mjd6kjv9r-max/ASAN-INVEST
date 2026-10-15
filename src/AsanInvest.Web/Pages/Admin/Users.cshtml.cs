using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Admin;

public class UsersModel(Ctx ctx) : AppPage(ctx)
{
    public List<User> Items { get; private set; } = new();
    public void OnGet() => Items = P.Store.Users.All().OrderBy(u => u.Role).ThenBy(u => u.Name).ToList();

    public IActionResult OnPostBlock(Guid id, bool block)
    {
        var u = P.Store.Users.Find(id);
        if (u is null) return RedirectToPage();
        if (u.Id == Me.Id) { TempData["err"] = "Özünüzü blok edə bilməzsiniz."; return RedirectToPage(); }
        u.Blocked = block; P.Store.Users.Upsert(u);
        P.Audit.Record(Me, block ? "user.block" : "user.unblock", "User", u.Id.ToString(), null, u.Email);
        TempData["ok"] = block ? "İstifadəçi bloklandı (sessiyası dərhal bitir)." : "Blok götürüldü.";
        return RedirectToPage();
    }

    public IActionResult OnPostRole(Guid id, Role role, string? institution)
    {
        var u = P.Store.Users.Find(id);
        if (u is null) return RedirectToPage();
        if (u.Id == Me.Id) { TempData["err"] = "Öz rolunuzu dəyişə bilməzsiniz."; return RedirectToPage(); }
        if (role == Role.InstitutionOfficer && P.Catalog.Inst(institution ?? "") is null) { TempData["err"] = "Qurum əməkdaşı üçün qurum kodu seçilməlidir."; return RedirectToPage(); }
        u.Role = role; u.InstitutionCode = role == Role.InstitutionOfficer ? institution : null;
        P.Store.Users.Upsert(u);
        P.Audit.Record(Me, "user.role", "User", u.Id.ToString(), null, $"{u.Email} → {role}");
        TempData["ok"] = "Rol dəyişdirildi.";
        return RedirectToPage();
    }

    public IActionResult OnPostInvite(string name, string email, Role role, string? institution)
    {
        name = (name ?? "").Trim(); email = (email ?? "").Trim();
        if (name.Length is 0 or > 120 || !email.Contains('@') || email.Length > 200) { TempData["err"] = "Ad və düzgün e-poçt tələb olunur."; return RedirectToPage(); }
        if (P.Store.Users.All().Any(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase))) { TempData["err"] = "Bu e-poçt artıq mövcuddur."; return RedirectToPage(); }
        if (role == Role.InstitutionOfficer && P.Catalog.Inst(institution ?? "") is null) { TempData["err"] = "Qurum kodu seçilməlidir."; return RedirectToPage(); }
        var user = new User { Name = name, Email = email, Role = role, InstitutionCode = role == Role.InstitutionOfficer ? institution : null };
        P.Store.Users.Upsert(user);
        P.Audit.Record(Me, "user.invite", "User", user.Id.ToString(), null, $"{email} ({role})");
        TempData["ok"] = "İstifadəçi yaradıldı. Real girişdə dəvət ASAN Login ilə bağlanacaq.";
        return RedirectToPage();
    }
}
