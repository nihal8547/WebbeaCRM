import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../lib/crypto';

const router = Router();
router.use(authenticate);

function safeDecrypt(pw: string): string {
  try { return decrypt(pw); } catch { return ''; }
}

// GET /credentials?clientId=X — list credentials for a client
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const creds = await prisma.credential.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(creds.map((c) => ({ ...c, password: safeDecrypt(c.password) })));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /credentials
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, label, url, username, password, notes } = req.body;
    if (!clientId || !label || !username || !password) {
      return res.status(400).json({ message: 'clientId, label, username, password are required' });
    }
    const cred = await prisma.credential.create({
      data: {
        clientId: Number(clientId),
        label: String(label),
        url: url ? String(url) : null,
        username: String(username),
        password: encrypt(String(password)),
        notes: notes ? String(notes) : null,
      },
      include: { client: { select: { id: true, name: true, company: true } } },
    });
    res.status(201).json({ ...cred, password: String(password) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /credentials/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { label, url, username, password, notes } = req.body;
    const cred = await prisma.credential.update({
      where: { id: Number(req.params.id) },
      data: {
        label: label ? String(label) : undefined,
        url: url !== undefined ? (url ? String(url) : null) : undefined,
        username: username ? String(username) : undefined,
        password: password ? encrypt(String(password)) : undefined,
        notes: notes !== undefined ? (notes ? String(notes) : null) : undefined,
      },
      include: { client: { select: { id: true, name: true, company: true } } },
    });
    res.json({ ...cred, password: safeDecrypt(cred.password) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /credentials/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.credential.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
