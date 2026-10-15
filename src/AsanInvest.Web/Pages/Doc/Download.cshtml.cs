using AsanInvest.Core.Services;
using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Doc;

public class DownloadModel(Ctx ctx) : AppPage(ctx)
{
    public IActionResult OnGet(Guid id)
    {
        try
        {
            var (doc, stream) = P.Documents.Open(Me, id);
            P.Audit.Record(Me, "document.download", "Document", doc.Id.ToString(), doc.JobId, doc.FileName);
            Response.Headers["X-Content-Type-Options"] = "nosniff";
            // Həmişə «attachment»: brauzer faylı özü icra/render etməsin.
            return File(stream, doc.ContentType, DocumentService.SanitizeName(doc.FileName));
        }
        catch (ServiceException) { return NotFound(); }
    }
}
