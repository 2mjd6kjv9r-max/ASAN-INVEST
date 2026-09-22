using System.Text;
using AsanInvest.Application;
using AsanInvest.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class Phase2Controller : ApiControllerBase
{
    private readonly Phase2Service _phase2;
    public Phase2Controller(Phase2Service phase2) => _phase2 = phase2;

    [HttpPost("company-registration/packages")]
    [Authorize]
    public async Task<IActionResult> CreatePackage([FromBody] CompanyPackageRequest? body, CancellationToken ct) =>
        CreatedData(await _phase2.CreateCompanyPackageAsync(CurrentUser, body?.LegalForm, ct));

    [HttpGet("company-registration/packages/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetPackage(Guid id, CancellationToken ct) =>
        OkData(await _phase2.GetCompanyPackageAsync(CurrentUser, id, ct));

    [HttpPost("company-registration/packages/{id:guid}/submit")]
    [Authorize]
    public async Task<IActionResult> SubmitPackage(Guid id, CancellationToken ct) =>
        OkData(await _phase2.SubmitCompanyPackageAsync(CurrentUser, id, ct));

    [HttpGet("company-registration/name-availability")]
    [Authorize]
    public async Task<IActionResult> NameAvailability([FromQuery] string? name, CancellationToken ct) =>
        OkData(await _phase2.NameAvailabilityAsync(CurrentUser, name, ct));

    [HttpGet("me/kyc-packet")]
    [Authorize]
    public async Task<IActionResult> GetKyc(CancellationToken ct) =>
        OkData(await _phase2.GetKycPacketAsync(CurrentUser, ct));

    [HttpPut("me/kyc-packet")]
    [Authorize]
    public async Task<IActionResult> PutKyc([FromBody] System.Text.Json.JsonElement packet, CancellationToken ct) =>
        OkData(await _phase2.PutKycPacketAsync(CurrentUser, packet, ct));

    [HttpPost("projects/{id:guid}/bank-submissions")]
    [Authorize]
    public async Task<IActionResult> CreateBankSubmissions(Guid id, [FromBody] BankSubmissionsRequest body, CancellationToken ct) =>
        CreatedData(await _phase2.CreateBankSubmissionsAsync(CurrentUser, id, body.BankInstitutionIds, body.Channel, ct));

    [HttpGet("projects/{id:guid}/bank-submissions")]
    [Authorize]
    public async Task<IActionResult> ListBankSubmissions(Guid id, CancellationToken ct) =>
        OkData(await _phase2.ListBankSubmissionsAsync(CurrentUser, id, ct));

    [HttpPost("tasks/{id:guid}/bank-decision")]
    [Authorize]
    [RequireRoles(UserRole.INSTITUTION_REP, UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> BankDecision(Guid id, [FromBody] BankDecisionRequest body, CancellationToken ct) =>
        OkData(await _phase2.BankDecisionAsync(CurrentUser, id, body.Outcome, body.Reason, ct));

    [HttpGet("ombudsman/page")]
    [AllowAnonymous]
    public async Task<IActionResult> OmbudsmanPage(CancellationToken ct) =>
        OkData(await _phase2.OmbudsmanPageAsync(ct));

    [HttpGet("ombudsman/desk")]
    [Authorize]
    [RequireRoles(UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> OmbudsmanDesk(CancellationToken ct) =>
        OkData(await _phase2.OmbudsmanDeskAsync(CurrentUser, ct));

    [HttpPost("cases/{id:guid}/mediation-notes")]
    [Authorize]
    [RequireRoles(UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> MediationNotes(Guid id, [FromBody] MediationNotesRequest body, CancellationToken ct) =>
        CreatedData(await _phase2.AddMediationNotesAsync(CurrentUser, id, body.Body, ct));

    [HttpPost("cases/{id:guid}/opinion")]
    [Authorize]
    [RequireRoles(UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> Opinion(Guid id, [FromBody] CaseOpinionRequest body, CancellationToken ct) =>
        OkData(await _phase2.SubmitOpinionAsync(CurrentUser, id, body.Opinion, ct));

    [HttpPost("cases/{id:guid}/opinion/approve")]
    [Authorize]
    [RequireRoles(UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> ApproveOpinion(Guid id, CancellationToken ct) =>
        OkData(await _phase2.ApproveOpinionAsync(CurrentUser, id, ct));

    [HttpGet("systemic-problems")]
    [Authorize]
    [RequireRoles(UserRole.OMBUDSMAN_OFFICER, UserRole.ANALYST, UserRole.SYSADMIN, UserRole.SUPERVISOR)]
    public async Task<IActionResult> SystemicProblems(CancellationToken ct) =>
        OkData(await _phase2.ListSystemicProblemsAsync(ct));

    [HttpPost("systemic-problems")]
    [Authorize]
    [RequireRoles(UserRole.OMBUDSMAN_OFFICER, UserRole.SYSADMIN)]
    public async Task<IActionResult> CreateSystemicProblem([FromBody] SystemicProblemCreateRequest body, CancellationToken ct) =>
        CreatedData(await _phase2.CreateSystemicProblemAsync(CurrentUser, body, ct));

    [HttpPost("systemic-problems/{id:guid}/applications")]
    [Authorize]
    [RequireRoles(UserRole.OMBUDSMAN_OFFICER, UserRole.SYSADMIN)]
    public async Task<IActionResult> LinkSystemicProblem(Guid id, [FromBody] SystemicProblemLinkRequest body, CancellationToken ct) =>
        CreatedData(await _phase2.LinkSystemicProblemAsync(CurrentUser, id, body.ApplicationId, ct));

    [HttpGet("aftercare/desk")]
    [Authorize]
    [RequireRoles(UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> AftercareDesk(CancellationToken ct) =>
        OkData(await _phase2.AftercareDeskAsync(CurrentUser, ct));

    [HttpPost("cases/{id:guid}/next-contact")]
    [Authorize]
    [RequireRoles(UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> NextContact(Guid id, [FromBody] NextContactRequest body, CancellationToken ct) =>
        OkData(await _phase2.PlanNextContactAsync(CurrentUser, id, body.At, body.Purpose, ct));

    [HttpPost("aftercare/inactivity/tick")]
    [Authorize]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> InactivityTick(CancellationToken ct) =>
        OkData(await _phase2.InactivityTickAsync(CurrentUser, ct));

    [HttpPost("projects/{id:guid}/expansion")]
    [Authorize]
    public async Task<IActionResult> Expansion(Guid id, CancellationToken ct) =>
        CreatedData(await _phase2.ExpandProjectAsync(CurrentUser, id, ct));

    [HttpGet("fees")]
    [AllowAnonymous]
    public async Task<IActionResult> Fees(CancellationToken ct) => OkData(await _phase2.ListFeesAsync(ct));

    [HttpPost("payments")]
    [Authorize]
    public async Task<IActionResult> CreatePayment([FromBody] PaymentCreateRequest body, CancellationToken ct) =>
        CreatedData(await _phase2.CreatePaymentAsync(CurrentUser, body, ct));

    [HttpPost("payments/{id:guid}/confirm")]
    [AllowAnonymous]
    [RequestSizeLimit(PaymentIntegrity.MaxRawBodyChars)]
    public async Task<IActionResult> ConfirmPayment(Guid id, CancellationToken ct)
    {
        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
        var raw = await reader.ReadToEndAsync(ct);
        Request.Body.Position = 0;
        var body = System.Text.Json.JsonSerializer.Deserialize<PaymentConfirmRequest>(raw,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true, Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() } })
            ?? throw AppException.BadRequest("VALIDATION_ERROR", "Payment confirmation body is required");
        var signature = Request.Headers["X-Payment-Signature"].FirstOrDefault();
        var staff = HttpContext.Items[CurrentUserMiddleware.ItemKey] as CurrentUser;
        return OkData(await _phase2.ConfirmPaymentAsync(staff, id, raw, signature, body, ct));
    }

    [HttpGet("me/payments")]
    [Authorize]
    public async Task<IActionResult> MyPayments(CancellationToken ct) =>
        OkData(await _phase2.MyPaymentsAsync(CurrentUser, ct));

    [HttpGet("partners")]
    [AllowAnonymous]
    public async Task<IActionResult> Partners(CancellationToken ct) => OkData(await _phase2.ListPartnersAsync(ct));

    [HttpPost("projects/{id:guid}/stages/{stageId:guid}/partner")]
    [Authorize]
    public async Task<IActionResult> BindPartner(Guid id, Guid stageId, [FromBody] PartnerBindRequest body, CancellationToken ct) =>
        CreatedData(await _phase2.BindPartnerAsync(CurrentUser, id, stageId, body.PartnerId, ct));

    [HttpGet("admin/partners")]
    [Authorize]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> AdminPartners(CancellationToken ct) =>
        OkData(await _phase2.AdminListPartnersAsync(ct));

    [HttpPost("admin/partners")]
    [Authorize]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> AdminCreatePartner([FromBody] PartnerCreateRequest body, CancellationToken ct) =>
        CreatedData(await _phase2.AdminCreatePartnerAsync(CurrentUser, body, ct));

    [HttpGet("admin/fees")]
    [Authorize]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> AdminFees(CancellationToken ct) =>
        OkData(await _phase2.AdminListFeesAsync(ct));

    [HttpPost("admin/fees")]
    [Authorize]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> AdminCreateFee([FromBody] FeeCreateRequest body, CancellationToken ct) =>
        CreatedData(await _phase2.AdminCreateFeeAsync(CurrentUser, body, ct));

    [HttpGet("public/transparency")]
    [AllowAnonymous]
    public async Task<IActionResult> Transparency(CancellationToken ct) =>
        OkData(await _phase2.PublicTransparencyAsync(ct));

    [HttpPost("admin/analytics/publish-public")]
    [Authorize]
    [RequireRoles(UserRole.ANALYST, UserRole.SYSADMIN)]
    public async Task<IActionResult> PublishPublic(CancellationToken ct) =>
        OkData(await _phase2.PublishPublicKpisAsync(CurrentUser, ct));
}
