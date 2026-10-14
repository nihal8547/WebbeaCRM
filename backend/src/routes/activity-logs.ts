import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET / - list activity logs
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.roleName === 'Admin';
    const moduleFilter = req.query.module as string | undefined;

    const where: any = {};
    if (!isAdmin) {
      where.userId = req.user!.id;
    }
    if (moduleFilter) {
      where.module = moduleFilter;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
