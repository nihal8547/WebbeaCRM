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

// GET /charts/revenue - monthly payment amounts for last 6 months
router.get('/charts/revenue', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({
        label: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        start,
        end,
      });
    }

    const data = await Promise.all(
      months.map(async ({ label, start, end }) => {
        const result = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'paid', paidDate: { gte: start, lt: end } },
        });
        return { month: label, amount: result._sum.amount ?? 0 };
      })
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /charts/tasks - task status counts
router.get('/charts/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const statuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    const data = await Promise.all(
      statuses.map(async (status) => {
        const count = await prisma.task.count({ where: { status } });
        return { status, count };
      })
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /charts/enquiries - enquiry status counts
router.get('/charts/enquiries', async (req: AuthRequest, res: Response) => {
  try {
    const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed', 'lost'];
    const data = await Promise.all(
      statuses.map(async (status) => {
        const count = await prisma.enquiry.count({ where: { status } });
        return { status, count };
      })
    );
    res.json(data.filter((d) => d.count > 0));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /charts/attendance - today's attendance count vs total users
router.get('/charts/attendance', async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [presentCount, totalUsers] = await Promise.all([
      prisma.attendance.count({ where: { date: { gte: today, lt: tomorrow } } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    res.json({ presentCount, absentCount: totalUsers - presentCount, totalUsers });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
