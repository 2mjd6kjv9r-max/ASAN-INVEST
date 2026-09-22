import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

const app = createApp();

async function reset() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      payments, investments, project_updates, projects, agencies, sectors,
      kyc_documents, investor_profiles, refresh_tokens, audit_logs,
      email_verification_tokens, password_reset_tokens, users
    RESTART IDENTITY CASCADE
  `);
}

async function seedProject() {
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: await hashPassword("Password_12345"),
      role: "admin",
      status: "active",
      nationalityType: "azerbaijani_citizen",
      emailVerifiedAt: new Date(),
      profile: { create: { firstName: "Ada", lastName: "Admin" } },
    },
  });
  const sector = await prisma.sector.create({
    data: { slug: "energy", nameAz: "Enerji", nameEn: "Energy" },
  });
  const agency = await prisma.agency.create({
    data: { slug: "demo-agency", nameAz: "Agentlik", nameEn: "Agency" },
  });
  const now = new Date();
  const project = await prisma.project.create({
    data: {
      slug: "demo-park",
      titleAz: "Demo park",
      titleEn: "Demo park",
      summaryAz: "Qısa xülasə mətni buradadır.",
      summaryEn: "A short summary lives here.",
      descriptionAz: "Uzun təsvir mətni ən azı iyirmi simvol olmalıdır.",
      descriptionEn: "A longer description must be at least twenty chars.",
      agencyId: agency.id,
      sectorId: sector.id,
      region: "Bakı",
      targetAmount: "1000.00",
      minInvestment: "100.00",
      maxInvestment: "400.00",
      fundedAmount: "0.00",
      status: "funding",
      fundingStartsAt: new Date(now.getTime() - 86400000),
      fundingEndsAt: new Date(now.getTime() + 86400000 * 30),
      createdById: admin.id,
      publishedAt: now,
    },
  });
  return { admin, project };
}

async function createInvestor(email: string, kyc: "approved" | "pending") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("Password_12345"),
      role: "investor",
      status: "active",
      nationalityType: "azerbaijani_citizen",
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: "Aysel", lastName: "Huseynova", kycStatus: kyc },
      },
    },
  });
}

async function login(email: string) {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "Password_12345" });
  return res.body.data.accessToken as string;
}

describe("investments", () => {
  beforeEach(reset);

  it("blocks investing until KYC is approved", async () => {
    const { project } = await seedProject();
    await createInvestor("pending@example.com", "pending");
    const token = await login("pending@example.com");
    const res = await request(app)
      .post(`/api/v1/projects/${project.id}/investments`)
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", "kyc-block-1")
      .send({ amount: "100.00" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("KYC_REQUIRED");
  });

  it("rejects amounts below the project minimum", async () => {
    const { project } = await seedProject();
    await createInvestor("ok@example.com", "approved");
    const token = await login("ok@example.com");
    const res = await request(app)
      .post(`/api/v1/projects/${project.id}/investments`)
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", "too-small")
      .send({ amount: "50.00" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("AMOUNT_TOO_SMALL");
  });

  it("returns the original investment for a repeated Idempotency-Key", async () => {
    const { project } = await seedProject();
    await createInvestor("ok@example.com", "approved");
    const token = await login("ok@example.com");
    const first = await request(app)
      .post(`/api/v1/projects/${project.id}/investments`)
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", "same-key")
      .send({ amount: "100.00" });
    const second = await request(app)
      .post(`/api/v1/projects/${project.id}/investments`)
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", "same-key")
      .send({ amount: "100.00" });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);
  });

  it("confirms an investment once and does not double-count funded amount", async () => {
    const { project } = await seedProject();
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.com" } });
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: await hashPassword("Password_12345") },
    });
    await createInvestor("ok@example.com", "approved");
    const investorToken = await login("ok@example.com");
    const created = await request(app)
      .post(`/api/v1/projects/${project.id}/investments`)
      .set("Authorization", `Bearer ${investorToken}`)
      .set("Idempotency-Key", "pay-1")
      .send({ amount: "200.00" });
    await request(app)
      .post(`/api/v1/investments/${created.body.data.id}/pay-stub`)
      .set("Authorization", `Bearer ${investorToken}`)
      .send({ succeed: true });

    const adminToken = await login("admin@example.com");
    const confirm1 = await request(app)
      .post(`/api/v1/admin/investments/${created.body.data.id}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);
    const confirm2 = await request(app)
      .post(`/api/v1/admin/investments/${created.body.data.id}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(confirm1.status).toBe(200);
    expect(confirm2.status).toBe(409);

    const publicProject = await request(app).get("/api/v1/projects/demo-park");
    expect(publicProject.body.data.fundedAmount).toBe("200.00");
  });
});
