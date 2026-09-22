import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { param } from "../../lib/params";
import * as projects from "./projects.service";

export const listPublic = asyncHandler(async (req: Request, res: Response) => {
  const result = await projects.listPublic(req.query as Record<string, unknown>);
  res.json(result);
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const data = await projects.getBySlug(param(req.params.slug));
  res.json({ data });
});

export const sectors = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await projects.listSectors() });
});

export const agencies = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await projects.listAgencies() });
});

export const listAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await projects.listAdmin(req.query as Record<string, unknown>);
  res.json(result);
});

export const getAdmin = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await projects.getAdmin(param(req.params.id)) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await projects.create(req.user!.id, req.body);
  res.status(201).json({ data });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await projects.update(req.user!.id, param(req.params.id), req.body);
  res.json({ data });
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
  const data = await projects.publish(req.user!.id, req.user!.role, param(req.params.id));
  res.json({ data });
});
