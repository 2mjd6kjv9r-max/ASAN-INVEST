using System.Security.Cryptography;
using System.Text.Json;
using AsanInvest.Domain;
using AsanInvest.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AsanInvest.Application;

public sealed class AuthService
{
    private readonly IAppDbContext _db;
    private readonly AppSettings _settings;
    private readonly AuthChallengeStore _challenges;
    private readonly IEmailSender _email;

    public AuthService(IAppDbContext db, IOptions<AppSettings> settings, AuthChallengeStore challenges, IEmailSender email)
    {
        _db = db;
        _settings = settings.Value;
        _challenges = challenges;
        _email = email;
    }

    public async Task<AuthOutcome> RegisterAsync(RegisterRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            throw AppException.Conflict("An account with this email already exists", "EMAIL_TAKEN");

        var autoVerify = !_settings.RequireEmailVerification;
        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, _settings.BcryptRounds),
            Locale = req.Locale ?? "az",
            Status = UserStatus.ACTIVE,
            AuthProvider = AuthProvider.EMAIL,
            EmailVerifiedAt = autoVerify ? DateTimeOffset.UtcNow : null,
            IdentificationLevel = IdentificationLevel.BASIC,
            Consents = req.Consents is null ? "{}" : JsonSerializer.Serialize(req.Consents),
            ConsentVersion = req.Consents?.Version,
            ConsentedAt = req.Consents is null ? null : DateTimeOffset.UtcNow,
            Profile = new Profile(),
            RoleAssignments = { new UserRoleAssignment { Role = UserRole.INVESTOR } },
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        if (!autoVerify)
        {
            var verify = Tokens.SignPurpose(_settings, user.Id, "email_verify", lifetime: "24h");
            await _email.SendAsync(
                user.Email,
                "Verify your ASAN Invest email",
                $"Open {_settings.ClientOrigin}/verify-email?token={Uri.EscapeDataString(verify)} to confirm this address.",
                ct);
        }

        if (req.GuestSessionToken is { } token && Guid.TryParse(token, out var sid))
        {
            var session = await _db.GuestSessions.FirstOrDefaultAsync(s => s.Id == sid, ct);
            if (session is not null && session.ExpiresAt > DateTimeOffset.UtcNow && user.Profile is not null)
            {
                var contacts = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(user.Profile.Contacts) ?? new();
                contacts["guestAnswers"] = JsonSerializer.Deserialize<JsonElement>(session.Answers);
                user.Profile.Contacts = JsonSerializer.Serialize(contacts);
                session.ConvertedUserId = user.Id;
                await _db.SaveChangesAsync(ct);
            }
        }

