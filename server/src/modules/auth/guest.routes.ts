import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { validate } from "../../middleware/validate";
import { z } from "zod";

export const guestRouter = Router();

const guestPatchSchema = z.object({
  answers: z.record(z.unknown()),
  email: z.string().email().optional(),
  locale: z.enum(["az", "en", "ru", "tr", "ar"]).optional(),
});

guestRouter.post(
  "/guest-sessions",
  asyncHandler(async (req, res) => {
    const locale = typeof req.body?.locale === "string" ? req.body.locale : "az";
    const session = await prisma.guestSession.create({
      data: {
        locale: ["az", "en", "ru", "tr", "ar"].includes(locale) ? locale : "az",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    res.status(201).json({ data: { token: session.id, expiresInDays: 7 } });
  }),
);

guestRouter.patch(
  "/guest-sessions/:token",
  validate(guestPatchSchema),
  asyncHandler(async (req, res) => {
    const session = await prisma.guestSession.update({
      where: { id: req.params.token },
      data: {
        answers: req.body.answers,
        email: req.body.email?.toLowerCase() ?? undefined,
        locale: req.body.locale,
      },
    });
    res.json({ data: { token: session.id, answers: session.answers } });
  }),
);
