using AsanInvest.Application;
using AsanInvest.Domain.Rules;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class PortalController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public PortalController(PlatformService platform) => _platform = platform;

    [HttpGet("pages/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> Page(string slug, [FromQuery] string? locale, CancellationToken ct) =>
        OkData(await _platform.PageAsync(slug, locale ?? "az", ct));

    [HttpGet("classifications")]
    [AllowAnonymous]
    public async Task<IActionResult> Classifications([FromQuery] string? kind, CancellationToken ct) =>
        OkData(await _platform.ClassificationsAsync(kind, ct));

    [HttpGet("procedures")]
    [AllowAnonymous]
    public async Task<IActionResult> Procedures(CancellationToken ct) => OkData(await _platform.ProceduresAsync(ct));

    [HttpGet("opportunities")]
    [AllowAnonymous]
    public async Task<IActionResult> Opportunities([FromQuery] string? locale, CancellationToken ct) =>
        OkData(await _platform.OpportunitiesAsync(locale ?? "az", ct));

    [HttpGet("company-registration")]
    [AllowAnonymous]
    public IActionResult CompanyRegistration() => OkData(_platform.CompanyRegistration());
}

[ApiController]
[Route("api/v1")]
public sealed class ToolsController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public ToolsController(PlatformService platform) => _platform = platform;

    [HttpPost("route/calculate")]
    [AllowAnonymous]
    public IActionResult RouteCalculate([FromBody] RouteRequest body) =>
        OkData(_platform.RouteCalculate(ToRoute(body)));

    [HttpPost("route/save")]
    [Authorize]
    public async Task<IActionResult> RouteSave([FromBody] RouteRequest body, CancellationToken ct) =>
        StatusCode(201, new { data = await _platform.RouteSaveAsync(CurrentUser, ToRoute(body), ct) });

    [HttpPost("incentives/evaluate")]
    [AllowAnonymous]
    public IActionResult IncentiveEvaluate([FromBody] IncentiveRequest body) =>
        OkData(_platform.IncentiveEvaluate(ToIncentive(body)));

    [HttpPost("incentives/save")]
    [Authorize]
    public async Task<IActionResult> IncentiveSave([FromBody] IncentiveRequest body, CancellationToken ct) =>
        StatusCode(201, new { data = await _platform.IncentiveSaveAsync(CurrentUser, ToIncentive(body), ct) });

    [HttpPost("kya/evaluate")]
    [AllowAnonymous]
    public async Task<IActionResult> KyaEvaluate([FromBody] KyaRequest body, CancellationToken ct) =>
        OkData(await _platform.KyaEvaluateAsync(ToKya(body), body.SiParameters, ct));

    [HttpPost("kya/save")]
    [Authorize]
    public async Task<IActionResult> KyaSave([FromBody] KyaRequest body, CancellationToken ct) =>
        StatusCode(201, new { data = await _platform.KyaSaveAsync(CurrentUser, ToKya(body), ct) });

    [HttpGet("kya/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetKya(Guid id, CancellationToken ct) =>
        OkData(await _platform.GetKyaAsync(CurrentUser, id, ct));

    private static RouteInput ToRoute(RouteRequest body) =>
        new(body.Country, body.Sector, body.VolumeAmount, body.VolumeCurrency, body.Territory, body.HasESignature, body.NationalityType);

    private static IncentiveInput ToIncentive(IncentiveRequest body) =>
        new(body.Sector, body.Activity, body.VolumeAmount, body.VolumeCurrency, body.Territory, body.InAgropark, body.InIndustrialPark);

    private static KyaInput ToKya(KyaRequest body) =>
        new(body.Sector, body.Territory, body.VolumeAmount, body.VolumeCurrency, body.ForeignWorkers, body.Description, body.ConfirmedParameters);
}

[ApiController]
[Route("api/v1")]
[Authorize]
public sealed class ProfileController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public ProfileController(PlatformService platform) => _platform = platform;

    [HttpGet("me/profile")]
    public async Task<IActionResult> Get(CancellationToken ct) => OkData(await _platform.GetProfileAsync(CurrentUser, ct));

    [HttpPut("me/profile")]
    public async Task<IActionResult> Put([FromBody] System.Text.Json.JsonElement body, CancellationToken ct) =>
        OkData(await _platform.UpdateProfileAsync(CurrentUser, body, ct));

    [HttpPost("me/consents")]
    public async Task<IActionResult> Consents([FromBody] ConsentBody body, CancellationToken ct) =>
        OkData(await _platform.ConsentsAsync(CurrentUser, body, ct));

    [HttpGet("me/representations")]
    public async Task<IActionResult> Representations(CancellationToken ct) =>
        OkData(await _platform.RepresentationsAsync(CurrentUser, ct));

    [HttpPost("me/representations")]
    public async Task<IActionResult> CreateRepresentation([FromBody] RepresentationCreateRequest body, CancellationToken ct) =>
        CreatedData(await _platform.CreateRepresentationAsync(CurrentUser, body.RepresentativeEmail, body.Authority, body.ValidTo, ct));

    [HttpPost("me/representations/{id:guid}/revoke")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct) =>
        OkData(await _platform.RevokeRepresentationAsync(CurrentUser, id, ct));
}

[ApiController]
[Route("api/v1/cabinet")]
[Authorize]
public sealed class CabinetController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public CabinetController(PlatformService platform) => _platform = platform;

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard(CancellationToken ct) => OkData(await _platform.CabinetAsync(CurrentUser, ct));
}

