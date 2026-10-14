import prisma from '../lib/prisma';

export async function logActivity(
  userId: number | undefined,
  action: string,
  module: string,
  entityId?: number,
  entityName?: string,
  details?: string,
  ipAddress?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId ?? null,
        action,
        module,
        entityId: entityId ?? null,
        entityName: entityName ?? null,
        details: details ?? null,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
