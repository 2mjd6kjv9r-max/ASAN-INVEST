using System.Text.RegularExpressions;
using AsanInvest.Core.Abstractions;

namespace AsanInvest.Infrastructure;

/// <summary>Fayllar wwwroot-dan kənarda, təsadüfi adlarla saxlanılır; yalnız icazəli endpoint vasitəsilə verilir.</summary>
public sealed partial class LocalFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalFileStorage(string root)
    {
        _root = Path.GetFullPath(root);
        Directory.CreateDirectory(_root);
    }

    [GeneratedRegex(@"^[0-9a-f]{32}\.(pdf|jpg|jpeg|png)$")]
    private static partial Regex ValidName();

    public string Save(Stream content, string extension)
    {
        var ext = extension.ToLowerInvariant();
        var name = Guid.NewGuid().ToString("N") + ext;
        if (!ValidName().IsMatch(name)) throw new InvalidOperationException("Yanlış fayl uzantısı.");
        using var fs = new FileStream(Resolve(name), FileMode.CreateNew, FileAccess.Write, FileShare.None);
        content.CopyTo(fs);
        return name;
    }

    public Stream Open(string storedName) =>
        new FileStream(Resolve(storedName), FileMode.Open, FileAccess.Read, FileShare.Read);

    public void Delete(string storedName)
    {
        var p = Resolve(storedName);
        if (File.Exists(p)) File.Delete(p);
    }

    private string Resolve(string storedName)
    {
        if (!ValidName().IsMatch(storedName)) throw new InvalidOperationException("Yanlış fayl adı.");
        var full = Path.GetFullPath(Path.Combine(_root, storedName));
        if (!full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new InvalidOperationException("Yanlış fayl yolu.");
        return full;
    }
}
