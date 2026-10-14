import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /upload - upload a file
router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { module, entityId } = req.body;
    if (!module || !entityId) {
      return res.status(400).json({ message: 'module and entityId are required' });
    }

    const attachment = await prisma.fileAttachment.create({
      data: {
        userId: req.user!.id,
        module,
        entityId: parseInt(entityId),
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
      },
    });

    res.status(201).json(attachment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /:module/:entityId - list files for an entity
router.get('/:module/:entityId', async (req: AuthRequest, res: Response) => {
  try {
    const moduleName = req.params.module as string;
    const entityId = req.params.entityId as string;
    const files = await prisma.fileAttachment.findMany({
      where: { module: moduleName, entityId: parseInt(entityId) },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /:id - delete file
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const isAdmin = req.user!.roleName === 'Admin';

    const file = await prisma.fileAttachment.findFirst({
      where: isAdmin ? { id } : { id, userId: req.user!.id },
    });

    if (!file) return res.status(404).json({ message: 'File not found' });

    // Delete from disk
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await prisma.fileAttachment.delete({ where: { id } });
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
