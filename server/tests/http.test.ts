import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("health and public contract", () => {
  const app = createApp();

  it("returns a consistent health payload", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.phase).toBe(1);
  });

  it("validates register payloads without leaking secrets", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ email: "bad", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  it("rejects unknown routes with the standard error shape", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
