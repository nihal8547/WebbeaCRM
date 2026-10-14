import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity } from '../middleware/activityLogger';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, roleId: user.roleId, roleName: user.role.name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Create/update attendance check-in for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const existingAttendance = await prisma.attendance.findFirst({
      where: { userId: user.id, date: { gte: todayStart, lt: tomorrowStart } },
    });

    if (!existingAttendance) {
      await prisma.attendance.create({
        data: {
          userId: user.id,
          date: todayStart,
          checkIn: new Date(),
          status: 'present',
        },
      }).catch(console.error);
    }

    // Log login activity
    await logActivity(
      user.id,
      'login',
      'auth',
      undefined,
      user.name,
      undefined,
      req.ip
    );

    // Generate overdue task notifications for this user
    const now = new Date();
    const overdueTasks = await prisma.task.findMany({
      where: {
        assignedToId: user.id,
        dueDate: { lt: now },
        status: { not: 'completed' },
      },
    });

    if (overdueTasks.length > 0) {
      const notifications = overdueTasks.map((task) => ({
        userId: user.id,
        title: 'Overdue Task',
        message: `Task "${task.title}" is overdue`,
        type: 'warning',
        link: `/tasks/${task.id}`,
      }));
      await prisma.notification.createMany({ data: notifications }).catch(console.error);
    }

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role.name, phone: user.phone },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const permissions = user.role.permissions.map((rp) => `${rp.permission.module}:${rp.permission.action}`);
    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role.name, permissions });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /logout - log activity and check out attendance
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Check out attendance if not already done
    const attendance = await prisma.attendance.findFirst({
      where: { userId, date: { gte: todayStart, lt: tomorrowStart } },
    });

    if (attendance && !attendance.checkOut) {
      const now = new Date();
      const totalHours = (now.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);
      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { checkOut: now, totalHours: Math.round(totalHours * 100) / 100 },
      }).catch(console.error);
    }

    await logActivity(userId, 'logout', 'auth', undefined, undefined, undefined, req.ip);

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
