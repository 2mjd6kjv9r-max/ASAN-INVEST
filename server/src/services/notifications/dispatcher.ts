import type { NotificationChannel, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { emailService, smsService } from "../../integrations/email/email.service";
import { logger } from "../../lib/logger";

function interpolate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_full, key: string) => vars[key] ?? "");
}

export async function emitNotification(input: {
  userId: string;
  eventType: string;
  role?: UserRole;
  locale?: string;
  channel?: NotificationChannel;
  vars?: Record<string, string>;
  mandatory?: boolean;
}) {
  const locale = input.locale ?? "az";
  const channel = input.channel ?? "portal";
  const template = await prisma.notificationTemplate.findFirst({
    where: {
      eventType: input.eventType,
      locale,
      channel,
      OR: [{ role: input.role ?? null }, { role: null }],
    },
  });

  const title = template ? interpolate(template.title, input.vars ?? {}) : input.eventType;
  const body = template
    ? interpolate(template.body, input.vars ?? {})
    : "Open your cabinet for details.";

  const record = await prisma.notification.create({
    data: {
      userId: input.userId,
      eventType: input.eventType,
      channel,
      title,
      body,
      mandatory: input.mandatory ?? template?.mandatory ?? false,
      deliveryResult: "logged",
    },
  });

  if (channel === "email") {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (user) await emailService.send(user.email, title, body);
  }
  if (channel === "sms") {
    await smsService.send("redacted", body);
  }
  logger.info({ notificationId: record.id, eventType: input.eventType, channel }, "Notification emitted");
  return record;
}
