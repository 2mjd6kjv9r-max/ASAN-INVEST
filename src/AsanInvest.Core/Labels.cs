using AsanInvest.Core.Domain;

namespace AsanInvest.Core;

/// <summary>İstifadəçiyə görünən Azərbaycan dilində etiketlər (EN/RU üçün sonradan tərcümə faylına çıxarılacaq).</summary>
public static class Labels
{
    public static string Of(this StageStatus s) => s switch
    {
        StageStatus.NotStarted => "Başlanmayıb",
        StageStatus.InProgress => "İcra olunur",
        StageStatus.AtInstitution => "Qurumda",
        StageStatus.NeedsAttention => "Diqqət tələb edir",
        StageStatus.Completed => "Tamamlandı",
        StageStatus.NotOnPath => "Bu yolda keçilmir",
        StageStatus.NotApplicable => "Tətbiq edilmir",
        StageStatus.NotAdded => "Əlavə edilməyib",
        _ => s.ToString()
    };

    public static string Of(this RequestStatus s) => s switch
    {
        RequestStatus.Draft => "Qaralama",
        RequestStatus.Sent => "Göndərildi",
        RequestStatus.UnderReview => "Baxılır",
        RequestStatus.MoreDocsRequired => "Əlavə sənəd tələb olunur",
        RequestStatus.Approved => "Təsdiqləndi",
        RequestStatus.Rejected => "İmtina",
        _ => s.ToString()
    };

    public static string Of(this StageKind k) => k switch
    {
        StageKind.Mandatory => "Məcburi",
        StageKind.Conditional => "Şərti",
        StageKind.Voluntary => "Könüllü",
        _ => k.ToString()
    };

    public static string Of(this Role r) => r switch
    {
        Role.Investor => "İnvestor",
        Role.Representative => "Nümayəndə",
        Role.Coordinator => "Koordinator",
        Role.InstitutionOfficer => "Qurum əməkdaşı",
        Role.Admin => "Admin",
        _ => r.ToString()
    };

    public static string Of(this InstitutionChannel c) => c switch
    {
        InstitutionChannel.Electronic => "Elektron",
        InstitutionChannel.Paper => "Kağız",
        InstitutionChannel.Both => "Elektron + kağız",
        _ => "Göstərilməyib"
    };

    public static string Of(this RequestChannel c) => c == RequestChannel.Paper ? "Kağız" : "Elektron";

    public static string Of(this ForeignDocStatus s) => s switch
    {
        ForeignDocStatus.Uploaded => "Yükləndi",
        ForeignDocStatus.ApostilleConfirmed => "Apostil təsdiqləndi",
        ForeignDocStatus.TranslationConfirmed => "Tərcümə notarial təsdiqləndi",
        _ => "—"
    };

    public static string Of(this ReviewStatus s) => s switch
    {
        ReviewStatus.Accepted => "Qəbul edildi",
        ReviewStatus.ChangesRequested => "Düzəliş tələb olunur",
        _ => "Yoxlanılır"
    };

    public static string Of(this EntryPath p) => p switch
    {
        EntryPath.Share => "Pay alınması",
        EntryPath.Capital => "Kapital artımı",
        _ => ""
    };

    /// <summary>Status rəngi üçün CSS sinfi (rəng yalnız status və qurumu kodlaşdırır).</summary>
    public static string Css(this StageStatus s) => s switch
    {
        StageStatus.Completed => "ok",
        StageStatus.NeedsAttention => "bad",
        StageStatus.AtInstitution => "info",
        StageStatus.InProgress => "warn",
        _ => "mute"
    };

    public static string Css(this RequestStatus s) => s switch
    {
        RequestStatus.Approved => "ok",
        RequestStatus.Rejected => "bad",
        RequestStatus.MoreDocsRequired => "warn",
        RequestStatus.Sent or RequestStatus.UnderReview => "info",
        _ => "mute"
    };
}
