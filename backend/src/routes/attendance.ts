import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrowStart() {
  const d = todayStart();
  d.setDate(d.getDate() + 1);
  return d;
}

// GET / - list attendance
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.roleName === 'Admin';
    const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user!.id;

    const where = isAdmin
      ? req.query.userId
        ? { userId: parseInt(req.query.userId as string) }
        : {}
      : { userId: req.user!.id };

    const attendance = await prisma.attendance.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /checkin - check in for today
router.post('/checkin', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = todayStart();
    const tomorrow = tomorrowStart();

    const existing = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    if (existing) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    const now = new Date();
    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: today,
        checkIn: now,
        status: 'present',
        notes: req.body.notes ?? null,
      },
    });
    res.status(201).json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /checkout - check out today
router.put('/checkout', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = todayStart();
    const tomorrow = tomorrowStart();

    const record = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    if (!record) {
      return res.status(404).json({ message: 'No check-in record found for today' });
    }

    if (record.checkOut) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    const now = new Date();
    const totalHours = (now.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut: now, totalHours: Math.round(totalHours * 100) / 100 },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /today - get today's record for current user
router.get('/today', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = todayStart();
    const tomorrow = tomorrowStart();

    const record = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    res.json(record ?? null);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /summary - admin: summary for a date range
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.roleName !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const from = req.query.from ? new Date(req.query.from as string) : todayStart();
    const to = req.query.to ? new Date(req.query.to as string) : tomorrowStart();

    const records = await prisma.attendance.findMany({
      where: { date: { gte: from, lt: to } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { date: 'desc' },
    });

    const totalUsers = await prisma.user.count({ where: { isActive: true } });

    res.json({ records, totalUsers, presentCount: records.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
