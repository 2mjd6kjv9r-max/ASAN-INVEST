using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AsanInvest.Domain;
using Microsoft.IdentityModel.Tokens;

namespace AsanInvest.Application;

public static class Tokens
{
    public static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string SignAccess(AppSettings settings, Guid userId, string email, IEnumerable<UserRole> roles, IdentificationLevel level)
    {
        var claims = new List<Claim>
        {
            new("sub", userId.ToString()),
            new("email", email),
            new("typ", "access"),
            new("identificationLevel", level.ToString()),
        };
        claims.AddRange(roles.Select(r => new Claim("roles", r.ToString())));
        return Sign(settings.JwtAccessSecret, claims, ParseDuration(settings.JwtAccessExpiresIn));
    }

    public static string SignRefresh(AppSettings settings, Guid userId) =>
        Sign(settings.JwtRefreshSecret, [new("sub", userId.ToString()), new("typ", "refresh")], ParseDuration(settings.JwtRefreshExpiresIn));

    public static string SignPurpose(AppSettings settings, Guid userId, string typ, string? codeHash = null, string lifetime = "10m")
    {
        var claims = new List<Claim> { new("sub", userId.ToString()), new("typ", typ) };
        if (codeHash is not null) claims.Add(new Claim("codeHash", codeHash));
        return Sign(settings.JwtAccessSecret, claims, ParseDuration(lifetime));
    }

    public static JwtSecurityToken Require(string token, string secret, string typ)
    {
        var handler = new JwtSecurityTokenHandler();
        handler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ClockSkew = TimeSpan.FromSeconds(30),
        }, out var validated);
        var jwt = (JwtSecurityToken)validated;
        if (jwt.Payload.TryGetValue("typ", out var t) && t?.ToString() != typ)
            throw new SecurityTokenException("Invalid token type");
        return jwt;
    }

    public static TimeSpan ParseDuration(string duration)
    {
        if (duration.Length < 2) throw new InvalidOperationException($"Unsupported duration: {duration}");
        var unit = duration[^1];
        var value = int.Parse(duration[..^1]);
        return unit switch
        {
            's' => TimeSpan.FromSeconds(value),
            'm' => TimeSpan.FromMinutes(value),
            'h' => TimeSpan.FromHours(value),
            'd' => TimeSpan.FromDays(value),
            _ => throw new InvalidOperationException($"Unsupported duration: {duration}"),
        };
    }

    private static string Sign(string secret, IEnumerable<Claim> claims, TimeSpan lifetime)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.Add(lifetime), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
