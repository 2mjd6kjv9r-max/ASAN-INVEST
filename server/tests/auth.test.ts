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

async function createUser(opts: {
  email: string;
  role?: "investor" | "operator" | "admin";
  kyc?: "unsubmitted" | "pending" | "approved" | "rejected";
}) {
  return prisma.user.create({
    data: {
      email: opts.email,
      passwordHash: await hashPassword("Password_12345"),
      role: opts.role ?? "investor",
      status: "active",
      nationalityType: "azerbaijani_citizen",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: "Test",
          lastName: "User",
          countryOfCitizenship: "AZ",
          kycStatus: opts.kyc ?? "unsubmitted",
        },
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

describe("auth", () => {
  beforeEach(reset);

  it("registers and returns an access token without storing it in a cookie", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "new.investor@example.com",
      password: "Password_12345",
      nationalityType: "azerbaijani_citizen",
      firstName: "Nigar",
      lastName: "Quliyeva",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe("new.investor@example.com");
    expect(res.headers["set-cookie"]?.[0]).toMatch(/refreshToken=/);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/i);
  });

  it("rejects invalid login", async () => {
    await createUser({ email: "a@example.com" });
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "a@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns the current user from /auth/me", async () => {
    await createUser({ email: "me@example.com" });
    const token = await login("me@example.com");
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("me@example.com");
  });
});
