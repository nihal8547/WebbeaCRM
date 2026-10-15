import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /settings - return all settings as key:value map
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    res.json(map);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /settings/:key - admin only, upsert a setting
router.put('/:key', async (req: AuthRequest, res: Response) => {
  const role = req.user?.roleName?.toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  try {
    const key = String(req.params.key);
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ message: 'value required' });
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
    res.json(setting);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
