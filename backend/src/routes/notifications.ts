import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET / - get notifications for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /read-all - mark all as read (must come before /:id/read)
router.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /:id/read - mark one as read
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /:id - delete notification
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    await prisma.notification.delete({ where: { id } });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /generate - admin: generate overdue task notifications and follow-up reminders
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.roleName !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Find overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { not: 'completed' },
        assignedToId: { not: null },
      },
      include: { assignedTo: true },
    });

    // Find follow-up enquiries due today
    const followUpEnquiries = await prisma.enquiry.findMany({
      where: {
        followUpDate: { gte: todayStart, lt: tomorrowStart },
        status: { not: 'closed' },
      },
    });

    const notifications: { userId: number; title: string; message: string; type: string; link?: string }[] = [];

    for (const task of overdueTasks) {
      if (task.assignedToId) {
        notifications.push({
          userId: task.assignedToId,
          title: 'Overdue Task',
          message: `Task "${task.title}" is overdue`,
          type: 'warning',
          link: `/tasks/${task.id}`,
        });
      }
    }

    // Notify all admins about follow-up enquiries
    const admins = await prisma.user.findMany({
      where: { isActive: true, role: { name: 'Admin' } },
      select: { id: true },
    });

    for (const enquiry of followUpEnquiries) {
      for (const admin of admins) {
        notifications.push({
          userId: admin.id,
          title: 'Follow-up Due Today',
          message: `Enquiry from "${enquiry.name}" requires follow-up today`,
          type: 'info',
          link: `/enquiries/${enquiry.id}`,
        });
      }
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    res.json({
      message: 'Notifications generated',
      overdueTaskCount: overdueTasks.length,
      followUpCount: followUpEnquiries.length,
      notificationsCreated: notifications.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
