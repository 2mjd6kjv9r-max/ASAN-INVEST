import {
  NotificationChannel,
  UserRole,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { emailService, smsService } from "../../integrations/email/email.service";
import { logger } from "../../lib/logger";
import { activeRoles } from "../../lib/roles";

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
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { roleAssignments: true },
  });
  const locale = input.locale ?? user?.locale ?? "az";
  const channel = input.channel ?? NotificationChannel.PORTAL;
  const roles = user ? activeRoles(user.roleAssignments) : [];
  const role = input.role ?? roles[0] ?? UserRole.INVESTOR;

  const template = await prisma.notificationTemplate.findFirst({
    where: {
      eventType: input.eventType,
      locale,
      channel,
      OR: [{ role }, { role: null }],
    },
  });

  const body = template
    ? interpolate(template.body, input.vars ?? {})
    : "Open your cabinet for details.";

  const record = await prisma.notification.create({
    data: {
      userId: input.userId,
      eventType: input.eventType,
      channel,
      body,
      payload: input.vars ?? {},
      deliveryResult: "logged",
    },
  });

  if (channel === NotificationChannel.EMAIL && user) {
    await emailService.send(user.email, template?.subject ?? input.eventType, body);
  }
  if (channel === NotificationChannel.SMS) {
    await smsService.send("redacted", body);
  }
  logger.info({ notificationId: record.id, eventType: input.eventType, channel }, "Notification emitted");
  return record;
}
