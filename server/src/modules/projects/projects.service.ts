import { Prisma, type ProjectStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError, forbidden, notFound } from "../../lib/errors";
import { parseAmount } from "../../lib/money";
import { meta, parsePagination } from "../../lib/pagination";
import { serializeNamed, serializeProject } from "../../serializers";

const PUBLIC_STATUSES: ProjectStatus[] = ["published", "funding", "funded", "closed"];

export async function listPublic(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  await reconcileOpenProjects();
  const where = buildWhere(query, true);
  const [total, rows] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: { agency: true, sector: true },
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return { data: rows.map(serializeProject), meta: meta(page, limit, total) };
}

export async function getBySlug(slug: string, includeDrafts = false) {
  await reconcileOpenProjects();
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      agency: true,
      sector: true,
      updates: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!project) throw notFound("Project");
  if (!includeDrafts && !PUBLIC_STATUSES.includes(project.status)) {
    throw notFound("Project");
  }
  return serializeProject(project);
}

export async function listSectors() {
  const rows = await prisma.sector.findMany({ orderBy: { slug: "asc" } });
  return rows.map(serializeNamed);
}

export async function listAgencies() {
  const rows = await prisma.agency.findMany({ orderBy: { slug: "asc" } });
  return rows.map(serializeNamed);
}

export async function listAdmin(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const where = buildWhere(query, false);
  const [total, rows] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: { agency: true, sector: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return { data: rows.map(serializeProject), meta: meta(page, limit, total) };
}

export async function getAdmin(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { agency: true, sector: true, updates: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) throw notFound("Project");
  return serializeProject(project);
}

export async function create(actorId: string, body: Record<string, unknown>) {
  const data = toProjectData(body);
  if (data.fundingEndsAt <= data.fundingStartsAt) {
    throw new AppError(400, "INVALID_WINDOW", "Funding end must be after start");
  }
  const created = await prisma.project.create({
    data: { ...data, createdById: actorId, status: "draft" },
    include: { agency: true, sector: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "project.create",
      entityType: "project",
      entityId: created.id,
    },
  });
  return serializeProject(created);
}

export async function update(actorId: string, id: string, body: Record<string, unknown>) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw notFound("Project");
  const data = toProjectData(body, true);
  if (
    data.fundingStartsAt &&
    data.fundingEndsAt &&
    data.fundingEndsAt <= data.fundingStartsAt
  ) {
    throw new AppError(400, "INVALID_WINDOW", "Funding end must be after start");
  }
  const updated = await prisma.project.update({
    where: { id },
    data,
    include: { agency: true, sector: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "project.update",
      entityType: "project",
      entityId: id,
    },
  });
  return serializeProject(updated);
}

export async function publish(actorId: string, actorRole: string, id: string) {
  if (actorRole !== "admin") throw forbidden("Only admins can publish projects");
  const project = await prisma.project.findUnique({
    where: { id },
    include: { agency: true, sector: true },
  });
  if (!project) throw notFound("Project");
  if (project.status === "cancelled") {
    throw new AppError(409, "NOT_PUBLISHABLE", "Cancelled projects cannot be published");
  }
  const now = new Date();
  const nextStatus: ProjectStatus =
    now >= project.fundingStartsAt && now <= project.fundingEndsAt ? "funding" : "published";
  const updated = await prisma.project.update({
    where: { id },
    data: { status: nextStatus, publishedAt: project.publishedAt ?? now },
    include: { agency: true, sector: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "project.publish",
      entityType: "project",
      entityId: id,
      metadata: { status: nextStatus },
    },
  });
  return serializeProject(updated);
}

export async function reconcileOpenProjects(): Promise<void> {
  const now = new Date();
  const open = await prisma.project.findMany({
    where: { status: { in: ["published", "funding"] } },
  });
  for (const project of open) {
    let next: ProjectStatus = project.status;
    if (project.fundedAmount.gte(project.targetAmount)) next = "funded";
    else if (now > project.fundingEndsAt) next = "closed";
    else if (now >= project.fundingStartsAt && now <= project.fundingEndsAt) next = "funding";
    if (next !== project.status) {
      await prisma.project.update({ where: { id: project.id }, data: { status: next } });
    }
  }
}

function buildWhere(query: Record<string, unknown>, publicOnly: boolean): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = publicOnly
    ? { status: { in: PUBLIC_STATUSES } }
    : {};
  if (typeof query.sector === "string" && query.sector) {
    where.sector = { slug: query.sector };
  }
  if (typeof query.region === "string" && query.region) {
    where.region = { contains: query.region, mode: "insensitive" };
  }
  if (typeof query.status === "string" && query.status) {
    where.status = query.status as ProjectStatus;
  }
  if (typeof query.q === "string" && query.q.trim()) {
    const q = query.q.trim();
    where.OR = [
      { titleAz: { contains: q, mode: "insensitive" } },
      { titleEn: { contains: q, mode: "insensitive" } },
      { summaryAz: { contains: q, mode: "insensitive" } },
      { summaryEn: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

function toProjectData(body: Record<string, unknown>, partial = false): Prisma.ProjectUncheckedUpdateInput & Prisma.ProjectUncheckedCreateInput {
  const data: Record<string, unknown> = {};
  const assign = (key: string, value: unknown) => {
    if (value !== undefined) data[key] = value;
  };
  assign("slug", body.slug);
  assign("titleAz", body.titleAz);
  assign("titleEn", body.titleEn);
  assign("summaryAz", body.summaryAz);
  assign("summaryEn", body.summaryEn);
  assign("descriptionAz", body.descriptionAz);
  assign("descriptionEn", body.descriptionEn);
  assign("agencyId", body.agencyId);
  assign("sectorId", body.sectorId);
  assign("region", body.region);
  if (body.targetAmount !== undefined) assign("targetAmount", parseAmount(body.targetAmount, "targetAmount"));
  if (body.minInvestment !== undefined) assign("minInvestment", parseAmount(body.minInvestment, "minInvestment"));
  if (body.maxInvestment !== undefined) {
    assign("maxInvestment", body.maxInvestment === null ? null : parseAmount(body.maxInvestment, "maxInvestment"));
  }
  if (body.fundingStartsAt !== undefined) assign("fundingStartsAt", new Date(String(body.fundingStartsAt)));
  if (body.fundingEndsAt !== undefined) assign("fundingEndsAt", new Date(String(body.fundingEndsAt)));
  if (body.expectedReturnNote !== undefined) assign("expectedReturnNote", body.expectedReturnNote);
  if (!partial && data.fundingStartsAt && data.fundingEndsAt) {
    // create path already validated by schema
  }
  return data as Prisma.ProjectUncheckedCreateInput;
}
