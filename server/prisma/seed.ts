import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe_Investor_123", 12);
  const adminHash = await bcrypt.hash("ChangeMe_Admin_123", 12);
  const operatorHash = await bcrypt.hash("ChangeMe_Operator_123", 12);

  const energy = await prisma.sector.upsert({
    where: { slug: "energy" },
    update: {},
    create: { slug: "energy", nameAz: "Enerji", nameEn: "Energy" },
  });
  const transport = await prisma.sector.upsert({
    where: { slug: "transport" },
    update: {},
    create: { slug: "transport", nameAz: "Nəqliyyat", nameEn: "Transport" },
  });
  const agriculture = await prisma.sector.upsert({
    where: { slug: "agriculture" },
    update: {},
    create: { slug: "agriculture", nameAz: "Kənd təsərrüfatı", nameEn: "Agriculture" },
  });
  const tourism = await prisma.sector.upsert({
    where: { slug: "tourism" },
    update: {},
    create: { slug: "tourism", nameAz: "Turizm", nameEn: "Tourism" },
  });
  const digital = await prisma.sector.upsert({
    where: { slug: "digital" },
    update: {},
    create: { slug: "digital", nameAz: "Rəqəmsal infrastruktur", nameEn: "Digital infrastructure" },
  });

  const economy = await prisma.agency.upsert({
    where: { slug: "ministry-of-economy" },
    update: {},
    create: {
      slug: "ministry-of-economy",
      nameAz: "İqtisadiyyat Nazirliyi (demo)",
      nameEn: "Ministry of Economy (demo)",
    },
  });
  const energyAgency = await prisma.agency.upsert({
    where: { slug: "ministry-of-energy" },
    update: {},
    create: {
      slug: "ministry-of-energy",
      nameAz: "Energetika Nazirliyi (demo)",
      nameEn: "Ministry of Energy (demo)",
    },
  });
  const sia = await prisma.agency.upsert({
    where: { slug: "state-investment-agency" },
    update: {},
    create: {
      slug: "state-investment-agency",
      nameAz: "Dövlət İnvestisiya Agentliyi (demo)",
      nameEn: "State Investment Agency (demo)",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@asaninvest.demo" },
    update: {},
    create: {
      email: "admin@asaninvest.demo",
      passwordHash: adminHash,
      role: "admin",
      status: "active",
      nationalityType: "azerbaijani_citizen",
      preferredLocale: "az",
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: "Leyla", lastName: "Mammadova", countryOfCitizenship: "AZ" },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "operator@asaninvest.demo" },
    update: {},
    create: {
      email: "operator@asaninvest.demo",
      passwordHash: operatorHash,
      role: "operator",
      status: "active",
      nationalityType: "azerbaijani_citizen",
      preferredLocale: "az",
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: "Rashad", lastName: "Aliyev", countryOfCitizenship: "AZ" },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "investor.az@asaninvest.demo" },
    update: {},
    create: {
      email: "investor.az@asaninvest.demo",
      passwordHash,
      role: "investor",
      status: "active",
      nationalityType: "azerbaijani_citizen",
      preferredLocale: "az",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: "Aysel",
          lastName: "Huseynova",
          patronymic: "Elchin qızı",
          dateOfBirth: new Date("1992-04-18"),
          countryOfCitizenship: "AZ",
          fin: "1ABC234",
          phone: "+994501112233",
          city: "Bakı",
          country: "Azerbaijan",
          kycStatus: "approved",
          kycReviewedAt: new Date(),
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "investor.foreign@asaninvest.demo" },
    update: {},
    create: {
      email: "investor.foreign@asaninvest.demo",
      passwordHash,
      role: "investor",
      status: "active",
      nationalityType: "foreign_citizen",
      preferredLocale: "en",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: "Daniel",
          lastName: "Okeke",
          dateOfBirth: new Date("1988-11-02"),
          countryOfCitizenship: "NG",
          passportNumber: "A00998877",
          phone: "+12025550123",
          city: "London",
          country: "United Kingdom",
          kycStatus: "pending",
        },
      },
    },
  });

  const now = new Date();
  const starts = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const ends = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const projects = [
    {
      slug: "karabakh-renewable-park",
      titleAz: "Qarabağ bərpa olunan enerji parkı",
      titleEn: "Karabakh renewable energy park",
      summaryAz: "Günəş və külək enerjisi parkının tikintisi üçün vətəndaş iştirakı ilə maliyyələşmə.",
      summaryEn: "Citizen-backed financing for a solar and wind generation park.",
      descriptionAz:
        "Layihə Qarabağ iqtisadi rayonunda günəş və külək generasiya güclərinin yaradılmasını nəzərdə tutur. Vəsait transformator, şəbəkəyə qoşulma və yerli məşğulluq proqramlarına yönəldilir. Gəlir qeydi zəmanət deyil; şərtlər yekun hüquqi sənədlərdə dəqiqləşdiriləcək.",
      descriptionEn:
        "The project finances solar and wind capacity in the Karabakh economic region. Proceeds go to substations, grid connection and local employment programmes. The return note is not a guarantee; terms would be fixed in legal documents.",
      agencyId: energyAgency.id,
      sectorId: energy.id,
      region: "Qarabağ",
      targetAmount: "5000000.00",
      minInvestment: "100.00",
      maxInvestment: "50000.00",
      expectedReturnNote: "Indicative long-horizon infrastructure note — not a guaranteed yield.",
    },
    {
      slug: "baku-absheron-water",
      titleAz: "Bakı-Abşeron su təchizatı modernizasiyası",
      titleEn: "Baku–Absheron water supply modernization",
      summaryAz: "İçməli su şəbəkəsinin yenilənməsi və itkilərin azaldılması.",
      summaryEn: "Renewing drinking-water networks and reducing distribution losses.",
      descriptionAz:
        "Köhnə magistral xətlərin dəyişdirilməsi, sayğaclaşma və sızmaların aşkarlanması üçün sensor şəbəkəsi. İnvestisiya öhdəliyi demo qeydidir və real ödəniş sistemi qoşulmayıb.",
      descriptionEn:
        "Replacement of ageing trunk mains, metering, and a leak-detection sensor network. Commitments on this demo are recorded only; no live payment rail is connected.",
      agencyId: sia.id,
      sectorId: transport.id,
      region: "Bakı",
      targetAmount: "3200000.00",
      minInvestment: "250.00",
      maxInvestment: "25000.00",
      expectedReturnNote: null,
    },
    {
      slug: "agrarian-logistics-hubs",
      titleAz: "Regional aqrar logistika mərkəzləri",
      titleEn: "Regional agrarian logistics hubs",
      summaryAz: "Soyuducu anbarlar və kənd təsərrüfatı məhsullarının ixrac dəhlizi.",
      summaryEn: "Cold storage and an export corridor for agricultural produce.",
      descriptionAz:
        "Gəncə-Qazax və Aran iqtisadi rayonlarında soyuducu anbar, qablaşdırma və keyfiyyət laboratoriyaları. Məqsəd məhsul itkisini azaltmaq və ixracı asanlaşdırmaqdır.",
      descriptionEn:
        "Cold stores, packing lines and quality labs in the Ganja-Gazakh and Aran regions, aimed at cutting post-harvest loss and easing exports.",
      agencyId: economy.id,
      sectorId: agriculture.id,
      region: "Gəncə-Qazax",
      targetAmount: "1800000.00",
      minInvestment: "100.00",
      maxInvestment: "20000.00",
      expectedReturnNote: "Linked to seasonal throughput; not a fixed coupon.",
    },
    {
      slug: "east-zangezur-tourism",
      titleAz: "Şərqi Zəngəzur turizm infrastrukturu",
      titleEn: "East Zangezur tourism infrastructure",
      summaryAz: "Yollar, ziyarətçi mərkəzləri və ekoloji cığırlar.",
      summaryEn: "Access roads, visitor centres and ecological trails.",
      descriptionAz:
        "Ziyarətçi axınının idarə olunması, yerli qonaqlama və təbiət cığırlarının təhlükəsizliyi üçün əsas infrastruktur.",
      descriptionEn:
        "Core infrastructure for visitor management, local lodging access and safe nature trails.",
      agencyId: sia.id,
      sectorId: tourism.id,
      region: "Şərqi Zəngəzur",
      targetAmount: "2100000.00",
      minInvestment: "150.00",
      maxInvestment: "30000.00",
      expectedReturnNote: null,
    },
    {
      slug: "digital-government-datacenter",
      titleAz: "Rəqəmsal hökumət məlumat mərkəzi",
      titleEn: "Digital government data centre",
      summaryAz: "Dövlət xidmətləri üçün ehtiyat məlumat mərkəzinin tikintisi.",
      summaryEn: "A backup data centre for public digital services.",
      descriptionAz:
        "Enerji səmərəli soyutma, ehtiyat enerji və kibertəhlükəsizlik nəzarəti olan demo məlumat mərkəzi konsepsiyası. Bu platforma rəsmi e-gov sistemi deyil.",
      descriptionEn:
        "A concept facility with efficient cooling, backup power and security operations. This platform is not an official e-gov system.",
      agencyId: economy.id,
      sectorId: digital.id,
      region: "Bakı",
      targetAmount: "7500000.00",
      minInvestment: "500.00",
      maxInvestment: "100000.00",
      expectedReturnNote: "Long-dated availability payment concept — not a promised return.",
    },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: {},
      create: {
        ...project,
        currency: "AZN",
        fundedAmount: project.slug === "karabakh-renewable-park" ? "1250000.00" : "0.00",
        status: "funding",
        fundingStartsAt: starts,
        fundingEndsAt: ends,
        createdById: admin.id,
        publishedAt: starts,
      },
    });
  }

  const water = await prisma.project.findUniqueOrThrow({ where: { slug: "baku-absheron-water" } });
  const existingUpdate = await prisma.projectUpdate.findFirst({ where: { projectId: water.id } });
  if (!existingUpdate) {
    await prisma.projectUpdate.create({
      data: {
        projectId: water.id,
        titleAz: "Layihə sənədləri hazırdır",
        titleEn: "Design package complete",
        bodyAz: "İlk mərhələ şəbəkə xəritəsi və podratçı tələbləri dərc olunub.",
        bodyEn: "The first-stage network map and contractor requirements have been published.",
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
