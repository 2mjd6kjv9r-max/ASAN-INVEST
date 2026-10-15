namespace AsanInvest.Tests;

/// <summary>Xarici paketsiz minimal test çərçivəsi (NuGet olmayan mühitdə də işləyir): dotnet run --project tests/AsanInvest.Tests</summary>
public static class Mini
{
    private static readonly List<(string Name, Action Body)> Tests = new();
    public static void Test(string name, Action body) => Tests.Add((name, body));

    public static int Run(string? filter = null)
    {
        int pass = 0, fail = 0;
        foreach (var (name, body) in Tests.Where(t => filter is null || t.Name.Contains(filter, StringComparison.OrdinalIgnoreCase)))
        {
            try { body(); pass++; Console.WriteLine($"  ok    {name}"); }
            catch (Exception e)
            {
                fail++;
                Console.WriteLine($"  FAIL  {name}\n        {e.GetType().Name}: {e.Message.Replace("\n", "\n        ")}");
            }
        }
        Console.WriteLine($"\n{pass} keçdi, {fail} uğursuz");
        return fail == 0 ? 0 : 1;
    }

    public static void True(bool cond, string message = "şərt ödənmədi")
    {
        if (!cond) throw new Exception(message);
    }

    public static void Equal<T>(T expected, T actual, string? what = null)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
            throw new Exception($"{what ?? "dəyər"}: gözlənilən «{expected}», alınan «{actual}»");
    }

    public static void Throws<TEx>(Action body, string? contains = null) where TEx : Exception
    {
        try { body(); }
        catch (TEx e)
        {
            if (contains is not null && !e.Message.Contains(contains))
                throw new Exception($"Xəta mətni «{contains}» ehtiva etmir: «{e.Message}»");
            return;
        }
        throw new Exception($"{typeof(TEx).Name} gözlənilirdi, amma xəta atılmadı");
    }
}
