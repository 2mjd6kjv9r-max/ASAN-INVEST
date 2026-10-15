using System.Security.Claims;
using System.Threading.RateLimiting;
using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Domain;
using AsanInvest.Core.Services;
using AsanInvest.Infrastructure;
using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------- konfiqurasiya
string FindRepoRoot()
{
    var dir = new DirectoryInfo(builder.Environment.ContentRootPath);
    while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "seed"))) dir = dir.Parent;
    return dir?.FullName ?? builder.Environment.ContentRootPath;
}

var cfg = builder.Configuration.GetSection("AsanInvest");
var repoRoot = FindRepoRoot();
var seedDir = string.IsNullOrWhiteSpace(cfg["SeedDir"]) ? Path.Combine(repoRoot, "seed") : cfg["SeedDir"]!;
var dataDir = string.IsNullOrWhiteSpace(cfg["DataDir"]) ? Path.Combine(repoRoot, "data") : cfg["DataDir"]!;
var demo = cfg.GetValue<bool>("Demo");

var platform = Platform.Create(dataDir, seedDir);
if (demo) DemoData.SeedIfEmpty(platform);

builder.Services.AddSingleton(platform);
builder.Services.AddSingleton(new WebOptions { Demo = demo });
builder.Services.AddHttpContextAccessor();
builder.Services.AddWebEncoders(o => o.TextEncoderSettings = new System.Text.Encodings.Web.TextEncoderSettings(System.Text.Unicode.UnicodeRanges.All));
builder.Services.AddScoped<Ctx>();
builder.Services.AddHostedService<DeadlineWatcher>();

// ---------------------------------------------------------------- autentifikasiya və icazələr
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.Cookie.Name = "asan.auth";
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        o.ExpireTimeSpan = TimeSpan.FromMinutes(60);
        o.SlidingExpiration = true;
        o.LoginPath = "/Login";
        o.AccessDeniedPath = "/Denied";
        // Rol dəyişəndə və ya istifadəçi bloklananda mövcud sessiya dərhal etibarsız olur.
        o.Events.OnValidatePrincipal = async context =>
        {
            var plat = context.HttpContext.RequestServices.GetRequiredService<Platform>();
            var idText = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            var roleText = context.Principal?.FindFirstValue(ClaimTypes.Role);
            var user = Guid.TryParse(idText, out var id) ? plat.Store.Users.Find(id) : null;
            if (user is null || user.Blocked || user.Role.ToString() != roleText)
            {
                context.RejectPrincipal();
                await context.HttpContext.SignOutAsync();
            }
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("InvestorSide", p => p.RequireRole(nameof(Role.Investor), nameof(Role.Representative)))
    .AddPolicy("CoordinatorSide", p => p.RequireRole(nameof(Role.Coordinator)))
    .AddPolicy("OfficerSide", p => p.RequireRole(nameof(Role.InstitutionOfficer)))
    .AddPolicy("AdminSide", p => p.RequireRole(nameof(Role.Admin)));

builder.Services.AddRazorPages(o =>
{
    o.Conventions.AuthorizeFolder("/");
    o.Conventions.AllowAnonymousToPage("/Login");
    o.Conventions.AllowAnonymousToPage("/Error");
    o.Conventions.AllowAnonymousToPage("/Denied");
    o.Conventions.AuthorizeFolder("/Investor", "InvestorSide");
    o.Conventions.AuthorizeFolder("/Coordinator", "CoordinatorSide");
    o.Conventions.AuthorizeFolder("/Officer", "OfficerSide");
    o.Conventions.AuthorizeFolder("/Admin", "AdminSide");
});

builder.Services.AddAntiforgery(o =>
{
    o.Cookie.Name = "asan.csrf";
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
});

const long MaxUpload = 12L * 1024 * 1024;
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = MaxUpload);
builder.WebHost.ConfigureKestrel(o =>
{
    o.AddServerHeader = false;
    o.Limits.MaxRequestBodySize = MaxUpload;
});

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(o =>
    o.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto);

var app = builder.Build();
app.UseForwardedHeaders(); // TLS-i sonlandıran reverse proxy arxasında (KnownProxies/KnownNetworks istehsalda konfiqurasiya olunmalıdır)

// ---------------------------------------------------------------- pipeline
if (app.Environment.IsDevelopment()) app.UseDeveloperExceptionPage();
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;
    h["X-Content-Type-Options"] = "nosniff";
    h["X-Frame-Options"] = "DENY";
    h["Referrer-Policy"] = "same-origin";
    h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    h["Content-Security-Policy"] =
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
        "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
    if (!ctx.Request.Path.StartsWithSegments("/css") && !ctx.Request.Path.StartsWithSegments("/js"))
        h["Cache-Control"] = "no-store";
    await next();
});

app.UseStaticFiles();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();

app.Run();

/// <summary>Qanuni son tarix bildirişlərini saatda bir yoxlayır (TZ 12.3).</summary>
public sealed class DeadlineWatcher(Platform platform, ILogger<DeadlineWatcher> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { var n = platform.Jobs.ScanDeadlines(); if (n > 0) log.LogInformation("{N} son tarix bildirişi göndərildi", n); }
            catch (Exception e) { log.LogError(e, "Son tarix yoxlaması uğursuz oldu"); }
            try { await Task.Delay(TimeSpan.FromHours(1), stoppingToken); } catch (TaskCanceledException) { }
        }
    }
}
