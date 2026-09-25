import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
export async function syncExpiredCancellations() {
  await db.subscription.updateMany({ where: { cancelAtPeriodEnd: true, status: "ACTIVE", currentPeriodEnd: { lte: new Date() } }, data: { status: "CANCELED", activeKey: null } });
}
