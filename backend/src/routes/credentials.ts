import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../lib/crypto';
import { verifySocialCredential } from '../services/credentialVerifier';

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
    res.json(creds.map((c) => ({
      ...c,
      password: safeDecrypt(c.password),
      sessionData: c.sessionData ? safeDecrypt(c.sessionData) : null,
    })));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /credentials
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, label, platform = 'instagram', url, username, password, notes, otpCode } = req.body;
    if (!clientId || !label || !username || !password) {
      return res.status(400).json({ message: 'clientId, label, username, password are required' });
    }

    const cleanUser = String(username).trim();
    const plat = String(platform).toLowerCase();

    // Verify credentials against social platform
    const verification = await verifySocialCredential(plat, cleanUser, String(password), otpCode);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        status: verification.status,
        message: verification.message,
        requires2FA: verification.requires2FA,
        twoFactorIdentifier: verification.twoFactorIdentifier,
      });
    }

    const cred = await prisma.credential.create({
      data: {
        clientId: Number(clientId),
        label: String(label).trim(),
        platform: plat,
        url: url ? String(url).trim() : (plat === 'instagram' ? `https://instagram.com/${cleanUser.replace(/^@/, '')}` : null),
        username: cleanUser,
        password: encrypt(String(password)),
        sessionData: verification.sessionData ? encrypt(verification.sessionData) : null,
        status: verification.status,
        lastChecked: new Date(),
        notes: notes ? String(notes).trim() : null,
      },
      include: { client: { select: { id: true, name: true, company: true } } },
    });
    res.status(201).json({ ...cred, password: String(password), message: verification.message });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /credentials/connect — Authenticate & Connect with optional 2FA handshake
router.post('/connect', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, label, platform = 'instagram', username, password, url, notes, otpCode } = req.body;
    if (!clientId || !username || !password) {
      return res.status(400).json({ message: 'Client ID, username, and password are required' });
    }

    const cleanUser = String(username).trim();
    const plat = String(platform).toLowerCase();
    const cleanLabel = label ? String(label).trim() : `@${cleanUser.replace(/^@/, '')} (${plat})`;

    // Verify credentials against social platform
    const verification = await verifySocialCredential(plat, cleanUser, String(password), otpCode);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        status: verification.status,
        message: verification.message,
        requires2FA: verification.requires2FA,
        twoFactorIdentifier: verification.twoFactorIdentifier,
      });
    }

    const cred = await prisma.credential.create({
      data: {
        clientId: Number(clientId),
        label: cleanLabel,
        platform: plat,
        url: url ? String(url).trim() : (plat === 'instagram' ? `https://instagram.com/${cleanUser.replace(/^@/, '')}` : null),
        username: cleanUser,
        password: encrypt(String(password)),
        sessionData: verification.sessionData ? encrypt(verification.sessionData) : null,
        status: verification.status,
        lastChecked: new Date(),
        notes: notes ? String(notes).trim() : null,
      },
      include: { client: { select: { id: true, name: true, company: true } } },
    });

    res.status(201).json({
      ...cred,
      password: String(password),
      message: verification.message,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to connect social account' });
  }
});

// POST /credentials/:id/test-connection — Verify connection status
router.post('/:id/test-connection', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const cred = await prisma.credential.findUnique({ where: { id } });
    if (!cred) return res.status(404).json({ message: 'Account not found' });

    const decryptedPassword = safeDecrypt(cred.password);
    const verification = await verifySocialCredential(
      cred.platform || 'instagram',
      cred.username,
      decryptedPassword
    );

    // Update last checked and verified status in database
    const updated = await prisma.credential.update({
      where: { id },
      data: {
        status: verification.status,
        lastChecked: new Date(),
        sessionData: verification.sessionData ? encrypt(verification.sessionData) : undefined,
      },
    });

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        status: verification.status,
        lastChecked: updated.lastChecked,
        message: verification.message,
      });
    }

    res.json({
      success: true,
      status: 'connected',
      lastChecked: updated.lastChecked,
      message: verification.message,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Connection test failed' });
  }
});

// PUT /credentials/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { label, platform, url, username, password, status, notes } = req.body;
    const id = Number(req.params.id);

    if (password) {
      const existing = await prisma.credential.findUnique({ where: { id } });
      const plat = platform ? String(platform).toLowerCase() : (existing?.platform || 'instagram');
      const usr = username ? String(username).trim() : (existing?.username || '');
      const verification = await verifySocialCredential(plat, usr, String(password));
      if (!verification.success) {
        return res.status(400).json({
          message: verification.message,
          status: verification.status,
        });
      }
    }

    const cred = await prisma.credential.update({
      where: { id },
      data: {
        label: label ? String(label).trim() : undefined,
        platform: platform ? String(platform).toLowerCase() : undefined,
        url: url !== undefined ? (url ? String(url).trim() : null) : undefined,
        username: username ? String(username).trim() : undefined,
        password: password ? encrypt(String(password)) : undefined,
        status: status ? String(status) : undefined,
        notes: notes !== undefined ? (notes ? String(notes).trim() : null) : undefined,
        lastChecked: new Date(),
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
