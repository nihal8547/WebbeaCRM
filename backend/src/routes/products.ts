import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET / - list all active products
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST / - create product
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, unit, price, category } = req.body;
    const product = await prisma.product.create({
      data: { name, description, unit, price, category },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /:id - update product
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, description, unit, price, category, isActive } = req.body;
    const product = await prisma.product.update({
      where: { id },
      data: { name, description, unit, price, category, isActive },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /:id - soft delete
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
