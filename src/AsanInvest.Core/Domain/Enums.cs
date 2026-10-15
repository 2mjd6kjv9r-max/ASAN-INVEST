namespace AsanInvest.Core.Domain;

public enum Role { Investor, Representative, Coordinator, InstitutionOfficer, Admin }

public enum InvestorKind { Legal, Natural }

public enum Residency { Resident, NonResident }

public enum ProjectKind { New, Existing }

public enum EntryPath { None, Share, Capital }

public enum StageKind { Mandatory, Conditional, Voluntary }

public enum StagePath { All, Share, Capital, Asc }

public enum StageStatus
{
    NotStarted,
    InProgress,
    AtInstitution,
    NeedsAttention,
    Completed,
    /// <summary>Seçilmiş yola aid deyil (sabit, boz).</summary>
    NotOnPath,
    /// <summary>Şərti sual «Xeyr» və ya alternativ seçilməyib (dəyişdirilə bilər, boz).</summary>
    NotApplicable,
    /// <summary>Könüllü mərhələ hələ əlavə edilməyib.</summary>
    NotAdded
}

public enum RequestStatus { Draft, Sent, UnderReview, MoreDocsRequired, Approved, Rejected }

public enum RequestChannel { Electronic, Paper }

public enum InstitutionChannel { Unknown, Electronic, Paper, Both }

public enum ReviewStatus { Pending, Accepted, ChangesRequested }

/// <summary>Xarici sənəd üçün ardıcıl statuslar: Yükləndi → Apostil təsdiqləndi → Tərcümə notarial təsdiqləndi.</summary>
public enum ForeignDocStatus { NotForeign, Uploaded, ApostilleConfirmed, TranslationConfirmed }

public enum DeadlineSeverity { None, Normal, Warning, Overdue }

public enum EsignStatus { Unknown, Has, None }
