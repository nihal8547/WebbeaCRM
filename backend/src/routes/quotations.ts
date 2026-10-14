import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const generateQuotationNo = async () => {
  const count = await prisma.quotation.count();
  return `QT-${String(count + 1).padStart(4, '0')}`;
};

router.get('/', async (_req: AuthRequest, res: Response) => {
  const quotations = await prisma.quotation.findMany({
    include: { client: true, items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(quotations);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const q = await prisma.quotation.findUnique({
    where: { id: Number(req.params.id) },
    include: { client: true, items: true },
  });
  if (!q) return res.status(404).json({ message: 'Not found' });
  res.json(q);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, subject, status, validUntil, discount, tax, notes, terms, items } = req.body;
    const quotationNo = await generateQuotationNo();
    const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);
    const totalAmount = subtotal - (subtotal * (discount || 0)) / 100 + (subtotal * (tax || 0)) / 100;

    const quotation = await prisma.quotation.create({
      data: {
        quotationNo,
        clientId: Number(clientId),
        subject,
        status: status || 'draft',
        validUntil: validUntil ? new Date(validUntil) : null,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        notes,
        terms,
        totalAmount,
        items: {
          create: items.map((i: any) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            total: Number(i.quantity) * Number(i.unitPrice),
          })),
        },
      },
      include: { client: true, items: true },
    });
    res.json(quotation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, subject, status, validUntil, discount, tax, notes, terms, items } = req.body;
    const id = Number(req.params.id);
    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });

    const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);
    const totalAmount = subtotal - (subtotal * (discount || 0)) / 100 + (subtotal * (tax || 0)) / 100;

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        clientId: Number(clientId),
        subject,
        status,
        validUntil: validUntil ? new Date(validUntil) : null,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        notes,
        terms,
        totalAmount,
        items: {
          create: items.map((i: any) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            total: Number(i.quantity) * Number(i.unitPrice),
          })),
        },
      },
      include: { client: true, items: true },
    });
    res.json(quotation);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.quotation.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
