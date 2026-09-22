using AsanInvest.Domain;
using AsanInvest.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using ApplicationEntity = AsanInvest.Domain.Entities.Application;

namespace AsanInvest.Infrastructure.Persistence;

public sealed class AsanInvestDbContext : DbContext, Application.IAppDbContext
{
    public AsanInvestDbContext(DbContextOptions<AsanInvestDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserRoleAssignment> UserRoleAssignments => Set<UserRoleAssignment>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<ProfileVersion> ProfileVersions => Set<ProfileVersion>();
    public DbSet<Representation> Representations => Set<Representation>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Stage> Stages => Set<Stage>();
    public DbSet<KyaResult> KyaResults => Set<KyaResult>();
    public DbSet<ApplicationEntity> Applications => Set<ApplicationEntity>();
    public DbSet<Case> Cases => Set<Case>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Evaluation> Evaluations => Set<Evaluation>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentLink> DocumentLinks => Set<DocumentLink>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<RuleSet> RuleSets => Set<RuleSet>();
    public DbSet<AuditRecord> AuditRecords => Set<AuditRecord>();
    public DbSet<Classification> Classifications => Set<Classification>();
    public DbSet<Procedure> Procedures => Set<Procedure>();
    public DbSet<ProcedureDependency> ProcedureDependencies => Set<ProcedureDependency>();
    public DbSet<ApplicationType> ApplicationTypes => Set<ApplicationType>();
    public DbSet<WorkflowStatus> WorkflowStatuses => Set<WorkflowStatus>();
    public DbSet<WorkflowTransition> WorkflowTransitions => Set<WorkflowTransition>();
    public DbSet<CmsContent> CmsContents => Set<CmsContent>();
    public DbSet<CmsContentVersion> CmsContentVersions => Set<CmsContentVersion>();
    public DbSet<NotificationTemplate> NotificationTemplates => Set<NotificationTemplate>();
    public DbSet<GuestSession> GuestSessions => Set<GuestSession>();
    public DbSet<Payment> Payments => Set<Payment>();

    public async Task<string> NextApplicationPublicNumberAsync(CancellationToken cancellationToken = default)
    {
        var rows = await Database
            .SqlQueryRaw<string>("SELECT next_application_public_number() AS \"Value\"")
            .ToListAsync(cancellationToken);
        if (rows.Count == 0 || string.IsNullOrWhiteSpace(rows[0]))
            throw new InvalidOperationException("next_application_public_number() returned no value");
        return rows[0];
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State != EntityState.Modified) continue;
            var updated = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "UpdatedAt");
            if (updated is not null) updated.CurrentValue = now;
        }
        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresEnum<IdentificationLevel>("identification_level");
        modelBuilder.HasPostgresEnum<Flag>("flag");
        modelBuilder.HasPostgresEnum<ProjectStatus>("project_status");
        modelBuilder.HasPostgresEnum<CaseInternalStatus>("case_internal_status");
        modelBuilder.HasPostgresEnum<InvestorVisibleStatus>("investor_visible_status");
        modelBuilder.HasPostgresEnum<RepresentationAuthority>("representation_authority");
        modelBuilder.HasPostgresEnum<DocumentSource>("document_source");
        modelBuilder.HasPostgresEnum<NotificationChannel>("notification_channel");
        modelBuilder.HasPostgresEnum<RuleSetKind>("rule_set_kind");
        modelBuilder.HasPostgresEnum<UserRole>("user_role");
        modelBuilder.HasPostgresEnum<UserStatus>("user_status");
        modelBuilder.HasPostgresEnum<AuthProvider>("auth_provider");
        modelBuilder.HasPostgresEnum<ProjectSizeCategory>("project_size_category");
        modelBuilder.HasPostgresEnum<WorkflowKind>("workflow_kind");
        modelBuilder.HasPostgresEnum<Currency>("currency");
        modelBuilder.HasPostgresEnum<ClassificationKind>("classification_kind");
        modelBuilder.HasPostgresEnum<CmsStatus>("cms_status");
        modelBuilder.HasPostgresEnum<PaymentKind>("payment_kind");
        modelBuilder.HasPostgresEnum<ApplicationSource>("application_source");
        modelBuilder.HasPostgresEnum<DocumentLinkObject>("document_link_object");

        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Email).HasColumnName("email").HasColumnType("citext");
            e.Property(x => x.PasswordHash).HasColumnName("password_hash");
            e.Property(x => x.IdentificationLevel).HasColumnName("identification_level");
            e.Property(x => x.Locale).HasColumnName("locale");
            e.Property(x => x.Consents).HasColumnName("consents").HasColumnType("jsonb");
            e.Property(x => x.ConsentVersion).HasColumnName("consent_version");
            e.Property(x => x.ConsentedAt).HasColumnName("consented_at");
            e.Property(x => x.AuthProvider).HasColumnName("auth_provider");
            e.Property(x => x.EmailVerifiedAt).HasColumnName("email_verified_at");
            e.Property(x => x.TwoFactorEnabled).HasColumnName("two_factor_enabled");
            e.Property(x => x.TwoFactorSecret).HasColumnName("two_factor_secret");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.InstitutionId).HasColumnName("institution_id");
            e.Property(x => x.PepSanctionsStatus).HasColumnName("pep_sanctions_status");
            e.Property(x => x.PepSanctionsCheckedAt).HasColumnName("pep_sanctions_checked_at");
            e.Property(x => x.PepSanctionsListVersion).HasColumnName("pep_sanctions_list_version");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Email).IsUnique();
            e.HasOne(x => x.Institution).WithMany().HasForeignKey(x => x.InstitutionId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Profile).WithOne(p => p.User).HasForeignKey<Profile>(p => p.UserId);
        });

        modelBuilder.Entity<UserRoleAssignment>(e =>
        {
            e.ToTable("user_roles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Role).HasColumnName("role");
            e.Property(x => x.ValidFrom).HasColumnName("valid_from");
            e.Property(x => x.ValidTo).HasColumnName("valid_to");
            e.Property(x => x.GrantedById).HasColumnName("granted_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.User).WithMany(u => u.RoleAssignments).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Profile>(e =>
        {
            e.ToTable("profiles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.CountryId).HasColumnName("country_id");
            e.Property(x => x.SectorId).HasColumnName("sector_id");
            e.Property(x => x.ActivityAreaId).HasColumnName("activity_area_id");
            e.Property(x => x.Contacts).HasColumnName("contacts").HasColumnType("jsonb");
            e.Property(x => x.CompanyName).HasColumnName("company_name");
            e.Property(x => x.CompanyCountryId).HasColumnName("company_country_id");
            e.Property(x => x.CompanyRegId).HasColumnName("company_reg_id");
            e.Property(x => x.TaxId).HasColumnName("tax_id");
            e.Property(x => x.CompanyActivity).HasColumnName("company_activity");
            e.Property(x => x.UboStructure).HasColumnName("ubo_structure").HasColumnType("jsonb");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<ProfileVersion>(e =>
        {
            e.ToTable("profile_versions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProfileId).HasColumnName("profile_id");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.Snapshot).HasColumnName("snapshot").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Profile).WithMany(p => p.Versions).HasForeignKey(x => x.ProfileId);
        });

        modelBuilder.Entity<Representation>(e =>
        {
            e.ToTable("representations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProfileId).HasColumnName("profile_id");
            e.Property(x => x.RepresentativeUserId).HasColumnName("representative_user_id");
            e.Property(x => x.Authority).HasColumnName("authority");
            e.Property(x => x.PowerOfAttorneyDocumentId).HasColumnName("power_of_attorney_document_id");
            e.Property(x => x.ValidFrom).HasColumnName("valid_from");
            e.Property(x => x.ValidTo).HasColumnName("valid_to");
            e.Property(x => x.RevokedAt).HasColumnName("revoked_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Profile).WithMany(p => p.Representations).HasForeignKey(x => x.ProfileId);
            e.HasOne(x => x.RepresentativeUser).WithMany().HasForeignKey(x => x.RepresentativeUserId);
        });

        modelBuilder.Entity<Project>(e =>
        {
            e.ToTable("projects");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProfileId).HasColumnName("profile_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.SectorId).HasColumnName("sector_id");
            e.Property(x => x.TerritoryId).HasColumnName("territory_id");
            e.Property(x => x.VolumeAmount).HasColumnName("volume_amount").HasColumnType("numeric(18,2)");
            e.Property(x => x.VolumeCurrency).HasColumnName("volume_currency");
            e.Property(x => x.SizeCategory).HasColumnName("size_category");
            e.Property(x => x.CompanyRef).HasColumnName("company_ref");
            e.Property(x => x.PermanentCaseManagerId).HasColumnName("permanent_case_manager_id");
            e.Property(x => x.CreatedById).HasColumnName("created_by");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Profile).WithMany(p => p.Projects).HasForeignKey(x => x.ProfileId);
        });

        modelBuilder.Entity<Stage>(e =>
        {
            e.ToTable("stages");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProjectId).HasColumnName("project_id");
            e.Property(x => x.ProcedureId).HasColumnName("procedure_id");
            e.Property(x => x.Flag).HasColumnName("flag");
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.Property(x => x.ExpectedDurationDays).HasColumnName("expected_duration_days");
            e.Property(x => x.ActualStartedAt).HasColumnName("actual_started_at");
            e.Property(x => x.ActualCompletedAt).HasColumnName("actual_completed_at");
            e.Property(x => x.ApplicationId).HasColumnName("application_id");
            e.Property(x => x.IsNotApplicable).HasColumnName("is_not_applicable");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Project).WithMany(p => p.Stages).HasForeignKey(x => x.ProjectId);
            e.HasOne(x => x.Procedure).WithMany().HasForeignKey(x => x.ProcedureId);
            e.HasOne(x => x.Application).WithMany().HasForeignKey(x => x.ApplicationId);
        });

        modelBuilder.Entity<KyaResult>(e =>
        {
            e.ToTable("kya_results");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProfileId).HasColumnName("profile_id");
            e.Property(x => x.ProjectId).HasColumnName("project_id");
            e.Property(x => x.InputParameters).HasColumnName("input_parameters").HasColumnType("jsonb");
            e.Property(x => x.Procedures).HasColumnName("procedures").HasColumnType("jsonb");
            e.Property(x => x.RuleSetId).HasColumnName("rule_set_id");
            e.Property(x => x.RuleVersion).HasColumnName("rule_version");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Profile).WithMany(p => p.KyaResults).HasForeignKey(x => x.ProfileId);
            e.HasOne(x => x.Project).WithMany(p => p.KyaResults).HasForeignKey(x => x.ProjectId);
            e.HasOne(x => x.RuleSet).WithMany().HasForeignKey(x => x.RuleSetId);
        });

        modelBuilder.Entity<ApplicationEntity>(e =>
        {
            e.ToTable("applications");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PublicNumber).HasColumnName("public_number");
            e.Property(x => x.TypeId).HasColumnName("type_id");
            e.Property(x => x.Workflow).HasColumnName("workflow");
            e.Property(x => x.Snapshot).HasColumnName("snapshot").HasColumnType("jsonb");
            e.Property(x => x.ProjectId).HasColumnName("project_id");
            e.Property(x => x.ProfileId).HasColumnName("profile_id");
            e.Property(x => x.Source).HasColumnName("source");
            e.Property(x => x.WithdrawnAt).HasColumnName("withdrawn_at");
            e.Property(x => x.WithdrawalReason).HasColumnName("withdrawal_reason");
            e.Property(x => x.SubmittedAt).HasColumnName("submitted_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Type).WithMany().HasForeignKey(x => x.TypeId);
            e.HasOne(x => x.Project).WithMany(p => p.Applications).HasForeignKey(x => x.ProjectId);
            e.HasOne(x => x.Profile).WithMany(p => p.Applications).HasForeignKey(x => x.ProfileId);
            e.HasOne(x => x.Case).WithOne(c => c.Application).HasForeignKey<Case>(c => c.ApplicationId);
        });

        modelBuilder.Entity<Case>(e =>
        {
            e.ToTable("cases");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ApplicationId).HasColumnName("application_id");
            e.Property(x => x.InternalStatus).HasColumnName("internal_status");
            e.Property(x => x.CaseManagerId).HasColumnName("case_manager_id");
            e.Property(x => x.SlaDueAt).HasColumnName("sla_due_at");
            e.Property(x => x.RegisteredAt).HasColumnName("registered_at");
            e.Property(x => x.ClosedAt).HasColumnName("closed_at");
            e.Property(x => x.PausedAt).HasColumnName("paused_at");
            e.Property(x => x.EscalatedAt).HasColumnName("escalated_at");
            e.Property(x => x.FinalResult).HasColumnName("final_result").HasColumnType("jsonb");
            e.Property(x => x.SectorId).HasColumnName("sector_id");
            e.Property(x => x.RegionId).HasColumnName("region_id");
            e.Property(x => x.InstitutionId).HasColumnName("institution_id");
            e.Property(x => x.ReopenedAt).HasColumnName("reopened_at");
            e.Property(x => x.ReopenedById).HasColumnName("reopened_by");
            e.Property(x => x.ReopenReason).HasColumnName("reopen_reason");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.CaseManager).WithMany().HasForeignKey(x => x.CaseManagerId);
        });

        modelBuilder.Entity<TaskItem>(e =>
        {
            e.ToTable("tasks");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CaseId).HasColumnName("case_id");
            e.Property(x => x.InstitutionId).HasColumnName("institution_id");
            e.Property(x => x.AssigneeUserId).HasColumnName("assignee_user_id");
            e.Property(x => x.DueAt).HasColumnName("due_at");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Opinion).HasColumnName("opinion");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Case).WithMany(c => c.Tasks).HasForeignKey(x => x.CaseId);
            e.HasOne(x => x.Institution).WithMany().HasForeignKey(x => x.InstitutionId);
        });

        modelBuilder.Entity<Evaluation>(e =>
        {
            e.ToTable("evaluations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CaseId).HasColumnName("case_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Route).HasColumnName("route");
            e.Property(x => x.EvaluatorId).HasColumnName("evaluator_id");
            e.Property(x => x.Opinion).HasColumnName("opinion");
            e.Property(x => x.CriteriaUsed).HasColumnName("criteria_used").HasColumnType("jsonb");
            e.Property(x => x.ListVersion).HasColumnName("list_version");
            e.Property(x => x.StartedAt).HasColumnName("started_at");
            e.Property(x => x.DueAt).HasColumnName("due_at");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Case).WithMany(c => c.Evaluations).HasForeignKey(x => x.CaseId);
            e.HasOne(x => x.Subject).WithMany().HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<Document>(e =>
        {
            e.ToTable("documents");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TypeId).HasColumnName("type_id");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.ValidUntil).HasColumnName("valid_until");
            e.Property(x => x.Source).HasColumnName("source");
            e.Property(x => x.StorageKey).HasColumnName("storage_key");
            e.Property(x => x.OriginalName).HasColumnName("original_name");
            e.Property(x => x.MimeType).HasColumnName("mime_type");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Type).WithMany().HasForeignKey(x => x.TypeId);
        });

        modelBuilder.Entity<DocumentLink>(e =>
        {
            e.ToTable("document_links");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.ObjectType).HasColumnName("object_type");
            e.Property(x => x.ObjectId).HasColumnName("object_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Document).WithMany(d => d.Links).HasForeignKey(x => x.DocumentId);
        });

        modelBuilder.Entity<Message>(e =>
        {
            e.ToTable("messages");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ApplicationId).HasColumnName("application_id");
            e.Property(x => x.SenderUserId).HasColumnName("sender_user_id");
            e.Property(x => x.Body).HasColumnName("body");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.IsInternal).HasColumnName("is_internal");
            e.HasOne(x => x.Application).WithMany(a => a.Messages).HasForeignKey(x => x.ApplicationId);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.ToTable("notifications");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.EventType).HasColumnName("event_type");
            e.Property(x => x.Channel).HasColumnName("channel");
            e.Property(x => x.DeliveryResult).HasColumnName("delivery_result");
            e.Property(x => x.ReadAt).HasColumnName("read_at");
            e.Property(x => x.Body).HasColumnName("body");
            e.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<RuleSet>(e =>
        {
            e.ToTable("rule_sets");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Kind).HasColumnName("kind");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.EffectiveAt).HasColumnName("effective_at");
            e.Property(x => x.ApprovedById).HasColumnName("approved_by");
            e.Property(x => x.Body).HasColumnName("body").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<AuditRecord>(e =>
        {
            e.ToTable("audit_records");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ActorUserId).HasColumnName("actor_user_id");
            e.Property(x => x.Action).HasColumnName("action");
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at");
            e.Property(x => x.Before).HasColumnName("before").HasColumnType("jsonb");
            e.Property(x => x.After).HasColumnName("after").HasColumnType("jsonb");
            e.Property(x => x.ObjectType).HasColumnName("object_type");
            e.Property(x => x.ObjectId).HasColumnName("object_id");
        });

        modelBuilder.Entity<Classification>(e =>
        {
            e.ToTable("classifications");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Kind).HasColumnName("kind");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Names).HasColumnName("names").HasColumnType("jsonb");
            e.Property(x => x.ParentId).HasColumnName("parent_id");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Procedure>(e =>
        {
            e.ToTable("procedures");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Names).HasColumnName("names").HasColumnType("jsonb");
            e.Property(x => x.InstitutionId).HasColumnName("institution_id");
            e.Property(x => x.Flag).HasColumnName("flag");
            e.Property(x => x.ExpectedDurationDays).HasColumnName("expected_duration_days");
            e.Property(x => x.FeeAmount).HasColumnName("fee_amount").HasColumnType("numeric(18,2)");
            e.Property(x => x.FeeCurrency).HasColumnName("fee_currency");
            e.Property(x => x.LegalBasis).HasColumnName("legal_basis");
            e.Property(x => x.EServiceUrl).HasColumnName("e_service_url");
            e.Property(x => x.ApplicationTypeId).HasColumnName("application_type_id");
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Institution).WithMany().HasForeignKey(x => x.InstitutionId);
        });

        modelBuilder.Entity<ProcedureDependency>(e =>
        {
            e.ToTable("procedure_dependencies");
            e.HasKey(x => new { x.ProcedureId, x.DependsOnProcedureId });
            e.Property(x => x.ProcedureId).HasColumnName("procedure_id");
            e.Property(x => x.DependsOnProcedureId).HasColumnName("depends_on_procedure_id");
            e.HasOne<Procedure>().WithMany(p => p.Dependencies).HasForeignKey(x => x.ProcedureId);
        });

        modelBuilder.Entity<ApplicationType>(e =>
        {
            e.ToTable("application_types");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Names).HasColumnName("names").HasColumnType("jsonb");
            e.Property(x => x.Workflow).HasColumnName("workflow");
            e.Property(x => x.IdentificationLevel).HasColumnName("identification_level");
            e.Property(x => x.RequiresEvaluation).HasColumnName("requires_evaluation");
            e.Property(x => x.FormSchema).HasColumnName("form_schema").HasColumnType("jsonb");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<WorkflowStatus>(e =>
        {
            e.ToTable("workflow_statuses");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Workflow).HasColumnName("workflow");
            e.Property(x => x.InternalStatus).HasColumnName("internal_status");
            e.Property(x => x.InvestorVisibleStatus).HasColumnName("investor_visible_status");
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.Property(x => x.SlaWorkingDays).HasColumnName("sla_working_days");
            e.Property(x => x.PauseSlaOnThisStatus).HasColumnName("pause_sla_on_this_status");
            e.Property(x => x.IsTerminal).HasColumnName("is_terminal");
        });

        modelBuilder.Entity<WorkflowTransition>(e =>
        {
            e.ToTable("workflow_transitions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Workflow).HasColumnName("workflow");
            e.Property(x => x.FromStatus).HasColumnName("from_status");
            e.Property(x => x.ToStatus).HasColumnName("to_status");
            e.Property(x => x.RequiredRole).HasColumnName("required_role");
            e.Property(x => x.RequiresReason).HasColumnName("requires_reason");
        });

        modelBuilder.Entity<CmsContent>(e =>
        {
            e.ToTable("cms_content");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PageKey).HasColumnName("page_key");
            e.Property(x => x.Slug).HasColumnName("slug");
            e.Property(x => x.Title).HasColumnName("title").HasColumnType("jsonb");
            e.Property(x => x.Body).HasColumnName("body").HasColumnType("jsonb");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.OwnerUserId).HasColumnName("owner_user_id");
            e.Property(x => x.EffectiveAt).HasColumnName("effective_at");
            e.Property(x => x.PublishedAt).HasColumnName("published_at");
            e.Property(x => x.ScheduledAt).HasColumnName("scheduled_at");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<CmsContentVersion>(e =>
        {
            e.ToTable("cms_content_versions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ContentId).HasColumnName("content_id");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.Title).HasColumnName("title").HasColumnType("jsonb");
            e.Property(x => x.Body).HasColumnName("body").HasColumnType("jsonb");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<NotificationTemplate>(e =>
        {
            e.ToTable("notification_templates");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.EventType).HasColumnName("event_type");
            e.Property(x => x.Role).HasColumnName("role");
            e.Property(x => x.Locale).HasColumnName("locale");
            e.Property(x => x.Channel).HasColumnName("channel");
            e.Property(x => x.Subject).HasColumnName("subject");
            e.Property(x => x.Body).HasColumnName("body");
            e.Property(x => x.IsMandatory).HasColumnName("is_mandatory");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<GuestSession>(e =>
        {
            e.ToTable("guest_sessions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Email).HasColumnName("email").HasColumnType("citext");
            e.Property(x => x.Answers).HasColumnName("answers").HasColumnType("jsonb");
            e.Property(x => x.Locale).HasColumnName("locale");
            e.Property(x => x.ConvertedUserId).HasColumnName("converted_user_id");
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Payment>(e =>
        {
            e.ToTable("payments");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Kind).HasColumnName("kind");
            e.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric(18,2)");
            e.Property(x => x.Currency).HasColumnName("currency");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.ReceiptDocumentId).HasColumnName("receipt_document_id");
            e.Property(x => x.ProjectId).HasColumnName("project_id");
            e.Property(x => x.ApplicationId).HasColumnName("application_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });
    }
}
