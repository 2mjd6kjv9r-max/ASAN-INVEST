using AsanInvest.Core.Domain;
using AsanInvest.Core.Services;

namespace AsanInvest.Infrastructure;

/// <summary>E-poçt və SMS göndərişi hələ qoşulmayıb: mesajlar yalnız data/outbox.log faylına yazılır (simulyasiya).</summary>
public sealed class FileOutbox(string path) : IOutbox
{
    private readonly object _lock = new();

    public void Enqueue(User recipient, string channel, string ev, string text)
    {
        var line = $"{DateTime.UtcNow:O}\t[{channel}]\t{recipient.Name}\t{ev.Split(':')[0]}\t{text.Replace('\n', ' ')}";
        lock (_lock)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
            File.AppendAllText(path, line + Environment.NewLine);
        }
    }
}
