using AsanInvest.Application;
using AsanInvest.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class Phase3Controller : ApiControllerBase
{
    private readonly Phase3Service _phase3;
    public Phase3Controller(Phase3Service phase3) => _phase3 = phase3;

    [HttpGet("integrations/{code}/status")]
    [HttpGet("integrations/{code}")]
    [AllowAnonymous]
    public IActionResult IntegrationStatus(string code) => OkData(_phase3.IntegrationStatus(code));

    [HttpGet("e-residency")]
    [AllowAnonymous]
    public async Task<IActionResult> EResidency(CancellationToken ct) =>
        OkData(await _phase3.EResidencyPageAsync(ct));

    [HttpPost("projects/{id:guid}/stages/{stageId:guid}/external-submit")]
    [Authorize]
    public async Task<IActionResult> ExternalSubmit(Guid id, Guid stageId, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, new { data = await _phase3.ExternalSubmitAsync(CurrentUser, id, stageId, ct) });

    [HttpPost("admin/procedures/{id:guid}/flag")]
    [Authorize]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> ChangeFlag(Guid id, [FromBody] ProcedureFlagChangeRequest body, CancellationToken ct) =>
        OkData(await _phase3.ChangeProcedureFlagAsync(CurrentUser, id, body.From, body.To, body.Notify, ct));

    [HttpPatch("admin/procedures/{id:guid}")]
    [Authorize]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> PatchProcedure(Guid id, [FromBody] ProcedureFlagChangeRequest body, CancellationToken ct) =>
        OkData(await _phase3.ChangeProcedureFlagAsync(CurrentUser, id, body.From, body.To, body.Notify, ct));

    [HttpGet("admin/flag-changes")]
    [Authorize]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> FlagChanges(CancellationToken ct) =>
        OkData(await _phase3.FlagChangesAsync(ct));

    [HttpPost("admin/e-residency/grant")]
    [Authorize]
    [RequireRoles(UserRole.SYSADMIN)]
    public async Task<IActionResult> GrantEResidency([FromBody] EResidencyGrantRequest body, CancellationToken ct) =>
        OkData(await _phase3.GrantEResidencyAsync(CurrentUser, body.UserId, ct));
}
