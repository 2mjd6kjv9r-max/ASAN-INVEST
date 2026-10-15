using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Engine;

public sealed record TransitionResult(bool Ok, string? Error = null)
{
    public static TransitionResult Success { get; } = new(true);
    public static TransitionResult Fail(string error) => new(false, error);
}

/// <summary>Qurum sorğusunun status maşını (TZ 12.1). «Yenidən göndərildi» ayrıca status deyil: Göndərildi + ResubmissionCount.</summary>
public static class RequestStateMachine
{
    public static TransitionResult CanTransition(RequestStatus from, RequestStatus to, Role actor, string? reason)
    {
        bool needsReason = to is RequestStatus.MoreDocsRequired or RequestStatus.Rejected;
        if (needsReason && string.IsNullOrWhiteSpace(reason))
            return TransitionResult.Fail("Səbəb göstərilməlidir.");

        return (from, to) switch
        {
            (RequestStatus.Draft, RequestStatus.Sent) when actor == Role.Coordinator => TransitionResult.Success,
            (RequestStatus.Sent, RequestStatus.UnderReview) when actor == Role.InstitutionOfficer => TransitionResult.Success,
            (RequestStatus.Sent or RequestStatus.UnderReview,
                RequestStatus.Approved or RequestStatus.MoreDocsRequired or RequestStatus.Rejected)
                when actor == Role.InstitutionOfficer => TransitionResult.Success,
            (RequestStatus.MoreDocsRequired, RequestStatus.Sent)
                when actor is Role.Investor or Role.Representative or Role.Coordinator => TransitionResult.Success,
            _ => TransitionResult.Fail($"«{from.Of()}» statusundan «{to.Of()}» statusuna keçid {actor.Of()} üçün mümkün deyil.")
        };
    }

    public static bool IsOpen(RequestStatus s) => s is RequestStatus.Sent or RequestStatus.UnderReview or RequestStatus.MoreDocsRequired;
}
