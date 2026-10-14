import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const include = {
  user: { select: { id: true, name: true } },
  task: { select: { id: true, title: true, status: true } },
  clientWork: { select: { id: true, title: true, client: { select: { id: true, name: true } } } },
};

router.get('/', async (req: AuthRequest, res: Response) => {
  const where: any = {};
  if (req.user?.roleName === 'employee') where.userId = req.user.id;

  const works = await prisma.work.findMany({
    where,
    include,
    orderBy: { workDate: 'desc' },
  });
  res.json(works);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body, userId: req.user!.id };
    if (data.workDate) data.workDate = new Date(data.workDate);
    if (data.hoursWorked) data.hoursWorked = Number(data.hoursWorked);
    if (data.taskId) data.taskId = Number(data.taskId); else delete data.taskId;
    if (data.clientWorkId) data.clientWorkId = Number(data.clientWorkId); else delete data.clientWorkId;

    const work = await prisma.work.create({ data, include });
    res.json(work);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.workDate) data.workDate = new Date(data.workDate);
    if (data.hoursWorked) data.hoursWorked = Number(data.hoursWorked);
    if (data.taskId) data.taskId = Number(data.taskId); else data.taskId = null;
    if (data.clientWorkId) data.clientWorkId = Number(data.clientWorkId); else data.clientWorkId = null;
    delete data.userId; delete data.user; delete data.task; delete data.clientWork;

    const work = await prisma.work.update({
      where: { id: Number(req.params.id) },
      data,
      include,
    });
    res.json(work);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.work.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
