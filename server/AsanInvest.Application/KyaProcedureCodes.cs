using System.Text.Json;

namespace AsanInvest.Application;

public static class KyaProcedureCodes
{
    public static IReadOnlyList<string> Parse(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            using var doc = JsonDocument.Parse(json);
            return Parse(doc.RootElement);
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static IReadOnlyList<string> Parse(JsonElement root)
    {
        var codes = root;
        if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("procedures", out var inner))
            codes = inner;
        if (codes.ValueKind != JsonValueKind.Array) return [];
        var list = new List<string>();
        foreach (var item in codes.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var value = item.GetString();
                if (!string.IsNullOrWhiteSpace(value)) list.Add(value);
            }
            else if (item.ValueKind == JsonValueKind.Object)
            {
                if ((item.TryGetProperty("code", out var code) || item.TryGetProperty("Code", out code))
                    && code.GetString() is { Length: > 0 } value)
                    list.Add(value);
            }
        }
        return list;
    }
}
