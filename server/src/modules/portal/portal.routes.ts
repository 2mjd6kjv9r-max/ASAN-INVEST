import { Router } from "express";
import { ClassificationKind, CmsStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { env } from "../../config/env";
import { namesFor } from "../../lib/json";

export const portalRouter = Router();

portalRouter.get(
  "/pages/:slug",
  asyncHandler(async (req, res) => {
    const locale = typeof req.query.locale === "string" ? req.query.locale : "az";
    const page = await prisma.cmsContent.findFirst({
      where: { slug: req.params.slug, status: CmsStatus.PUBLISHED },
      orderBy: { version: "desc" },
    });
    if (!page) throw AppError.notFound("Page not found");
    res.json({
      data: {
        slug: page.slug,
        pageKey: page.pageKey,
        locale,
        title: namesFor(page.title, locale),
        body: namesFor(page.body, locale),
        titleI18n: page.title,
        bodyI18n: page.body,
        publishedAt: page.publishedAt,
        version: page.version,
      },
    });
  }),
);

portalRouter.get(
  "/classifications",
  asyncHandler(async (req, res) => {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const rows = await prisma.classification.findMany({
      where: {
        isActive: true,
        ...(kind ? { kind: kind as ClassificationKind } : {}),
      },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    });
    res.json({ data: rows });
  }),
);

portalRouter.get(
  "/procedures",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.procedure.findMany({
      where: { isActive: true },
      include: { institution: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json({
      data: rows.map((row) => ({
        id: row.id,
        code: row.code,
        names: row.names,
        flag: row.flag,
        expectedDurationDays: row.expectedDurationDays,
        feeAmount: row.feeAmount?.toFixed(2) ?? null,
        feeCurrency: row.feeCurrency,
        legalBasis: row.legalBasis,
        eServiceUrl: row.eServiceUrl,
        institution: { id: row.institution.id, code: row.institution.code, names: row.institution.names },
      })),
    });
  }),
);

portalRouter.get(
  "/opportunities",
  asyncHandler(async (req, res) => {
    const locale = typeof req.query.locale === "string" ? req.query.locale : "az";
    const pages = await prisma.cmsContent.findMany({
      where: { pageKey: "OPP", status: CmsStatus.PUBLISHED },
      orderBy: { publishedAt: "desc" },
    });
    const zones = await prisma.classification.findMany({
      where: { kind: ClassificationKind.ZONE_PARK, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json({
      data: {
        catalogue: pages.map((page) => ({
          slug: page.slug,
          title: namesFor(page.title, locale),
          body: namesFor(page.body, locale),
        })),
        zones: zones.map((zone) => ({
          id: zone.id,
          code: zone.code,
          names: zone.names,
        })),
      },
    });
  }),
);

portalRouter.get(
  "/company-registration",
  asyncHandler(async (_req, res) => {
    res.json({
      data: {
        url: env.DVX_COMPANY_REGISTRATION_URL,
        message:
          "Company registration is completed on the existing DVX e-service. ASAN Invest does not register companies automatically.",
      },
    });
  }),
);
