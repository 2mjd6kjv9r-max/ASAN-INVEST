using AsanInvest.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using ApplicationEntity = AsanInvest.Domain.Entities.Application;

namespace AsanInvest.Application;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<UserRoleAssignment> UserRoleAssignments { get; }
    DbSet<Profile> Profiles { get; }
    DbSet<ProfileVersion> ProfileVersions { get; }
    DbSet<Representation> Representations { get; }
    DbSet<Project> Projects { get; }
    DbSet<Stage> Stages { get; }
    DbSet<KyaResult> KyaResults { get; }
    DbSet<ApplicationEntity> Applications { get; }
    DbSet<Case> Cases { get; }
    DbSet<TaskItem> Tasks { get; }
    DbSet<Evaluation> Evaluations { get; }
    DbSet<Document> Documents { get; }
    DbSet<DocumentLink> DocumentLinks { get; }
    DbSet<Message> Messages { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<RuleSet> RuleSets { get; }
    DbSet<AuditRecord> AuditRecords { get; }
    DbSet<Classification> Classifications { get; }
    DbSet<Procedure> Procedures { get; }
    DbSet<ProcedureDependency> ProcedureDependencies { get; }
    DbSet<ApplicationType> ApplicationTypes { get; }
    DbSet<WorkflowStatus> WorkflowStatuses { get; }
    DbSet<WorkflowTransition> WorkflowTransitions { get; }
    DbSet<CmsContent> CmsContents { get; }
    DbSet<CmsContentVersion> CmsContentVersions { get; }
    DbSet<NotificationTemplate> NotificationTemplates { get; }
    DbSet<GuestSession> GuestSessions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public sealed class AppException : Exception
{
    public int StatusCode { get; }
    public string Code { get; }
    public object? Details { get; }

    public AppException(int statusCode, string code, string message, object? details = null) : base(message)
    {
        StatusCode = statusCode;
        Code = code;
        Details = details;
    }

    public static AppException BadRequest(string code, string message, object? details = null) => new(400, code, message, details);
    public static AppException Unauthorized(string message = "Authentication required", string code = "UNAUTHORIZED") => new(401, code, message);
    public static AppException Forbidden(string message = "Insufficient permissions", string code = "FORBIDDEN") => new(403, code, message);
    public static AppException NotFound(string message = "Resource not found", string code = "NOT_FOUND") => new(404, code, message);
    public static AppException Conflict(string message, string code = "CONFLICT") => new(409, code, message);
}

public sealed class AppSettings
{
    public string DatabaseUrl { get; set; } = "postgresql://asan:asan_dev_password@127.0.0.1:5432/asan_invest";
    public int Port { get; set; } = 4000;
    public string ClientOrigin { get; set; } = "http://localhost:5173";
    public string JwtAccessSecret { get; set; } = "dev-only-access-secret-change-me-32ch";
    public string JwtRefreshSecret { get; set; } = "dev-only-refresh-secret-change-me-32";
    public string JwtAccessExpiresIn { get; set; } = "15m";
    public string JwtRefreshExpiresIn { get; set; } = "7d";
    public int BcryptRounds { get; set; } = 12;
    public bool RequireEmailVerification { get; set; }
    public bool CookieSecure { get; set; }
    public string RefreshCookieName { get; set; } = "refresh_token";
    public string UploadDir { get; set; } = "./uploads";
    public int MaxUploadBytes { get; set; } = 5 * 1024 * 1024;
    public string DvxCompanyRegistrationUrl { get; set; } = "https://www.e-taxes.gov.az/";

    public static AppSettings FromConfiguration(Microsoft.Extensions.Configuration.IConfiguration config)
    {
        static bool Flag(string? value, bool fallback) =>
            value is null ? fallback : value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1";

        return new AppSettings
        {
            DatabaseUrl = config["DATABASE_URL"] ?? "postgresql://asan:asan_dev_password@127.0.0.1:5432/asan_invest",
            Port = int.TryParse(config["PORT"], out var port) ? port : 4000,
            ClientOrigin = config["CLIENT_ORIGIN"] ?? "http://localhost:5173",
            JwtAccessSecret = config["JWT_ACCESS_SECRET"] ?? "dev-only-access-secret-change-me-32ch",
            JwtRefreshSecret = config["JWT_REFRESH_SECRET"] ?? "dev-only-refresh-secret-change-me-32",
            JwtAccessExpiresIn = config["JWT_ACCESS_EXPIRES_IN"] ?? "15m",
            JwtRefreshExpiresIn = config["JWT_REFRESH_EXPIRES_IN"] ?? "7d",
            BcryptRounds = int.TryParse(config["BCRYPT_ROUNDS"], out var rounds) ? rounds : 12,
            RequireEmailVerification = Flag(config["REQUIRE_EMAIL_VERIFICATION"], false),
            CookieSecure = Flag(config["COOKIE_SECURE"], false),
            RefreshCookieName = config["REFRESH_COOKIE_NAME"] ?? "refresh_token",
            UploadDir = config["UPLOAD_DIR"] ?? "./uploads",
            MaxUploadBytes = int.TryParse(config["MAX_UPLOAD_BYTES"], out var max) ? max : 5 * 1024 * 1024,
            DvxCompanyRegistrationUrl = config["DVX_COMPANY_REGISTRATION_URL"] ?? "https://www.e-taxes.gov.az/",
        };
    }
}

public sealed record CurrentUser(Guid Id, string Email, IReadOnlyList<AsanInvest.Domain.UserRole> Roles, AsanInvest.Domain.IdentificationLevel IdentificationLevel, Guid? InstitutionId);
