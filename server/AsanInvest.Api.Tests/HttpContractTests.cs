using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AsanInvest.Application;
using AsanInvest.Domain;
using AsanInvest.Domain.Rules;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace AsanInvest.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DATABASE_URL"] = "Host=127.0.0.1;Port=5432;Database=asan_invest;Username=asan;Password=asan_dev_password",
                ["JWT_ACCESS_SECRET"] = "test-access-secret-change-me-32chars!",
                ["JWT_REFRESH_SECRET"] = "test-refresh-secret-change-me-32char",
                ["PORT"] = "4000",
            });
        });
    }
}

public sealed class HttpContractTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public HttpContractTests(ApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Health_returns_consistent_payload()
    {
        var res = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        using var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        Assert.Equal("ok", body.RootElement.GetProperty("data").GetProperty("status").GetString());
        Assert.Equal(3, body.RootElement.GetProperty("data").GetProperty("phase").GetInt32());
    }

    [Fact]
    public async Task Register_validates_payloads_without_leaking_secrets()
    {
        var res = await _client.PostAsJsonAsync("/api/v1/auth/register", new { email = "bad", password = "short" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var text = await res.Content.ReadAsStringAsync();
        using var body = JsonDocument.Parse(text);
        Assert.Equal("VALIDATION_ERROR", body.RootElement.GetProperty("error").GetProperty("code").GetString());
        Assert.DoesNotContain("passwordHash", text, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Unknown_routes_use_standard_error_shape()
    {
        var res = await _client.GetAsync("/api/v1/does-not-exist");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        using var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        Assert.Equal("NOT_FOUND", body.RootElement.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task Company_registration_adds_electronic_submit_flag_without_renaming_phase1_fields()
    {
        var res = await _client.GetAsync("/api/v1/company-registration");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        using var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var data = body.RootElement.GetProperty("data");
        Assert.Equal(JsonValueKind.String, data.GetProperty("url").ValueKind);
        Assert.Equal(JsonValueKind.String, data.GetProperty("message").ValueKind);
        Assert.False(data.GetProperty("electronicSubmitAvailable").GetBoolean());
    }

    [Fact]
    public async Task Auth_providers_list_email_live_and_plan_shells()
    {
        var res = await _client.GetAsync("/api/v1/auth/providers");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        using var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var data = body.RootElement.GetProperty("data");
        Assert.Equal(JsonValueKind.Array, data.ValueKind);
        var email = data.EnumerateArray().First(x => x.GetProperty("code").GetString() == "EMAIL");
        Assert.True(email.GetProperty("available").GetBoolean());
        var asan = data.EnumerateArray().First(x => x.GetProperty("code").GetString() == "ASAN_LOGIN");
        Assert.False(asan.GetProperty("available").GetBoolean());
        Assert.Equal("PLANNED", asan.GetProperty("flag").GetString());
        var foreign = data.EnumerateArray().First(x => x.GetProperty("code").GetString() == "FOREIGN_ESIGN");
        Assert.Equal("BASIC", foreign.GetProperty("identificationLevelIfCompleted").GetString());
        var nonresident = data.EnumerateArray().First(x => x.GetProperty("code").GetString() == "E_NONRESIDENT");
        Assert.False(nonresident.GetProperty("available").GetBoolean());
        Assert.Equal("LEGAL", nonresident.GetProperty("identificationLevelIfCompleted").GetString());
    }

    [Fact]
    public async Task Asan_login_stub_is_planned_and_does_not_issue_a_session()
    {
        var res = await _client.PostAsJsonAsync("/api/v1/auth/asan-login", new { });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var text = await res.Content.ReadAsStringAsync();
        using var body = JsonDocument.Parse(text);
        var data = body.RootElement.GetProperty("data");
        Assert.False(data.GetProperty("available").GetBoolean());
        Assert.Equal("PLANNED", data.GetProperty("flag").GetString());
        Assert.False(data.TryGetProperty("accessToken", out _));
        Assert.DoesNotContain("Set-Cookie", res.Headers.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Integration_status_is_honest_plan()
    {
        var res = await _client.GetAsync("/api/v1/integrations/visa/status");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        using var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var data = body.RootElement.GetProperty("data");
        Assert.Equal("visa", data.GetProperty("code").GetString());
        Assert.False(data.GetProperty("available").GetBoolean());
        Assert.Equal("PLANNED", data.GetProperty("flag").GetString());
        Assert.False(data.GetProperty("enabled").GetBoolean());
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/v1/integrations/not-a-real-api/status")).StatusCode);
        var alias = await _client.GetAsync("/api/v1/integrations/customs_incentive/status");
        Assert.Equal(HttpStatusCode.OK, alias.StatusCode);
        using var aliasBody = JsonDocument.Parse(await alias.Content.ReadAsStringAsync());
        Assert.Equal("customs", aliasBody.RootElement.GetProperty("data").GetProperty("code").GetString());
    }
}

public sealed class DomainRuleTests
{
    [Fact]
    public void Route_marks_estimates_and_keeps_fees_on_separate_lines()
    {
        var result = RouteCalculator.Evaluate(new RouteInput("DE", "chemicals", "4500000.00", "USD", "sumgayit", null, "non_resident"));
        Assert.True(result.Estimated);
        Assert.Equal("D", result.RegistrationRoute);
        Assert.Equal("apostille", result.Legalization);
        Assert.True(result.ResidenceBasis);
        Assert.NotEmpty(result.StateFees);
        Assert.Empty(result.PartnerFees);
    }

    [Fact]
    public void Route_stops_politely_for_sanctioned_countries()
    {
        var result = RouteCalculator.Evaluate(new RouteInput("XX", "chemicals", "1.00", "AZN", "baku", null, null));
        Assert.Equal("SANCTIONS_REVIEW", result.PoliteStop?.Code);
        Assert.DoesNotContain("guilty", result.PoliteStop?.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Incentive_returns_conditional_eligibility_with_an_alternative()
    {
        var result = IncentiveCalculator.Evaluate(new IncentiveInput("chemicals", "processing", "1200000.00", "AZN", "ganja", false, null));
        Assert.Equal("conditionally_eligible", result.Outcome);
        Assert.Contains("689", result.LegalCitation);
        Assert.NotEmpty(result.Alternatives);
    }

    [Fact]
    public void Ombudsman_officer_is_internal_and_requires_2fa()
    {
        Assert.True(Roles.RequiresTwoFactor([UserRole.OMBUDSMAN_OFFICER]));
        Assert.True(Roles.IsInternal([UserRole.OMBUDSMAN_OFFICER]));
    }

    [Fact]
    public void Supervisor_only_reopen()
    {
        Assert.True(Workflow.CanTransition(CaseInternalStatus.REJECTED, CaseInternalStatus.UNDER_REVIEW, [UserRole.SUPERVISOR]));
        Assert.False(Workflow.CanTransition(CaseInternalStatus.REJECTED, CaseInternalStatus.UNDER_REVIEW, [UserRole.CASE_MANAGER]));
        Assert.False(Workflow.CanTransition(CaseInternalStatus.REJECTED, CaseInternalStatus.UNDER_REVIEW, [UserRole.INVESTOR]));
    }

    [Fact]
    public void Working_days_skip_weekends()
    {
        var friday = new DateTimeOffset(2026, 9, 18, 0, 0, 0, TimeSpan.Zero);
        var due = Workflow.AddWorkingDays(friday, 1);
        Assert.Equal("2026-09-21", due.UtcDateTime.ToString("yyyy-MM-dd"));
    }

    [Fact]
    public void Application_number_is_padded()
    {
        Assert.Equal("INV-2026-00412", Workflow.NextApplicationNumber(2026, 412));
    }

    [Fact]
    public void Purpose_token_cannot_be_used_as_access()
    {
        var settings = new AppSettings { JwtAccessSecret = "test-access-secret-change-me-32chars!" };
        var token = Tokens.SignPurpose(settings, Guid.NewGuid(), "email_verify", lifetime: "24h");
        var jwt = Tokens.Require(token, settings.JwtAccessSecret, "email_verify");
        Assert.Equal("email_verify", jwt.Payload["typ"]?.ToString());
        Assert.ThrowsAny<Exception>(() => Tokens.Require(token, settings.JwtAccessSecret, "access"));
    }

    [Fact]
    public void Refresh_token_carries_jti()
    {
        var settings = new AppSettings { JwtRefreshSecret = "test-refresh-secret-change-me-32char", JwtRefreshExpiresIn = "7d" };
        var token = Tokens.SignRefresh(settings, Guid.NewGuid());
        var jwt = Tokens.Require(token, settings.JwtRefreshSecret, "refresh");
        Assert.False(string.IsNullOrWhiteSpace(jwt.Id));
    }

    [Fact]
    public void Two_factor_store_is_one_time_and_user_bound()
    {
        var store = new AuthChallengeStore();
        var userId = Guid.NewGuid();
        var id = store.IssueOtp(userId, Tokens.Hash("123456"), TimeSpan.FromMinutes(10));
        Assert.True(store.ConsumeOtp(id, Tokens.Hash("123456"), out var matched));
        Assert.Equal(userId, matched);
        Assert.False(store.ConsumeOtp(id, Tokens.Hash("123456"), out _));
        Assert.False(store.ConsumeOtp(id, Tokens.Hash("000000"), out _));
    }

    [Fact]
    public void Kya_procedure_codes_read_saved_object_shape()
    {
        const string json = """{"procedures":[{"code":"company-reg","reason":"always"}],"ruleSetId":"00000000-0000-4000-8000-000000000099","ruleVersion":"1"}""";
        Assert.Equal(["company-reg"], KyaProcedureCodes.Parse(json));
        Assert.Equal(["a", "b"], KyaProcedureCodes.Parse("""["a",{"code":"b"}]"""));
        Assert.Empty(KyaProcedureCodes.Parse("{}"));
    }

    [Fact]
    public void Z02_linkage_xor()
    {
        Assert.Throws<InvalidOperationException>(() => Workflow.AssertLinked(null, null));
        Assert.Throws<InvalidOperationException>(() => Workflow.AssertLinked(Guid.NewGuid(), Guid.NewGuid()));
        Workflow.AssertLinked(null, Guid.NewGuid());
        Workflow.AssertLinked(Guid.NewGuid(), null);
    }

    [Fact]
    public void Ombudsman_and_aftercare_transitions_are_role_scoped()
    {
        Assert.True(Workflow.CanTransition(CaseInternalStatus.REGISTERED, CaseInternalStatus.UNDER_INVESTIGATION, [UserRole.OMBUDSMAN_OFFICER]));
        Assert.True(Workflow.CanTransition(CaseInternalStatus.OPINION_PENDING_APPROVAL, CaseInternalStatus.COMPLETED, [UserRole.SUPERVISOR]));
        Assert.False(Workflow.CanTransition(CaseInternalStatus.OPINION_PENDING_APPROVAL, CaseInternalStatus.COMPLETED, [UserRole.OMBUDSMAN_OFFICER]));
        Assert.True(Workflow.CanTransition(CaseInternalStatus.IN_MONITORING, CaseInternalStatus.NEXT_CONTACT_PLANNED, [UserRole.CASE_MANAGER]));
        Assert.False(Workflow.CanTransition(CaseInternalStatus.IN_MONITORING, CaseInternalStatus.NEXT_CONTACT_PLANNED, [UserRole.INVESTOR]));
    }

    [Fact]
    public void Phase2_application_types_lift_workflow_gate()
    {
        Assert.True(Phase2Types.AllowsWorkflow("standard-permit", WorkflowKind.STANDARD));
        Assert.True(Phase2Types.AllowsWorkflow("ombudsman", WorkflowKind.OMBUDSMAN));
        Assert.True(Phase2Types.AllowsWorkflow("aftercare", WorkflowKind.AFTERCARE));
        Assert.True(Phase2Types.AllowsWorkflow("company_registration", WorkflowKind.STANDARD));
        Assert.True(Phase2Types.AllowsWorkflow("bank_kyc", WorkflowKind.STANDARD));
        Assert.False(Phase2Types.AllowsWorkflow("future-module", WorkflowKind.OMBUDSMAN));
    }

    [Fact]
    public void Bank_pilot_rejects_more_than_two_institutions()
    {
        Assert.False(BankPilot.ExceedsLimit(2));
        Assert.True(BankPilot.ExceedsLimit(3));
        Assert.Equal(2, BankPilot.MaxBanks);
        Assert.True(BankPilot.IsPilotInstitution("pilot-bank-a"));
        Assert.True(BankPilot.IsPilotInstitution("PILOT-BANK-B"));
        Assert.False(BankPilot.IsPilotInstitution("economy-ministry"));
        Assert.False(BankPilot.IsPilotInstitution(null));
    }

    [Fact]
    public void Payment_hmac_rejects_missing_secret_and_stolen_user_token_shape()
    {
        const string payload = """{"status":"SUCCEEDED"}""";
        Assert.False(PaymentHmac.Verify("", payload, "abcd"));
        Assert.False(PaymentHmac.Verify("webhook-secret", payload, null));
        var sig = PaymentHmac.Sign("webhook-secret", payload);
        Assert.True(PaymentHmac.Verify("webhook-secret", payload, sig));
        Assert.True(PaymentHmac.Verify("webhook-secret", payload, "sha256=" + sig));
        Assert.False(PaymentHmac.Verify("webhook-secret", payload, PaymentHmac.Sign("other", payload)));
    }

    [Fact]
    public void Feature_flags_default_off()
    {
        var settings = new AppSettings();
        Assert.False(settings.OmbudsmanEnabled);
        Assert.False(settings.DvxSubmitEnabled);
        Assert.False(settings.PaymentsEnabled);
        Assert.False(settings.BankPilotEnabled);
        Assert.False(settings.AsanLoginEnabled);
        Assert.False(settings.ENonresidentEnabled);
        Assert.False(settings.RemoteBankEnabled);
        Assert.False(settings.EResidencyEnabled);
        Assert.False(settings.ForeignEsignEnabled);
        Assert.False(settings.VisaEnabled);
        Assert.False(settings.CustomsEnabled);
        Assert.False(settings.ElectricityEnabled);
        Assert.False(settings.GasEnabled);
        Assert.False(settings.WaterEnabled);
    }

    [Fact]
    public void Flag_summary_counts_open_physical_stages_only()
    {
        var summary = FlagSummary.FromStages(
        [
            (Flag.PHYSICAL, 5, false, false),
            (Flag.PLANNED, 10, false, false),
            (Flag.PHYSICAL, 3, true, false),
            (Flag.ONLINE, 2, false, true),
        ]);
        Assert.Equal(15, summary.WorkingDays);
        Assert.Equal(1, summary.PhysicalContacts);
        Assert.True(FlagSummary.IsOpenStage(null, false));
        Assert.False(FlagSummary.IsOpenStage(DateTimeOffset.UtcNow, false));
        Assert.True(FlagSummary.IsOpenForFlagRefresh(null, false, CaseInternalStatus.REGISTERED));
        Assert.False(FlagSummary.IsOpenForFlagRefresh(null, false, CaseInternalStatus.COMPLETED));
        Assert.False(FlagSummary.IsOpenForFlagRefresh(null, false, CaseInternalStatus.REJECTED));
        Assert.False(FlagSummary.IsOpenForFlagRefresh(DateTimeOffset.UtcNow, false, null));
    }

    [Fact]
    public void Phase3_integrity_blocks_legal_and_granted_without_live_adapter_or_interest()
    {
        Assert.False(Phase3Integrity.MayUpgradeENonresident(false, true, "assertion", "VF-1"));
        Assert.False(Phase3Integrity.MayUpgradeENonresident(true, false, "assertion", "VF-1"));
        Assert.False(Phase3Integrity.MayUpgradeENonresident(true, true, "", "VF-1"));
        Assert.False(Phase3Integrity.MayUpgradeENonresident(true, true, "assertion", null));
        Assert.True(Phase3Integrity.MayUpgradeENonresident(true, true, "signed-assertion", "VF-1"));

        Assert.False(Phase3Integrity.MayGrantEResidency(false, EResidencyStatus.PLAN_PENDING));
        Assert.False(Phase3Integrity.MayGrantEResidency(true, EResidencyStatus.NONE));
        Assert.False(Phase3Integrity.MayGrantEResidency(true, EResidencyStatus.GRANTED));
        Assert.True(Phase3Integrity.MayGrantEResidency(true, EResidencyStatus.PLAN_PENDING));
        Assert.True(Phase3Integrity.MayGrantEResidency(true, EResidencyStatus.APPLIED));

        using var empty = JsonDocument.Parse("""{"ubo":"","sourceOfFunds":"","fatcaCrs":"","activity":""}""");
        using var filled = JsonDocument.Parse("""{"ubo":"Alice","sourceOfFunds":"salary"}""");
        Assert.False(Phase3Integrity.HasKycContent(empty.RootElement));
        Assert.True(Phase3Integrity.HasKycContent(filled.RootElement));
    }

    [Fact]
    public void Fin_mask_does_not_echo_the_full_value()
    {
        Assert.Null(FinMask.Mask(null));
        var masked = FinMask.Mask("ABCD1234");
        Assert.NotEqual("ABCD1234", masked);
        Assert.StartsWith("AB", masked);
        Assert.EndsWith("34", masked);
        Assert.DoesNotContain("CD12", masked);
    }

    [Fact]
    public async Task Phase3_stubs_never_report_available()
    {
        var settings = new AppSettings { AsanLoginEnabled = true, ENonresidentEnabled = true, EResidencyEnabled = false };
        Assert.True(settings.AsanLoginEnabled);
        Assert.False(settings.EResidencyEnabled);
        Assert.Equal(EResidencyStatus.NONE, default(EResidencyStatus) == 0 ? EResidencyStatus.NONE : EResidencyStatus.GRANTED);
        Assert.NotEqual(EResidencyStatus.GRANTED, EResidencyStatus.NONE);
        Assert.NotEqual(EResidencyStatus.GRANTED, EResidencyStatus.PLAN_PENDING);
        Assert.NotEqual(EResidencyStatus.GRANTED, EResidencyStatus.APPLIED);

        var eNonresident = new AsanInvest.Infrastructure.Integrations.ENonresidentClientStub(Microsoft.Extensions.Logging.Abstractions.NullLogger<AsanInvest.Infrastructure.Integrations.ENonresidentClientStub>.Instance);
        var visa = new AsanInvest.Infrastructure.Integrations.VisaClientStub(Microsoft.Extensions.Logging.Abstractions.NullLogger<AsanInvest.Infrastructure.Integrations.VisaClientStub>.Instance);
        var customs = new AsanInvest.Infrastructure.Integrations.CustomsClientStub(Microsoft.Extensions.Logging.Abstractions.NullLogger<AsanInvest.Infrastructure.Integrations.CustomsClientStub>.Instance);
        var utilities = new AsanInvest.Infrastructure.Integrations.UtilityClientStub(Microsoft.Extensions.Logging.Abstractions.NullLogger<AsanInvest.Infrastructure.Integrations.UtilityClientStub>.Instance);
        var foreign = new AsanInvest.Infrastructure.Integrations.ForeignEsignClientStub(Microsoft.Extensions.Logging.Abstractions.NullLogger<AsanInvest.Infrastructure.Integrations.ForeignEsignClientStub>.Instance);

        var start = await eNonresident.StartAsync(Guid.NewGuid(), CancellationToken.None);
        var complete = await eNonresident.CompleteAsync(Guid.NewGuid(), "opaque-assertion", CancellationToken.None);
        var visaOut = await visa.SubmitAsync(Guid.NewGuid(), CancellationToken.None);
        var customsOut = await customs.SubmitAsync(Guid.NewGuid(), CancellationToken.None);
        var utilOut = await utilities.SubmitAsync("electricity", Guid.NewGuid(), CancellationToken.None);
        var foreignOut = await foreign.StartAsync("unlisted-issuer", CancellationToken.None);

        Assert.False(start.Available);
        Assert.False(complete.Available);
        Assert.False(visaOut.Available);
        Assert.False(customsOut.Available);
        Assert.False(utilOut.Available);
        Assert.False(foreignOut.Available);
        Assert.Equal("PLANNED", start.Flag);
        Assert.Null(complete.ProviderRef);
        Assert.Null(visaOut.ProviderRef);
        Assert.Equal("visa", Phase3Service.NormalizeCode("asan_viza"));
        Assert.Equal("migration", Phase3Service.NormalizeCode("work_permit"));
    }

    [Fact]
    public void Status_mapping_matches_tz()
    {
        Assert.Equal(InvestorVisibleStatus.DRAFT, StatusMapping.ToInvestorStatus(CaseInternalStatus.DRAFT));
        Assert.Equal(InvestorVisibleStatus.UNDER_CONSIDERATION, StatusMapping.ToInvestorStatus(CaseInternalStatus.REGISTERED));
        Assert.Equal(InvestorVisibleStatus.WAITING_YOUR_RESPONSE, StatusMapping.ToInvestorStatus(CaseInternalStatus.WAITING_ADDITIONAL_INFO));
        Assert.Equal(InvestorVisibleStatus.AT_INSTITUTION, StatusMapping.ToInvestorStatus(CaseInternalStatus.INTER_AGENCY_COORDINATION));
        Assert.Equal(InvestorVisibleStatus.COMPLETED, StatusMapping.ToInvestorStatus(CaseInternalStatus.COMPLETED));
        Assert.Equal(InvestorVisibleStatus.UNDER_CONSIDERATION, StatusMapping.ToInvestorStatus(CaseInternalStatus.UNDER_INVESTIGATION));
        Assert.Equal(InvestorVisibleStatus.UNDER_CONSIDERATION, StatusMapping.ToInvestorStatus(CaseInternalStatus.IN_MEDIATION));
        Assert.Equal(InvestorVisibleStatus.UNDER_CONSIDERATION, StatusMapping.ToInvestorStatus(CaseInternalStatus.OPINION_PREPARED));
        Assert.Equal(InvestorVisibleStatus.RESULT_BEING_PREPARED, StatusMapping.ToInvestorStatus(CaseInternalStatus.OPINION_PENDING_APPROVAL));
        Assert.Equal(InvestorVisibleStatus.UNDER_CONSIDERATION, StatusMapping.ToInvestorStatus(CaseInternalStatus.NEXT_CONTACT_PLANNED));
        Assert.Equal(InvestorVisibleStatus.UNDER_CONSIDERATION, StatusMapping.ToInvestorStatus(CaseInternalStatus.IN_MONITORING));
        Assert.Equal(StatusMapping.StageOpen, StatusMapping.ToStageStatus(false, false, false, null));
        Assert.Equal(StatusMapping.StageWaiting, StatusMapping.ToStageStatus(false, false, true, CaseInternalStatus.WAITING_ADDITIONAL_INFO));
        Assert.Equal(StatusMapping.StageCompleted, StatusMapping.ToStageStatus(false, false, true, CaseInternalStatus.COMPLETED));
        Assert.Equal(StatusMapping.StageProblematic, StatusMapping.ToStageStatus(false, false, true, CaseInternalStatus.REJECTED));
        Assert.Equal(StatusMapping.StageNotApplicable, StatusMapping.ToStageStatus(true, false, false, null));
    }
}
