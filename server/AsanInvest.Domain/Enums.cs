namespace AsanInvest.Domain;

public enum IdentificationLevel { BASIC, LEGAL }

public enum Flag { AUTO, ONLINE, PHYSICAL, PLANNED }

public enum ProjectStatus { PREPARATION, EXECUTION, OPERATION, SUSPENDED, CLOSED }

public enum CaseInternalStatus
{
    DRAFT,
    SUBMITTED,
    REGISTERED,
    IN_EVALUATION,
    WAITING_ADDITIONAL_INFO,
    ASSIGNED_FOR_EXECUTION,
    UNDER_REVIEW,
    INTER_AGENCY_COORDINATION,
    RESULT_BEING_PREPARED,
    COMPLETED,
    REJECTED,
    WITHDRAWN,
    ARCHIVED,
    /// TZ §14.2 Ombudsman
    UNDER_INVESTIGATION,
    IN_MEDIATION,
    OPINION_PREPARED,
    OPINION_PENDING_APPROVAL,
    /// TZ §14.2 Aftercare
    NEXT_CONTACT_PLANNED,
    IN_MONITORING,
}

public enum InvestorVisibleStatus
{
    DRAFT,
    SUBMITTED,
    UNDER_CONSIDERATION,
    WAITING_YOUR_RESPONSE,
    AT_INSTITUTION,
    RESULT_BEING_PREPARED,
    COMPLETED,
    REJECTED,
    WITHDRAWN,
    ARCHIVED,
}

public enum RepresentationAuthority { VIEW, PREPARE, SIGN }

public enum DocumentSource { UPLOADED, GENERATED }

public enum NotificationChannel { PORTAL, EMAIL, SMS }

public enum RuleSetKind
{
    KYA,
    INCENTIVE,
    RISK,
    ROUTE,
    FLAG,
    CASE_ASSIGNMENT,
    SIZE_THRESHOLD,
    INACTIVITY_THRESHOLD,
}

public enum UserRole
{
    INVESTOR,
    CASE_MANAGER,
    SUPERVISOR,
    INSTITUTION_REP,
    EVALUATOR,
    OMBUDSMAN_OFFICER,
    CONTENT_MANAGER,
    ANALYST,
    SYSADMIN,
}

public enum UserStatus { ACTIVE, DISABLED }

public enum AuthProvider { EMAIL, ASAN_LOGIN }

public enum ProjectSizeCategory { SMALL, LARGE }

public enum WorkflowKind { STANDARD, OMBUDSMAN, AFTERCARE }

public enum PaymentStatus { INITIATED, SUCCEEDED, FAILED, REFUNDED, EXTERNAL }

/// FR-OMB-07
public enum ReformStatus { IDENTIFIED, PROPOSED, ACCEPTED, IMPLEMENTED }

/// FR-ADM-10 / FR-PAY-02
public enum AccreditationStatus { PENDING, ACTIVE, SUSPENDED, REVOKED }

public enum Currency { AZN, USD, EUR }

public enum ClassificationKind
{
    SECTOR,
    ACTIVITY,
    REGION,
    COUNTRY,
    ZONE_PARK,
    INSTITUTION,
    DOCUMENT_TYPE,
}

public enum CmsStatus { DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED }

public enum PaymentKind { STATE_FEE, PARTNER_SERVICE }

public enum ApplicationSource { PASSPORT_STAGE, OPPORTUNITY_CARD, NEW_APPLICATION }

public enum DocumentLinkObject { PROFILE, PROJECT, APPLICATION }
