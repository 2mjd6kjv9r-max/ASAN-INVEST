using Npgsql;
using Npgsql.NameTranslation;
using AsanInvest.Domain;

namespace AsanInvest.Infrastructure.Persistence;

public static class NpgsqlSetup
{
    public static string ToNpgsqlConnectionString(string databaseUrl)
    {
        if (string.IsNullOrWhiteSpace(databaseUrl))
            throw new InvalidOperationException("DATABASE_URL is required");
        if (databaseUrl.Contains("Host=", StringComparison.OrdinalIgnoreCase)
            || databaseUrl.Contains("Server=", StringComparison.OrdinalIgnoreCase))
            return databaseUrl;

        var normalized = databaseUrl
            .Replace("postgresql://", "postgres://", StringComparison.OrdinalIgnoreCase);
        var uri = new Uri(normalized);
        var userInfo = uri.UserInfo.Split(':', 2);
        var database = uri.AbsolutePath.Trim('/');
        var port = uri.IsDefaultPort ? 5432 : uri.Port;
        var user = Uri.UnescapeDataString(userInfo[0]);
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        return $"Host={uri.Host};Port={port};Database={database};Username={user};Password={password}";
    }

    public static NpgsqlDataSource CreateDataSource(string databaseUrl)
    {
        var builder = new NpgsqlDataSourceBuilder(ToNpgsqlConnectionString(databaseUrl));
        var names = new NpgsqlNullNameTranslator();
        builder.MapEnum<IdentificationLevel>("identification_level", names);
        builder.MapEnum<Flag>("flag", names);
        builder.MapEnum<ProjectStatus>("project_status", names);
        builder.MapEnum<CaseInternalStatus>("case_internal_status", names);
        builder.MapEnum<InvestorVisibleStatus>("investor_visible_status", names);
        builder.MapEnum<RepresentationAuthority>("representation_authority", names);
        builder.MapEnum<DocumentSource>("document_source", names);
        builder.MapEnum<NotificationChannel>("notification_channel", names);
        builder.MapEnum<RuleSetKind>("rule_set_kind", names);
        builder.MapEnum<UserRole>("user_role", names);
        builder.MapEnum<UserStatus>("user_status", names);
        builder.MapEnum<AuthProvider>("auth_provider", names);
        builder.MapEnum<ProjectSizeCategory>("project_size_category", names);
        builder.MapEnum<WorkflowKind>("workflow_kind", names);
        builder.MapEnum<Currency>("currency", names);
        builder.MapEnum<ClassificationKind>("classification_kind", names);
        builder.MapEnum<CmsStatus>("cms_status", names);
        builder.MapEnum<PaymentKind>("payment_kind", names);
        builder.MapEnum<PaymentStatus>("payment_status", names);
        builder.MapEnum<ReformStatus>("reform_status", names);
        builder.MapEnum<AccreditationStatus>("accreditation_status", names);
        builder.MapEnum<ApplicationSource>("application_source", names);
        builder.MapEnum<DocumentLinkObject>("document_link_object", names);
        return builder.Build();
    }
}
