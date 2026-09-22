using AsanInvest.Application;
using AsanInvest.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Api.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public sealed class CasesController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public CasesController(PlatformService platform) => _platform = platform;

    [HttpGet("cases")]
    [RequireRoles(UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.SYSADMIN, UserRole.INSTITUTION_REP)]
    public async Task<IActionResult> List([FromQuery] string? status, CancellationToken ct) =>
        OkData(await _platform.CasesAsync(CurrentUser, status, ct));

    [HttpGet("cases/{id:guid}")]
    [RequireRoles(UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.SYSADMIN, UserRole.INSTITUTION_REP, UserRole.EVALUATOR)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        OkData(await _platform.GetCaseAsync(id, CurrentUser, ct));

    [HttpPost("cases/{id:guid}/transition")]
    [RequireRoles(UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> Transition(Guid id, [FromBody] CaseTransitionRequest body, CancellationToken ct) =>
        OkData(await _platform.TransitionCaseAsync(CurrentUser, id, body.To, body.Reason, ct));

    [HttpPost("cases/{id:guid}/assign")]
    [RequireRoles(UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> Assign(Guid id, [FromBody] CaseAssignRequest body, CancellationToken ct) =>
        OkData(await _platform.AssignCaseAsync(id, body.CaseManagerId, ct));

    [HttpPost("cases/{id:guid}/extra-info")]
    [RequireRoles(UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.INSTITUTION_REP, UserRole.EVALUATOR)]
    public async Task<IActionResult> ExtraInfo(Guid id, [FromBody] ExtraInfoRequest body, CancellationToken ct) =>
        CreatedData(await _platform.ExtraInfoAsync(CurrentUser, id, body.Fields, body.DueAt, ct));

    [HttpPost("cases/{id:guid}/extra-info/{requestId:guid}/respond")]
    public async Task<IActionResult> ExtraInfoRespond(Guid id, Guid requestId, [FromBody] ExtraInfoRespondRequest body, CancellationToken ct) =>
        OkData(await _platform.ExtraInfoRespondAsync(CurrentUser, id, requestId, body.Response, ct));

    [HttpPost("cases/{id:guid}/close")]
    [RequireRoles(UserRole.CASE_MANAGER, UserRole.SUPERVISOR)]
    public async Task<IActionResult> Close(Guid id, [FromBody] CaseCloseRequest body, CancellationToken ct) =>
        OkData(await _platform.CloseCaseAsync(CurrentUser, id, body.Decision, body.Reasoning, ct));

    [HttpPost("cases/{id:guid}/reopen")]
    [RequireRoles(UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> Reopen(Guid id, [FromBody] CaseReopenRequest body, CancellationToken ct) =>
        OkData(await _platform.ReopenCaseAsync(CurrentUser, id, body.Reason, ct));

    [HttpPost("cases/{id:guid}/extend")]
    [RequireRoles(UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> Extend(Guid id, [FromBody] CaseExtendRequest body, CancellationToken ct) =>
        OkData(await _platform.ExtendCaseAsync(id, body.SlaDueAt, body.Reason, ct));

    [HttpPost("cases/sla/tick")]
    [RequireRoles(UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> SlaTick(CancellationToken ct) => OkData(await _platform.SlaTickAsync(ct));

    [HttpPost("cases/{id:guid}/complaint")]
    public async Task<IActionResult> Complaint(Guid id, [FromBody] ComplaintRequest body, CancellationToken ct) =>
        CreatedData(await _platform.ComplaintAsync(CurrentUser, id, body.Description, ct));

    [HttpPost("cases/{id:guid}/tasks")]
    [RequireRoles(UserRole.CASE_MANAGER, UserRole.SUPERVISOR)]
    public async Task<IActionResult> CreateTask(Guid id, [FromBody] CreateTaskRequest body, CancellationToken ct) =>
        CreatedData(await _platform.CreateTaskAsync(id, body.InstitutionId, body.DueAt, body.AssigneeUserId, body.Notes, ct));

    [HttpPost("tasks/{id:guid}/complete")]
    [RequireRoles(UserRole.INSTITUTION_REP, UserRole.CASE_MANAGER, UserRole.SUPERVISOR)]
    public async Task<IActionResult> CompleteTask(Guid id, [FromBody] CompleteTaskRequest body, CancellationToken ct) =>
        OkData(await _platform.CompleteTaskAsync(CurrentUser, id, body.Opinion, ct));
}

[ApiController]
[Route("api/v1")]
[Authorize]
public sealed class EvaluationsController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public EvaluationsController(PlatformService platform) => _platform = platform;

    [HttpGet("evaluations")]
    [RequireRoles(UserRole.EVALUATOR, UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> List(CancellationToken ct) => OkData(await _platform.EvaluationsAsync(CurrentUser, ct));

    [HttpPost("evaluations/{id:guid}/opinion")]
    [RequireRoles(UserRole.EVALUATOR, UserRole.SUPERVISOR)]
    public async Task<IActionResult> Opinion(Guid id, [FromBody] EvaluationOpinionRequest body, CancellationToken ct) =>
        OkData(await _platform.EvaluationOpinionAsync(CurrentUser, id, body.Opinion, body.ContinueCase, ct));

    [HttpPost("compliance/screen/{userId:guid}")]
    [RequireRoles(UserRole.EVALUATOR, UserRole.SUPERVISOR, UserRole.SYSADMIN)]
    public async Task<IActionResult> Screen(Guid userId, CancellationToken ct) => OkData(await _platform.ScreenAsync(userId, ct));
}

[ApiController]
[Route("api/v1")]
[Authorize]
public sealed class DocumentsController : ApiControllerBase
{
    private readonly PlatformService _platform;
    private readonly AppSettings _settings;
    public DocumentsController(PlatformService platform, Microsoft.Extensions.Options.IOptions<AppSettings> settings)
    {
        _platform = platform;
        _settings = settings.Value;
    }

    [HttpGet("documents")]
    public async Task<IActionResult> List(CancellationToken ct) => OkData(await _platform.DocumentsAsync(CurrentUser, ct));

    [HttpPost("documents")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Upload(IFormFile? file, [FromForm] string? typeCode, CancellationToken ct)
    {
        if (file is null) throw AppException.BadRequest("FILE_REQUIRED", "A file is required");
        var allowed = new[] { "application/pdf", "image/jpeg", "image/png" };
        if (!allowed.Contains(file.ContentType)) throw AppException.BadRequest("FILE_TYPE", "Upload PDF, JPEG or PNG files only");
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not ".pdf" and not ".jpg" and not ".jpeg" and not ".png")
            throw AppException.BadRequest("FILE_TYPE", "Upload PDF, JPEG or PNG files only");
        if (file.Length > _settings.MaxUploadBytes) throw AppException.BadRequest("FILE_TOO_LARGE", "File exceeds the upload limit");
        Directory.CreateDirectory(_settings.UploadDir);
        var mappedExt = ext is ".jpeg" ? ".jpg" : ext;
        var name = $"{Guid.NewGuid()}{mappedExt}";
        var path = Path.Combine(_settings.UploadDir, name);
        await using (var stream = System.IO.File.Create(path))
            await file.CopyToAsync(stream, ct);
        return CreatedData(await _platform.UploadDocumentAsync(CurrentUser, typeCode ?? "identity-document", name, file.FileName, file.ContentType, ct));
    }

    [HttpGet("applications/{id:guid}/messages")]
    public async Task<IActionResult> Messages(Guid id, CancellationToken ct) =>
        OkData(await _platform.MessagesAsync(CurrentUser, id, ct));

    [HttpPost("applications/{id:guid}/messages")]
    public async Task<IActionResult> PostMessage(Guid id, [FromBody] MessageCreateRequest body, CancellationToken ct) =>
        CreatedData(await _platform.PostMessageAsync(CurrentUser, id, body.Body, body.Internal, ct));
}

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public sealed class NotificationsController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public NotificationsController(PlatformService platform) => _platform = platform;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => OkData(await _platform.NotificationsAsync(CurrentUser, ct));

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> Read(Guid id, CancellationToken ct) =>
        OkData(await _platform.ReadNotificationAsync(CurrentUser, id, ct));
}

[ApiController]
[Route("api/v1/admin")]
[Authorize]
public sealed class AdminController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public AdminController(PlatformService platform) => _platform = platform;

    [HttpGet("users")]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> Users(CancellationToken ct) => OkData(await _platform.AdminUsersAsync(ct));

    [HttpPost("users")]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> CreateUser([FromBody] AdminUserCreateRequest body, CancellationToken ct) =>
        CreatedData(await _platform.AdminCreateUserAsync(CurrentUser, body.Email, body.Password, body.Roles, body.InstitutionId, ct));

    [HttpPatch("users/{id:guid}/status")]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> Status(Guid id, [FromBody] AdminStatusRequest body, CancellationToken ct) =>
        OkData(await _platform.AdminStatusAsync(id, body.Status, ct));

    [HttpGet("classifications")]
    [RequireRoles(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER)]
    public async Task<IActionResult> Classifications([FromQuery] string? kind, CancellationToken ct) =>
        OkData(await _platform.AdminClassificationsAsync(kind, ct));

    [HttpPost("classifications")]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> CreateClassification([FromBody] ClassificationCreateRequest body, CancellationToken ct) =>
        CreatedData(await _platform.AdminCreateClassificationAsync(body.Kind, body.Code, body.Names, body.ParentId, body.SortOrder, ct));

    [HttpGet("application-types")]
    [RequireRoles(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER)]
    public async Task<IActionResult> ApplicationTypes(CancellationToken ct) =>
        OkData(await _platform.AdminApplicationTypesAsync(ct));

    [HttpPost("application-types")]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> CreateApplicationType([FromBody] ApplicationTypeCreateRequest body, CancellationToken ct) =>
        CreatedData(await _platform.AdminCreateApplicationTypeAsync(body.Code, body.Names, body.IdentificationLevel, body.RequiresEvaluation, body.FormSchema, ct));

    [HttpGet("procedures")]
    [RequireRoles(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER)]
    public async Task<IActionResult> Procedures(CancellationToken ct) =>
        OkData(await _platform.AdminProceduresAsync(ct));

    [HttpPost("procedures")]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> CreateProcedure([FromBody] ProcedureCreateRequest body, CancellationToken ct) =>
        CreatedData(await _platform.AdminCreateProcedureAsync(body.Code, body.Names, body.InstitutionId, body.Flag, body.ExpectedDurationDays, body.LegalBasis, body.EServiceUrl, ct));

    [HttpGet("rule-sets")]
    [RequireRoles(UserRole.SYSADMIN, UserRole.ANALYST)]
    public async Task<IActionResult> RuleSets(CancellationToken ct) => OkData(await _platform.RuleSetsAsync(ct));

    [HttpPost("rule-sets")]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> CreateRuleSet([FromBody] RuleSetCreateRequest body, CancellationToken ct) =>
        CreatedData(await _platform.CreateRuleSetAsync(CurrentUser, body.Kind, body.Version, body.EffectiveAt, body.Body, ct));

    [HttpGet("cms")]
    [RequireRoles(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER)]
    public async Task<IActionResult> Cms(CancellationToken ct) => OkData(await _platform.CmsAsync(ct));

    [HttpPost("cms")]
    [RequireRoles(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER)]
    public async Task<IActionResult> CreateCms([FromBody] CmsCreateRequest body, CancellationToken ct) =>
        CreatedData(await _platform.CreateCmsAsync(CurrentUser, body.PageKey, body.Slug, body.Title, body.Body, ct));

    [HttpPost("cms/{id:guid}/transition")]
    [RequireRoles(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER)]
    public async Task<IActionResult> CmsTransition(Guid id, [FromBody] CmsTransitionRequest body, CancellationToken ct) =>
        OkData(await _platform.CmsTransitionAsync(CurrentUser, id, body.To, ct));

    [HttpGet("notification-templates")]
    [RequireRoles(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER)]
    public async Task<IActionResult> Templates(CancellationToken ct) =>
        OkData(await _platform.AdminNotificationTemplatesAsync(ct));

    [HttpPost("notification-templates")]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> CreateTemplate([FromBody] NotificationTemplateCreateRequest body, CancellationToken ct) =>
        CreatedData(await _platform.AdminCreateNotificationTemplateAsync(body.EventType, body.Role, body.Locale, body.Channel, body.Subject, body.Body, body.IsMandatory, ct));

    [HttpGet("audit")]
    [RequireRoles(UserRole.SYSADMIN, UserRole.SUPERVISOR, UserRole.ANALYST)]
    public async Task<IActionResult> Audit([FromQuery] string? objectType, CancellationToken ct) =>
        OkData(await _platform.AuditAsync(objectType, ct));

    [HttpGet("settings")]
    [RequireRoles(UserRole.SYSADMIN)]
    public IActionResult Settings() => OkData(_platform.Settings());
}

[ApiController]
[Route("api/v1/analytics")]
[Authorize]
public sealed class AnalyticsController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public AnalyticsController(PlatformService platform) => _platform = platform;

    [HttpGet("overview")]
    [RequireRoles(UserRole.ANALYST, UserRole.SYSADMIN, UserRole.SUPERVISOR)]
    public async Task<IActionResult> Overview(CancellationToken ct) => OkData(await _platform.AnalyticsOverviewAsync(ct));

    [HttpGet("sla")]
    [RequireRoles(UserRole.ANALYST, UserRole.SYSADMIN, UserRole.SUPERVISOR)]
    public async Task<IActionResult> Sla(CancellationToken ct) => OkData(await _platform.AnalyticsSlaAsync(ct));

    [HttpGet("kya")]
    [RequireRoles(UserRole.ANALYST, UserRole.SYSADMIN, UserRole.SUPERVISOR)]
    public async Task<IActionResult> Kya(CancellationToken ct) => OkData(await _platform.AnalyticsKyaAsync(ct));
}
