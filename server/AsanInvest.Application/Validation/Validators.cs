using FluentValidation;

namespace AsanInvest.Application.Validation;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(10).WithMessage("Password must be at least 10 characters")
            .MaximumLength(128)
            .Matches("[A-Za-z]").WithMessage("Password must include a letter")
            .Matches(@"\d").WithMessage("Password must include a number");
        RuleFor(x => x.Locale).Must(l => l is null or "az" or "en" or "ru" or "tr" or "ar")
            .WithMessage("Locale must be az, en, ru, tr or ar");
    }
}

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MaximumLength(128);
    }
}

public sealed class TwoFactorRequestValidator : AbstractValidator<TwoFactorRequest>
{
    public TwoFactorRequestValidator()
    {
        RuleFor(x => x.ChallengeId).NotEmpty().MinimumLength(20);
        RuleFor(x => x.Code).NotEmpty().Length(6);
    }
}

public sealed class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator() => RuleFor(x => x.Email).NotEmpty().EmailAddress();
}

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty().MinimumLength(20);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(10).MaximumLength(128).Matches("[A-Za-z]").Matches(@"\d");
    }
}

public sealed class VerifyEmailRequestValidator : AbstractValidator<VerifyEmailRequest>
{
    public VerifyEmailRequestValidator() => RuleFor(x => x.Token).NotEmpty().MinimumLength(6);
}

public sealed class RouteRequestValidator : AbstractValidator<RouteRequest>
{
    public RouteRequestValidator()
    {
        RuleFor(x => x.Country).NotEmpty();
        RuleFor(x => x.Sector).NotEmpty();
        RuleFor(x => x.VolumeAmount).NotEmpty().Matches(@"^\d+(\.\d{1,2})?$");
        RuleFor(x => x.VolumeCurrency).NotEmpty().Must(c => c is "AZN" or "USD" or "EUR");
        RuleFor(x => x.Territory).NotEmpty();
    }
}

public sealed class IncentiveRequestValidator : AbstractValidator<IncentiveRequest>
{
    public IncentiveRequestValidator()
    {
        RuleFor(x => x.Sector).NotEmpty();
        RuleFor(x => x.VolumeAmount).NotEmpty().Matches(@"^\d+(\.\d{1,2})?$");
        RuleFor(x => x.VolumeCurrency).NotEmpty().Must(c => c is "AZN" or "USD" or "EUR");
        RuleFor(x => x.Territory).NotEmpty();
    }
}

public sealed class KyaRequestValidator : AbstractValidator<KyaRequest>
{
    public KyaRequestValidator()
    {
        RuleFor(x => x.Sector).NotEmpty();
        RuleFor(x => x.Territory).NotEmpty();
        RuleFor(x => x.VolumeAmount).NotEmpty().Matches(@"^\d+(\.\d{1,2})?$");
        RuleFor(x => x.VolumeCurrency).NotEmpty().Must(c => c is "AZN" or "USD" or "EUR");
        RuleFor(x => x.Description).MaximumLength(4000);
    }
}

public sealed class WithdrawRequestValidator : AbstractValidator<WithdrawRequest>
{
    public WithdrawRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MinimumLength(3).MaximumLength(500);
}

public sealed class ComplaintRequestValidator : AbstractValidator<ComplaintRequest>
{
    public ComplaintRequestValidator() => RuleFor(x => x.Description).NotEmpty().MinimumLength(10);
}

public sealed class AdminUserCreateRequestValidator : AbstractValidator<AdminUserCreateRequest>
{
    public AdminUserCreateRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(10);
        RuleFor(x => x.Roles).NotEmpty();
    }
}

public sealed class BankSubmissionsRequestValidator : AbstractValidator<BankSubmissionsRequest>
{
    public BankSubmissionsRequestValidator()
    {
        RuleFor(x => x.BankInstitutionIds).NotNull().NotEmpty();
        RuleFor(x => x.BankInstitutionIds).Must(ids => ids.Count <= 2)
            .WithMessage("The bank pilot accepts at most two institutions");
    }
}

public sealed class BankDecisionRequestValidator : AbstractValidator<BankDecisionRequest>
{
    public BankDecisionRequestValidator()
    {
        RuleFor(x => x.Outcome).NotEmpty().Must(o => o is "OPENED" or "EXTRA_INFO" or "REFUSED")
            .WithMessage("Outcome must be OPENED, EXTRA_INFO or REFUSED");
    }
}

public sealed class MediationNotesRequestValidator : AbstractValidator<MediationNotesRequest>
{
    public MediationNotesRequestValidator() => RuleFor(x => x.Body).NotEmpty().MinimumLength(3).MaximumLength(8000);
}

public sealed class CaseOpinionRequestValidator : AbstractValidator<CaseOpinionRequest>
{
    public CaseOpinionRequestValidator() => RuleFor(x => x.Opinion).NotEmpty().MinimumLength(10).MaximumLength(8000);
}

public sealed class SystemicProblemCreateRequestValidator : AbstractValidator<SystemicProblemCreateRequest>
{
    public SystemicProblemCreateRequestValidator()
    {
        RuleFor(x => x.Category).NotEmpty().MaximumLength(200);
        RuleFor(x => x.InstitutionId).NotEmpty();
        RuleFor(x => x.Cause).NotEmpty().MaximumLength(4000);
    }
}

public sealed class NextContactRequestValidator : AbstractValidator<NextContactRequest>
{
    public NextContactRequestValidator()
    {
        RuleFor(x => x.Purpose).NotEmpty().MaximumLength(500);
        RuleFor(x => x.At).NotEmpty();
    }
}

public sealed class PaymentCreateRequestValidator : AbstractValidator<PaymentCreateRequest>
{
    public PaymentCreateRequestValidator()
    {
        RuleFor(x => x.Amount).NotEmpty().Matches(@"^\d+(\.\d{1,2})?$");
        RuleFor(x => x.Currency).NotEmpty().Must(c => c is "AZN" or "USD" or "EUR");
        RuleFor(x => x.Kind).IsInEnum();
    }
}

public sealed class PartnerCreateRequestValidator : AbstractValidator<PartnerCreateRequest>
{
    public PartnerCreateRequestValidator()
    {
        RuleFor(x => x.ServiceKind).NotEmpty().MaximumLength(120);
        RuleFor(x => x.PriceAmount).NotEmpty().Matches(@"^\d+(\.\d{1,2})?$");
        RuleFor(x => x.PriceCurrency).NotEmpty().Must(c => c is "AZN" or "USD" or "EUR");
    }
}

public sealed class FeeCreateRequestValidator : AbstractValidator<FeeCreateRequest>
{
    public FeeCreateRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Amount).NotEmpty().Matches(@"^\d+(\.\d{1,2})?$");
        RuleFor(x => x.Currency).NotEmpty().Must(c => c is "AZN" or "USD" or "EUR");
    }
}

public sealed class PartnerBindRequestValidator : AbstractValidator<PartnerBindRequest>
{
    public PartnerBindRequestValidator() => RuleFor(x => x.PartnerId).NotEmpty();
}
