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
    const role = req.user?.roleName?.toLowerCase();
    const isAdmin = role === 'admin' || role === 'manager';

    const where: any = {};

    if (!isAdmin) {
      where.userId = req.user!.id;
    } else if (req.query.userId) {
      where.userId = parseInt(req.query.userId as string);
    }

    if (req.query.date && typeof req.query.date === 'string') {
      const dateStr = req.query.date.trim();
      if (dateStr) {
        const parts = dateStr.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          const [year, month, day] = parts;
          const localStart = new Date(year, month - 1, day, 0, 0, 0, 0);
          const localEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

          const utcStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
          const utcEnd = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

          const rangeStart = localStart < utcStart ? localStart : utcStart;
          const rangeEnd = localEnd > utcEnd ? localEnd : utcEnd;

          where.OR = [
            { date: { gte: rangeStart, lt: rangeEnd } },
            { checkIn: { gte: rangeStart, lt: rangeEnd } },
          ];
        }
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { checkIn: 'desc' }],
    });
    res.json(attendance);
  } catch (err) {
    console.error('Error in GET /attendance:', err);
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
    const role = req.user?.roleName?.toLowerCase();
    const isAdmin = role === 'admin' || role === 'manager';
    if (!isAdmin) {
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
