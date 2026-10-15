using System.Security.Claims;
using AsanInvest.Core.Domain;
using AsanInvest.Infrastructure;

namespace AsanInvest.Web.Infrastructure;

public sealed class WebOptions
{
    public bool Demo { get; init; }
}

/// <summary>Sorğu üzrə cari istifadəçi və iş konteksti.</summary>
public sealed class Ctx(Platform platform, IHttpContextAccessor http, WebOptions options)
{
    public const string JobCookie = "asan.job";

    public Platform P => platform;
    public bool DemoEnabled => options.Demo;
    private User? _user;
    private bool _userLoaded;
    private Job? _job;
    private bool _jobLoaded;

    public User? User
    {
        get
        {
            if (_userLoaded) return _user;
            _userLoaded = true;
            if (Guid.TryParse(http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id))
                _user = platform.Store.Users.Find(id);
            return _user;
        }
    }

    public User Me => User ?? throw new InvalidOperationException("İstifadəçi tapılmadı.");

    /// <summary>İnvestor / nümayəndə üçün cari iş. Nümayəndə bir neçə investoru təmsil edirsə seçim cookie-də saxlanılır və hər dəfə yoxlanılır.</summary>
    public Job? CurrentJob
    {
        get
        {
            if (_jobLoaded) return _job;
            _jobLoaded = true;
            var u = User;
            if (u is null || u.Role is not (Role.Investor or Role.Representative)) return null;
            var jobs = platform.Jobs.JobsOf(u).Where(j => !j.Closed).ToList();
            if (Guid.TryParse(http.HttpContext?.Request.Cookies[JobCookie], out var chosen))
                _job = jobs.FirstOrDefault(j => j.Id == chosen);
            return _job ??= jobs.FirstOrDefault();
        }
    }

    public int Unread => User is null ? 0 : platform.Notifications.UnreadCount(User.Id);

    public string Local(DateTime? utc, bool time = true)
    {
        if (utc is null) return "—";
        var l = platform.Clock.ToLocal(utc.Value);
        return time ? l.ToString("dd.MM.yyyy HH:mm") : l.ToString("dd.MM.yyyy");
    }

    public string DateOnly(DateTime? d) => d is null ? "—" : d.Value.ToString("dd.MM.yyyy");

    public string UserName(Guid id) => platform.Store.Users.Find(id)?.Name ?? "—";
}
