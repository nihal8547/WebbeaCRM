import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users.map((u) => ({ ...u, password: undefined })));
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, phone, roleId } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, phone, roleId: Number(roleId) },
      include: { role: true },
    });
    res.json({ ...user, password: undefined });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, roleId, isActive, password } = req.body;
    const data: any = { name, email, phone, roleId: Number(roleId), isActive };
    if (password) data.password = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data, include: { role: true } });
    res.json({ ...user, password: undefined });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
