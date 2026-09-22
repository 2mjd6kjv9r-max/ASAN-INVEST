namespace AsanInvest.Domain.Rules;

public sealed record RouteInput(
    string Country,
    string Sector,
    string VolumeAmount,
    string VolumeCurrency,
    string Territory,
    bool? HasESignature,
    string? NationalityType);

public sealed record RouteOutput(
    bool Estimated,
    string RegistrationRoute,
    string LegalForm,
    string Legalization,
    string VisaNote,
    bool ResidenceBasis,
    int EstimatedWorkingDays,
    int PhysicalContactsInAzerbaijan,
    IReadOnlyList<FeeLine> StateFees,
    IReadOnlyList<FeeLine> PartnerFees,
    PoliteStop? PoliteStop);

public sealed record FeeLine(string Label, string Amount, string Currency);

public sealed record PoliteStop(string Code, string Message);

public static class RouteCalculator
{
    public static RouteOutput Evaluate(RouteInput input)
    {
        var country = input.Country.ToUpperInvariant();
        if (country is "XX")
        {
            return new RouteOutput(
                Estimated: true,
                RegistrationRoute: "D",
                LegalForm: "MMC",
                Legalization: "consular",
                VisaNote: "This route needs a manual compliance review before we can give a registration estimate.",
                ResidenceBasis: false,
                EstimatedWorkingDays: 0,
                PhysicalContactsInAzerbaijan: 0,
                StateFees: [],
                PartnerFees: [],
                PoliteStop: new PoliteStop("SANCTIONS_REVIEW", "This route needs a manual compliance review before we can give a registration estimate."));
        }
        var resident = input.NationalityType == "resident" || country == "AZ";
        var registration = resident && input.HasESignature == true ? "A"
            : resident ? "B"
            : input.HasESignature == true ? "C"
            : "D";
        var legalization = resident ? "not_required" : country is "DE" or "TR" or "FR" or "IT" or "NL" or "GB" ? "apostille" : "consular";
        var azn = ToAzn(input.VolumeAmount, input.VolumeCurrency);
        return new RouteOutput(
            Estimated: true,
            RegistrationRoute: registration,
            LegalForm: "MMC",
            Legalization: legalization,
            VisaNote: resident ? "Residence in Azerbaijan." : "Visa / invitation may be required.",
            ResidenceBasis: azn >= 500_000m,
            EstimatedWorkingDays: registration == "A" ? 5 : 15,
            PhysicalContactsInAzerbaijan: registration == "D" ? 2 : 0,
            StateFees: [new FeeLine("State fee (estimate)", "40.00", "AZN")],
            PartnerFees: [],
            PoliteStop: null);
    }

    public static decimal ToAzn(string amount, string currency)
    {
        var value = decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture);
        return currency switch
        {
            "USD" => value * 1.70m,
            "EUR" => value * 1.85m,
            _ => value,
        };
    }
}

public sealed record IncentiveInput(
    string Sector,
    string? Activity,
    string VolumeAmount,
    string VolumeCurrency,
    string Territory,
    bool? InAgropark,
    bool? InIndustrialPark);

public sealed record IncentiveOutput(
    string Outcome,
    string ExplanationAz,
    string ExplanationEn,
    string LegalCitation,
    string? EstimatedSavingNote,
    IReadOnlyList<string> Alternatives);

public static class IncentiveCalculator
{
    public const string LegalAct = "Presidential Decree No. 689 of 19.06.2026 (criteria stored as rules, FR-INC-02)";

    public static IncentiveOutput Evaluate(IncentiveInput input)
    {
        var azn = RouteCalculator.ToAzn(input.VolumeAmount, input.VolumeCurrency);
        var strategic = input.Sector is "chemicals" or "energy" or "agri-processing";
        var processing = input.Activity is "food-packaging" or "processing";
        var enough = azn >= 500_000m;
        var inZone = input.InAgropark == true || input.InIndustrialPark == true;
        if (strategic && enough && (inZone || !processing))
        {
            return new IncentiveOutput("eligible", "Layihə qüvvədə olan meyarlara uyğundur.",
                "The project meets the current incentive criteria.", LegalAct,
                "Approximate 7-year saving is informational, not a guaranteed yield.", []);
        }
        if (processing && input.InAgropark != true)
        {
            return new IncentiveOutput("conditionally_eligible",
                "Emal layihəsi aqroparkda həyata keçirildikdə strateji istiqamətə düşür.",
                "A processing project becomes strategic when carried out in an agropark.", LegalAct, null,
                ["Move the site to an agropark", "Raise volume to 500000.00 AZN"]);
        }
        if (!enough)
        {
            return new IncentiveOutput("conditionally_eligible",
                "Məbləği 500000.00 AZN-ə çatdırdıqda uyğun ola bilərsiniz.",
                "You may become eligible if the volume reaches 500000.00 AZN.", LegalAct, null,
                ["Increase volume to 500000.00 AZN"]);
        }
        return new IncentiveOutput("not_eligible",
            "Bu parametrlərlə investisiya təşviqi sənədinə uyğun deyil. Alternativ rejimlərə baxın.",
            "These parameters are not eligible for the investment promotion certificate. Review alternative regimes.",
            LegalAct, null, []);
    }
}

public sealed record KyaInput(
    string Sector,
    string Territory,
    string VolumeAmount,
    string VolumeCurrency,
    int? ForeignWorkers,
    string? Description,
    bool ConfirmedParameters);

public sealed record ProcedureMatch(string Code, string Reason, string RuleVersion);

public static class KyaCalculator
{
    public static IReadOnlyList<ProcedureMatch> Evaluate(IReadOnlyList<string> alwaysCodes, string ruleVersion, bool confirmed)
    {
        if (!confirmed)
            throw new InvalidOperationException("Unconfirmed parameters must not reach the rule engine");
        return alwaysCodes.Select(code => new ProcedureMatch(code, "Required for every project in this rule version", ruleVersion)).ToList();
    }

    public static ProjectSizeCategory SizeCategory(string volumeAmount, string volumeCurrency) =>
        RouteCalculator.ToAzn(volumeAmount, volumeCurrency) >= 5_000_000m
            ? ProjectSizeCategory.LARGE
            : ProjectSizeCategory.SMALL;
}
