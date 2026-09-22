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
