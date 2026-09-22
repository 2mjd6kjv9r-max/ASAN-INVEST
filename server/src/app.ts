import path from "path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { adminProjectRouter, publicProjectRouter } from "./modules/projects/projects.routes";
import { adminKycRouter, meRouter } from "./modules/kyc/kyc.routes";
import {
  adminInvestmentRouter,
  investorInvestmentRouter,
} from "./modules/investments/investments.routes";
import { adminUserRouter } from "./modules/admin/admin.routes";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  const health = (_req: express.Request, res: express.Response) => {
    res.json({ data: { ok: true, service: "asan-invest-api" } });
  };
  app.get("/health", health);
  app.get("/api/v1/health", health);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1", publicProjectRouter);
  app.use("/api/v1/me", meRouter);
  app.use("/api/v1", investorInvestmentRouter);
  app.use("/api/v1/admin/projects", adminProjectRouter);
  app.use("/api/v1/admin/investments", adminInvestmentRouter);
  app.use("/api/v1/admin/kyc", adminKycRouter);
  app.use("/api/v1/admin/users", adminUserRouter);
  app.use(
    "/api/v1/uploads",
    express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), { fallthrough: true }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
