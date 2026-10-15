using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Services;

/// <summary>Admin parametrləri (TZ 8.8): fayl ölçüsü limiti, qurum cavab normu və s.</summary>
public sealed class SettingsService(IDataStore store)
{
    public const string MaxFileMb = "MaxFileMb";
    public const string ResponseNormDays = "ResponseNormDays";

    private static readonly Dictionary<string, string> Defaults = new()
    {
        [MaxFileMb] = "10",
        [ResponseNormDays] = "5"
    };

    public string Get(string key) =>
        store.Settings.All().FirstOrDefault(s => s.Key == key)?.Value ?? Defaults.GetValueOrDefault(key, "");

    public int GetInt(string key) => int.TryParse(Get(key), out var v) ? v : int.Parse(Defaults[key]);

    public void Set(string key, string value)
    {
        var s = store.Settings.All().FirstOrDefault(x => x.Key == key) ?? new AppSetting { Key = key };
        s.Value = value;
        store.Settings.Upsert(s);
    }
}
