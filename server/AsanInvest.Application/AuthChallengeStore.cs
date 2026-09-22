using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace AsanInvest.Application;

/// <summary>
/// In-process OTP challenges and refresh-token denylist (NFR-02 / FR-AUTH-03).
/// Phase 1 has no Redis; a process restart clears both maps.
/// </summary>
public sealed class AuthChallengeStore
{
    private readonly ConcurrentDictionary<string, (Guid UserId, string Hash, DateTimeOffset Exp)> _otp = new();
    private readonly ConcurrentDictionary<string, DateTimeOffset> _revokedRefresh = new();

    public string IssueOtp(Guid userId, string codeHash, TimeSpan ttl)
    {
        var id = Guid.NewGuid().ToString("D");
        _otp[id] = (userId, codeHash, DateTimeOffset.UtcNow.Add(ttl));
        return id;
    }

    public bool ConsumeOtp(string id, string codeHash, out Guid userId)
    {
        userId = Guid.Empty;
        if (string.IsNullOrWhiteSpace(id) || !_otp.TryRemove(id, out var row)) return false;
        if (row.Exp < DateTimeOffset.UtcNow) return false;
        var left = Encoding.UTF8.GetBytes(row.Hash);
        var right = Encoding.UTF8.GetBytes(codeHash);
        if (left.Length != right.Length || !CryptographicOperations.FixedTimeEquals(left, right)) return false;
        userId = row.UserId;
        return true;
    }

    public void RevokeRefresh(string jti, DateTimeOffset exp)
    {
        if (string.IsNullOrWhiteSpace(jti)) return;
        _revokedRefresh[jti] = exp;
    }

    public bool IsRefreshRevoked(string jti)
    {
        if (string.IsNullOrWhiteSpace(jti)) return false;
        if (!_revokedRefresh.TryGetValue(jti, out var exp)) return false;
        if (exp < DateTimeOffset.UtcNow)
        {
            _revokedRefresh.TryRemove(jti, out _);
            return false;
        }
        return true;
    }
}
