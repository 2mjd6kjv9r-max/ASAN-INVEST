import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { generateOpaqueToken, hashToken } from "../../lib/tokens";
import { validate } from "../../middleware/validate";

export const guestRouter = Router();

const guestPatchSchema = z.object({
  answers: z.record(z.unknown()),
});

guestRouter.post(
  "/guest-sessions",
  asyncHandler(async (_req, res) => {
    const token = generateOpaqueToken();
    await prisma.guestSession.create({
      data: {
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    res.status(201).json({ data: { token, expiresInDays: 7 } });
  }),
);

guestRouter.patch(
  "/guest-sessions/:token",
  validate(guestPatchSchema),
  asyncHandler(async (req, res) => {
    const session = await prisma.guestSession.update({
      where: { tokenHash: hashToken(req.params.token) },
      data: { answers: req.body.answers },
    });
    res.json({ data: { answers: session.answers } });
  }),
);