[ApiController]
[Route("api/v1/projects")]
[Authorize]
public sealed class ProjectsController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public ProjectsController(PlatformService platform) => _platform = platform;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => OkData(await _platform.ProjectsAsync(CurrentUser, ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProjectCreateRequest body, CancellationToken ct)
    {
        if (body.KyaResultId is null)
            throw AppException.BadRequest("KYA_REQUIRED", "Select a KYA result or run KYA before creating a project");
        return CreatedData(await _platform.CreateProjectAsync(CurrentUser, body.Name, body.Sector, body.Territory, body.VolumeAmount, body.VolumeCurrency, body.KyaResultId.Value, ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) => OkData(await _platform.GetProjectAsync(CurrentUser, id, ct));

    [HttpPost("{id:guid}/suspend")]
    public async Task<IActionResult> Suspend(Guid id, CancellationToken ct) => OkData(await _platform.SuspendProjectAsync(CurrentUser, id, ct));
}

[ApiController]
[Route("api/v1")]
public sealed class ApplicationsController : ApiControllerBase
{
    private readonly PlatformService _platform;
    public ApplicationsController(PlatformService platform) => _platform = platform;

    [HttpGet("application-types")]
    [AllowAnonymous]
    public async Task<IActionResult> Types(CancellationToken ct) => OkData(await _platform.ApplicationTypesAsync(ct));

    [HttpPost("applications")]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] ApplicationCreateRequest body, CancellationToken ct)
    {
        var answers = body.Answers ?? System.Text.Json.JsonSerializer.SerializeToElement(new { });
        return CreatedData(await _platform.CreateApplicationAsync(CurrentUser, body.TypeCode, body.ProjectId, body.Source ?? Domain.ApplicationSource.NEW_APPLICATION, body.StageId, answers, ct));
    }

    [HttpGet("applications")]
    [Authorize]
    public async Task<IActionResult> List(CancellationToken ct) => OkData(await _platform.ListApplicationsAsync(CurrentUser, ct));

    [HttpGet("applications/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) => OkData(await _platform.GetApplicationAsync(CurrentUser, id, ct));

    [HttpPatch("applications/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Patch(Guid id, [FromBody] ApplicationPatchRequest body, CancellationToken ct) =>
        OkData(await _platform.PatchApplicationAsync(CurrentUser, id, body.Answers, ct));

    [HttpPost("applications/{id:guid}/validate")]
    [Authorize]
    public async Task<IActionResult> Validate(Guid id, CancellationToken ct) =>
        OkData(await _platform.ValidateApplicationAsync(CurrentUser, id, ct));

    [HttpPost("applications/{id:guid}/submit")]
    [Authorize]
    public async Task<IActionResult> Submit(Guid id, CancellationToken ct) =>
        StatusCode(201, new { data = await _platform.SubmitApplicationAsync(CurrentUser, id, ct) });

    [HttpPost("applications/{id:guid}/withdraw")]
    [Authorize]
    public async Task<IActionResult> Withdraw(Guid id, [FromBody] WithdrawRequest body, CancellationToken ct)
    {
        await _platform.WithdrawApplicationAsync(CurrentUser, id, body.Reason, ct);
        return NoContent();
    }
}
