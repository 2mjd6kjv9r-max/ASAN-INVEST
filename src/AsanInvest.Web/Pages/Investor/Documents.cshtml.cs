using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Investor;

public class DocumentsModel(Ctx ctx) : AppPage(ctx)
{
    public Job? Job { get; private set; }
    public IReadOnlyList<Document> Docs { get; private set; } = new List<Document>();
    public bool CanEdit { get; private set; }

    public IActionResult OnGet()
    {
        if (C.CurrentJob is not { } job) return RedirectToPage("Onboarding");
        Job = job;
        Docs = P.Documents.ForJob(job.Id).OrderByDescending(d => d.UploadedAt).ToList();
        CanEdit = P.Access.CanEdit(Me, job);
        return Page();
    }

    public async Task<IActionResult> OnPostUploadAsync(IFormFile? file, string type, string? country, DateTime? validUntil)
    {
        var job = C.CurrentJob;
        if (job is null || file is null || file.Length == 0) { TempData["err"] = "Fayl seçilməyib."; return RedirectToPage(); }
        try
        {
            var ms = new MemoryStream();
            await using (var s = file.OpenReadStream()) await s.CopyToAsync(ms);
            ms.Position = 0;
            P.Documents.Upload(Me, job.Id, ms, file.FileName, type, country, null, validUntil);
            TempData["ok"] = "Sənəd yükləndi.";
        }
        catch (ServiceException e) { TempData["err"] = e.Message; }
        return RedirectToPage();
    }
}
