import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const generatePaymentNo = async () => {
  const count = await prisma.payment.count();
  return `PAY-${String(count + 1).padStart(4, '0')}`;
};

router.get('/', async (_req: AuthRequest, res: Response) => {
  const payments = await prisma.payment.findMany({
    include: { client: true, quotation: { select: { quotationNo: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(payments);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    data.paymentNo = await generatePaymentNo();
    data.clientId = Number(data.clientId);
    if (data.quotationId) data.quotationId = Number(data.quotationId);
    if (data.paidDate) data.paidDate = new Date(data.paidDate);
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    data.amount = Number(data.amount);

    const payment = await prisma.payment.create({
      data,
      include: { client: true, quotation: { select: { quotationNo: true } } },
    });
    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.paidDate) data.paidDate = new Date(data.paidDate);
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.amount) data.amount = Number(data.amount);
    if (data.clientId) data.clientId = Number(data.clientId);
    if (data.quotationId) data.quotationId = Number(data.quotationId);

    const payment = await prisma.payment.update({
      where: { id: Number(req.params.id) },
      data,
      include: { client: true, quotation: { select: { quotationNo: true } } },
    });
    res.json(payment);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.payment.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
