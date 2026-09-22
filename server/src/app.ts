import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { requestId } from "./middleware/request-id";
import { errorHandler } from "./middleware/error-handler";
import { apiRateLimiter } from "./middleware/rate-limit";
import { healthRouter } from "./modules/health/health.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { guestRouter } from "./modules/auth/guest.routes";
import { profileRouter } from "./modules/profile/profile.routes";
import { portalRouter } from "./modules/portal/portal.routes";
import { toolsRouter } from "./modules/tools/tools.routes";
import { projectsRouter } from "./modules/projects/projects.routes";
import { applicationsRouter } from "./modules/applications/applications.routes";
import { casesRouter } from "./modules/cases/cases.routes";
import { evaluationsRouter } from "./modules/evaluations/evaluations.routes";
import { cabinetRouter } from "./modules/cabinet/cabinet.routes";
import { documentsRouter, notificationsRouter } from "./modules/documents/documents.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { analyticsRouter } from "./modules/analytics/analytics.routes";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", 1);

  app.use(requestId);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: req.requestId }),
    }),
  );
  app.use(apiRateLimiter);

  app.use("/health", healthRouter);
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1", guestRouter);
  app.use("/api/v1", portalRouter);
  app.use("/api/v1", toolsRouter);
  app.use("/api/v1", profileRouter);
  app.use("/api/v1", cabinetRouter);
  app.use("/api/v1", projectsRouter);
  app.use("/api/v1", applicationsRouter);
  app.use("/api/v1", casesRouter);
  app.use("/api/v1", evaluationsRouter);
  app.use("/api/v1", documentsRouter);
  app.use("/api/v1", notificationsRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1", analyticsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "No route matched this request" } });
  });
  app.use(errorHandler);
  return app;
}
