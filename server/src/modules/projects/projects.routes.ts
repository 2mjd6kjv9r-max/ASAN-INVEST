import { Router } from "express";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as controller from "./projects.controller";
import {
  createProjectSchema,
  listProjectsQuery,
  projectWriteSchema,
  slugParam,
  uuidParam,
} from "./projects.schemas";

export const publicProjectRouter = Router();
publicProjectRouter.get("/projects", validate({ query: listProjectsQuery }), controller.listPublic);
publicProjectRouter.get("/projects/:slug", validate({ params: slugParam }), controller.getBySlug);
publicProjectRouter.get("/sectors", controller.sectors);
publicProjectRouter.get("/agencies", controller.agencies);

export const adminProjectRouter = Router();
adminProjectRouter.use(requireAuth, requireRoles("operator", "admin"));
adminProjectRouter.get("/", validate({ query: listProjectsQuery }), controller.listAdmin);
adminProjectRouter.post("/", validate({ body: createProjectSchema }), controller.create);
adminProjectRouter.get("/:id", validate({ params: uuidParam }), controller.getAdmin);
adminProjectRouter.patch("/:id", validate({ params: uuidParam, body: projectWriteSchema }), controller.update);
adminProjectRouter.post("/:id/publish", validate({ params: uuidParam }), controller.publish);