        await Audit(user.Id, "auth.register", "user", user.Id.ToString(), ct);
        return new AuthOutcome { Tokens = TokenPayload(user) };
    }

    public async Task<AuthOutcome> LoginAsync(string email, string password, CancellationToken ct)
    {
        var user = await _db.Users.Include(u => u.RoleAssignments).Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Email == email.Trim().ToLowerInvariant(), ct);
        if (user?.PasswordHash is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            throw AppException.Unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
        if (user.Status == UserStatus.DISABLED) throw AppException.Forbidden("Account is disabled", "ACCOUNT_DISABLED");
        if (user.EmailVerifiedAt is null && _settings.RequireEmailVerification)
            throw AppException.Forbidden("Email verification required", "EMAIL_NOT_VERIFIED");

        var roles = Roles.Active(user.RoleAssignments, DateTimeOffset.UtcNow);
        if (Roles.RequiresTwoFactor(roles))
        {
            var testing = string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Testing", StringComparison.OrdinalIgnoreCase);
            var code = testing ? "123456" : NewOtp();
            var challengeId = _challenges.IssueOtp(user.Id, Tokens.Hash(code), TimeSpan.FromMinutes(10));
            await _email.SendAsync(user.Email, "ASAN Invest sign-in code", $"Your sign-in code expires in 10 minutes. Code: {code}", ct);
            return new AuthOutcome { TwoFactorRequired = true, ChallengeId = challengeId };
        }

        await Audit(user.Id, "auth.login", "user", user.Id.ToString(), ct);
        return new AuthOutcome { Tokens = TokenPayload(user) };
    }

    public async Task<AuthOutcome> VerifyTwoFactorAsync(string challengeId, string code, CancellationToken ct)
    {
        if (!_challenges.ConsumeOtp(challengeId, Tokens.Hash(code), out var userId))
            throw AppException.Unauthorized("Two-factor code is invalid", "TWO_FACTOR_INVALID");
        var user = await _db.Users.Include(u => u.RoleAssignments).Include(u => u.Profile).FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw AppException.Unauthorized();
        user.TwoFactorEnabled = true;
        await _db.SaveChangesAsync(ct);
        return new AuthOutcome { Tokens = TokenPayload(user) };
    }

    public async Task<AuthOutcome> RefreshAsync(string? refreshToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) throw AppException.Unauthorized("Refresh token missing", "REFRESH_MISSING");
        try
        {
            var jwt = Tokens.Require(refreshToken, _settings.JwtRefreshSecret, "refresh");
            var jti = jwt.Id;
            if (_challenges.IsRefreshRevoked(jti)) throw AppException.Unauthorized("Refresh token is invalid", "REFRESH_INVALID");
            var user = await _db.Users.Include(u => u.RoleAssignments).Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == Guid.Parse(jwt.Subject), ct);
            if (user is null || user.Status == UserStatus.DISABLED) throw AppException.Unauthorized("Refresh token is invalid", "REFRESH_INVALID");
            return new AuthOutcome { Tokens = TokenPayload(user) };
        }
        catch (AppException) { throw; }
        catch { throw AppException.Unauthorized("Refresh token is invalid", "REFRESH_INVALID"); }
    }

    public async Task<object> MeAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users.Include(u => u.RoleAssignments).Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == userId, ct) ?? throw AppException.Unauthorized();
        return SerializeUser(user);
    }

    public async Task ForgotAsync(string email, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email.Trim().ToLowerInvariant(), ct);
        if (user is null || user.Status == UserStatus.DISABLED) return;
        var token = Tokens.SignPurpose(_settings, user.Id, "password_reset", lifetime: "1h");
        await _email.SendAsync(
            user.Email,
            "Reset your ASAN Invest password",
            $"Open {_settings.ClientOrigin}/reset-password?token={Uri.EscapeDataString(token)} to choose a new password. This link expires in one hour.",
            ct);
    }

    public void RevokeRefresh(string? refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) return;
        try
        {
            var jwt = Tokens.Require(refreshToken, _settings.JwtRefreshSecret, "refresh");
            var exp = jwt.ValidTo == DateTime.MinValue
                ? DateTimeOffset.UtcNow.Add(Tokens.ParseDuration(_settings.JwtRefreshExpiresIn))
                : new DateTimeOffset(DateTime.SpecifyKind(jwt.ValidTo, DateTimeKind.Utc));
            _challenges.RevokeRefresh(jwt.Id, exp);
        }
        catch
        {
            // Cookie delete still proceeds.
        }
    }

    public async Task ResetAsync(string token, string password, CancellationToken ct)
    {
        var jwt = Tokens.Require(token, _settings.JwtAccessSecret, "password_reset");
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == Guid.Parse(jwt.Subject), ct)
            ?? throw AppException.BadRequest("RESET_INVALID", "Reset token is invalid or expired");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, _settings.BcryptRounds);
        await _db.SaveChangesAsync(ct);
    }

    public async Task VerifyEmailAsync(string token, CancellationToken ct)
    {
        var jwt = Tokens.Require(token, _settings.JwtAccessSecret, "email_verify");
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == Guid.Parse(jwt.Subject), ct)
            ?? throw AppException.BadRequest("VERIFY_INVALID", "Verification token is invalid or expired");
        user.EmailVerifiedAt = DateTimeOffset.UtcNow;
        user.IdentificationLevel = IdentificationLevel.BASIC;
        await _db.SaveChangesAsync(ct);
    }

    public static object AsanLogin() => new
    {
        provider = "asan_login",
        available = false,
        identificationLevelIfCompleted = "LEGAL",
        message = "ASAN Login is not connected in Phase 1. Use email registration (level 1) and continue legal actions via a representative or when the provider is specified.",
    };

    public async Task<object> CreateGuestAsync(CancellationToken ct)
    {
        var session = new GuestSession { ExpiresAt = DateTimeOffset.UtcNow.AddDays(7) };
        _db.GuestSessions.Add(session);
        await _db.SaveChangesAsync(ct);
        return new { token = session.Id, expiresInDays = 7 };
    }

    public async Task<object> PatchGuestAsync(Guid id, JsonElement answers, string? email, string? locale, CancellationToken ct)
    {
        var session = await _db.GuestSessions.FirstOrDefaultAsync(s => s.Id == id, ct) ?? throw AppException.NotFound();
        if (session.ExpiresAt <= DateTimeOffset.UtcNow || session.ConvertedUserId is not null) throw AppException.NotFound();
        session.Answers = answers.GetRawText();
        if (email is not null) session.Email = email.ToLowerInvariant();
        if (locale is not null) session.Locale = locale;
        await _db.SaveChangesAsync(ct);
        return new { token = session.Id, answers = JsonSerializer.Deserialize<object>(session.Answers) };
    }

    private static string NewOtp()
    {
        var value = RandomNumberGenerator.GetInt32(100000, 1000000);
        return value.ToString();
    }

    private TokenResult TokenPayload(User user)
    {
        var roles = Roles.Active(user.RoleAssignments, DateTimeOffset.UtcNow);
        var access = Tokens.SignAccess(_settings, user.Id, user.Email, roles, user.IdentificationLevel);
        var refresh = Tokens.SignRefresh(_settings, user.Id);
        var expires = DateTimeOffset.UtcNow.Add(Tokens.ParseDuration(_settings.JwtRefreshExpiresIn));
        return new TokenResult(access, refresh, expires, SerializeUser(user));
    }

    public static object SerializeUser(User user)
    {
        var roles = Roles.Active(user.RoleAssignments, DateTimeOffset.UtcNow);
        return new
        {
            id = user.Id,
            email = user.Email,
            roles,
            identificationLevel = user.IdentificationLevel,
            locale = user.Locale,
            status = user.Status,
            authProvider = user.AuthProvider,
            emailVerifiedAt = user.EmailVerifiedAt,
            twoFactorEnabled = user.TwoFactorEnabled,
            institutionId = user.InstitutionId,
            consents = JsonSerializer.Deserialize<object>(user.Consents),
            consentVersion = user.ConsentVersion,
            consentedAt = user.ConsentedAt,
            pepSanctionsStatus = user.PepSanctionsStatus,
            pepSanctionsCheckedAt = user.PepSanctionsCheckedAt,
            profile = user.Profile is null ? null : SerializeProfile(user.Profile),
        };
    }

    public static object SerializeProfile(Profile p) => new
    {
        id = p.Id,
        countryId = p.CountryId,
        sectorId = p.SectorId,
        activityAreaId = p.ActivityAreaId,
        contacts = JsonSerializer.Deserialize<object>(p.Contacts),
        companyName = p.CompanyName,
        companyCountryId = p.CompanyCountryId,
        companyRegId = p.CompanyRegId,
        taxId = p.TaxId,
        companyActivity = p.CompanyActivity,
        uboStructure = p.UboStructure is null ? null : JsonSerializer.Deserialize<object>(p.UboStructure),
        version = p.Version,
    };

    private async Task Audit(Guid? actor, string action, string objectType, string objectId, CancellationToken ct)
    {
        _db.AuditRecords.Add(new AuditRecord { ActorUserId = actor, Action = action, ObjectType = objectType, ObjectId = objectId });
        await _db.SaveChangesAsync(ct);
    }
}

public sealed record RegisterRequest(string Email, string Password, string? Locale, string? GuestSessionToken, ConsentBody? Consents);
public sealed record ConsentBody(string Version, bool PersonalData);
