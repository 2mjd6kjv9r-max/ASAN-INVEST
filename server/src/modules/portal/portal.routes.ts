import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { env } from "../../config/env";

export const portalRouter = Router();

portalRouter.get(
  "/pages/:slug",
  asyncHandler(async (req, res) => {
    const locale = typeof req.query.locale === "string" ? req.query.locale : "az";
    const page = await prisma.cmsContent.findFirst({
      where: { slug: req.params.slug, locale, status: "published" },
      orderBy: { version: "desc" },
    });
    if (!page) throw AppError.notFound("Page not found");
    res.json({
      data: {
        slug: page.slug,
        locale: page.locale,
        title: page.title,
        body: page.body,
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
      where: kind ? { kind: kind as never } : undefined,
      orderBy: { nameEn: "asc" },
    });
    res.json({ data: rows });
  }),
);

portalRouter.get(
  "/opportunities",
  asyncHandler(async (req, res) => {
    const where: Record<string, unknown> = { status: "published" };
    if (typeof req.query.sector === "string") where.sector = req.query.sector;
    if (typeof req.query.region === "string") where.region = req.query.region;
    if (typeof req.query.kind === "string") where.kind = req.query.kind;
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const [total, data] = await prisma.$transaction([
      prisma.opportunity.count({ where: where as never }),
      prisma.opportunity.findMany({
        where: where as never,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({ data, meta: { page, limit, total } });
  }),
);

portalRouter.get(
  "/opportunities/:slug",
  asyncHandler(async (req, res) => {
    const row = await prisma.opportunity.findFirst({
      where: { slug: req.params.slug, status: "published" },
    });
    if (!row) throw AppError.notFound("Opportunity not found");
    res.json({ data: row });
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
