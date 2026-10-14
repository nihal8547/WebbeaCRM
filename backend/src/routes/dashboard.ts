import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalClients,
      totalTasks,
      pendingTasks,
      completedTasksToday,
      totalEnquiries,
      newEnquiries,
      totalPayments,
      pendingPayments,
      totalQuotations,
      activeClientWorks,
      totalClientWorks,
    ] = await Promise.all([
      prisma.client.count({ where: { status: 'active' } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'pending' } }),
      prisma.task.count({ where: { status: 'completed', completedAt: { gte: today, lt: tomorrow } } }),
      prisma.enquiry.count(),
      prisma.enquiry.count({ where: { status: 'new' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'paid' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'pending' } }),
      prisma.quotation.count(),
      prisma.clientWork.count({ where: { status: { in: ['in_progress', 'pending'] } } }),
      prisma.clientWork.count(),
    ]);

    const recentTasks = await prisma.task.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: { select: { name: true } } },
    });

    const recentEnquiries = await prisma.enquiry.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } } },
    });

    const overdueWorks = await prisma.clientWork.findMany({
      where: { endDate: { lt: new Date() }, status: { notIn: ['completed', 'cancelled'] } },
      include: { client: { select: { name: true } } },
      take: 5,
    });

    res.json({
      stats: {
        totalClients,
        totalTasks,
        pendingTasks,
        completedTasksToday,
        totalEnquiries,
        newEnquiries,
        totalRevenue: totalPayments._sum.amount || 0,
        pendingPayments: pendingPayments._sum.amount || 0,
        totalQuotations,
        activeClientWorks,
        totalClientWorks,
      },
      recentTasks,
      recentEnquiries,
      overdueWorks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
