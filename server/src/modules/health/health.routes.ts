import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    data: {
      status: "ok",
      service: "asan-invest-api",
      phase: 1,
    },
  });
});
