using AsanInvest.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace AsanInvest.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController : ApiControllerBase
{
    private readonly AuthService _auth;
    private readonly AppSettings _settings;

    public AuthController(AuthService auth, IOptions<AppSettings> settings)
    {
        _auth = auth;
        _settings = settings.Value;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest body, CancellationToken ct)
    {
        var outcome = await _auth.RegisterAsync(body, ct);
        SetRefresh(outcome.Tokens!);
        return CreatedData(new { accessToken = outcome.Tokens!.AccessToken, user = outcome.Tokens.User });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest body, CancellationToken ct)
    {
        var outcome = await _auth.LoginAsync(body.Email, body.Password, ct);
        if (outcome.TwoFactorRequired)
            return OkData(new { twoFactorRequired = true, challengeId = outcome.ChallengeId });
        SetRefresh(outcome.Tokens!);
        return OkData(new { accessToken = outcome.Tokens!.AccessToken, user = outcome.Tokens.User });
    }

    [HttpPost("2fa/verify")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyTwoFactor([FromBody] TwoFactorRequest body, CancellationToken ct)
    {
        var outcome = await _auth.VerifyTwoFactorAsync(body.ChallengeId, body.Code, ct);
        SetRefresh(outcome.Tokens!);
        return OkData(new { accessToken = outcome.Tokens!.AccessToken, user = outcome.Tokens.User });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        Request.Cookies.TryGetValue(_settings.RefreshCookieName, out var token);
        var outcome = await _auth.RefreshAsync(token, ct);
        SetRefresh(outcome.Tokens!);
        return OkData(new { accessToken = outcome.Tokens!.AccessToken, user = outcome.Tokens.User });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public IActionResult Logout()
    {
        Request.Cookies.TryGetValue(_settings.RefreshCookieName, out var token);
        _auth.RevokeRefresh(token);
        Response.Cookies.Delete(_settings.RefreshCookieName, CookieOptions(DateTimeOffset.UnixEpoch));
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct) => OkData(await _auth.MeAsync(CurrentUser.Id, ct));

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Forgot([FromBody] ForgotPasswordRequest body, CancellationToken ct)
    {
        await _auth.ForgotAsync(body.Email, ct);
        return OkData(new { message = "If an account exists for that email, a reset message was queued." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Reset([FromBody] ResetPasswordRequest body, CancellationToken ct)
    {
        await _auth.ResetAsync(body.Token, body.Password, ct);
        return NoContent();
    }

    [HttpPost("verify-email")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest body, CancellationToken ct)
    {
        await _auth.VerifyEmailAsync(body.Token, ct);
        return NoContent();
    }

    [HttpPost("asan-login")]
    [AllowAnonymous]
    public IActionResult AsanLogin() => OkData(AuthService.AsanLogin());

    private void SetRefresh(TokenResult tokens) =>
        Response.Cookies.Append(_settings.RefreshCookieName, tokens.RefreshToken, CookieOptions(tokens.RefreshExpiresAt));

    private CookieOptions CookieOptions(DateTimeOffset expires) => new()
    {
        HttpOnly = true,
        Secure = _settings.CookieSecure || HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsProduction(),
        SameSite = SameSiteMode.Lax,
        Path = "/api/v1/auth",
        Expires = expires,
    };
}

[ApiController]
[Route("api/v1/guest-sessions")]
public sealed class GuestSessionsController : ApiControllerBase
{
    private readonly AuthService _auth;
    public GuestSessionsController(AuthService auth) => _auth = auth;

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] GuestCreateRequest? body, CancellationToken ct)
    {
        _ = body;
        return CreatedData(await _auth.CreateGuestAsync(ct));
    }

    [HttpPatch("{token:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Patch(Guid token, [FromBody] GuestPatchRequest body, CancellationToken ct) =>
        OkData(await _auth.PatchGuestAsync(token, body.Answers, body.Email, body.Locale, ct));
}

[ApiController]
public sealed class HealthController : ControllerBase
{
    [HttpGet("/health")]
    [HttpGet("/api/v1/health")]
    [AllowAnonymous]
    public IActionResult Get() => Ok(new { data = new { status = "ok", service = "asan-invest-api", phase = 1 } });
}
