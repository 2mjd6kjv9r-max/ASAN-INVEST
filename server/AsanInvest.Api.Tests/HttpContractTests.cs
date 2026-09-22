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
        Assert.Equal(1, body.RootElement.GetProperty("data").GetProperty("phase").GetInt32());
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
    public void Status_mapping_matches_tz()
    {
        Assert.Equal(InvestorVisibleStatus.DRAFT, StatusMapping.ToInvestorStatus(CaseInternalStatus.DRAFT));
        Assert.Equal(InvestorVisibleStatus.UNDER_CONSIDERATION, StatusMapping.ToInvestorStatus(CaseInternalStatus.REGISTERED));
        Assert.Equal(InvestorVisibleStatus.WAITING_YOUR_RESPONSE, StatusMapping.ToInvestorStatus(CaseInternalStatus.WAITING_ADDITIONAL_INFO));
        Assert.Equal(InvestorVisibleStatus.AT_INSTITUTION, StatusMapping.ToInvestorStatus(CaseInternalStatus.INTER_AGENCY_COORDINATION));
        Assert.Equal(InvestorVisibleStatus.COMPLETED, StatusMapping.ToInvestorStatus(CaseInternalStatus.COMPLETED));
        Assert.Equal(StatusMapping.StageOpen, StatusMapping.ToStageStatus(false, false, false, null));
        Assert.Equal(StatusMapping.StageWaiting, StatusMapping.ToStageStatus(false, false, true, CaseInternalStatus.WAITING_ADDITIONAL_INFO));
        Assert.Equal(StatusMapping.StageCompleted, StatusMapping.ToStageStatus(false, false, true, CaseInternalStatus.COMPLETED));
        Assert.Equal(StatusMapping.StageProblematic, StatusMapping.ToStageStatus(false, false, true, CaseInternalStatus.REJECTED));
        Assert.Equal(StatusMapping.StageNotApplicable, StatusMapping.ToStageStatus(true, false, false, null));
    }
}
