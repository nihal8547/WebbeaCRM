import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
  });
  res.json(roles);
});

router.get('/permissions', async (_req: AuthRequest, res: Response) => {
  const permissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  res.json(permissions);
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissionIds } = req.body;
    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: (permissionIds as number[]).map((id) => ({ permissionId: id })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
    res.json(role);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissionIds } = req.body;
    const id = Number(req.params.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    const role = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        permissions: {
          create: (permissionIds as number[]).map((pid) => ({ permissionId: pid })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
    res.json(role);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
