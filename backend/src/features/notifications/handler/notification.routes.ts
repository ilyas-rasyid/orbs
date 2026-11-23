import { route } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { assert } from "../../../http/errors.js";

export function registerNotificationRoutes() {
  route("GET", "/notifications", async (ctx) =>
    prisma.notification.findMany({
      where: { recipientId: ctx.actor!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  );
  route("GET", "/notifications/unread-count", async (ctx) => ({
    count: await prisma.notification.count({ where: { recipientId: ctx.actor!.id, readAt: null } }),
  }));
  route("POST", "/notifications/:id/read", async (ctx) => {
    const id = ctx.params.id!;
    const original = await prisma.notification.findFirst({
      where: { id, recipientId: ctx.actor!.id },
    });
    assert(original, 404, "RESOURCE_NOT_FOUND", "Notification not found.");
    await prisma.notification.update({
      where: { id: original.id },
      data: { readAt: original.readAt ?? new Date() },
    });
    return { success: true };
  });
}
