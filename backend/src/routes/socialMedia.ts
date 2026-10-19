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

// Multer storage for images & videos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${cleanName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB limit for high-res video & images
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are supported.'));
    }
  },
});

// Helper to format post for client
function formatPost(post: any) {
  let platforms = [];
  try {
    platforms = typeof post.platforms === 'string' ? JSON.parse(post.platforms) : (post.platforms || []);
  } catch {
    platforms = post.platforms ? post.platforms.split(',').map((s: string) => s.trim()) : [];
  }

  let mediaUrls = [];
  try {
    mediaUrls = typeof post.mediaUrls === 'string' ? JSON.parse(post.mediaUrls) : (post.mediaUrls || []);
  } catch {
    mediaUrls = [];
  }

  return {
    ...post,
    platforms,
    mediaUrls,
  };
}

// POST /api/social-media/upload - Multi-media upload for images and videos
router.post('/upload', upload.array('media', 10), (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No media files uploaded' });
    }

    const uploaded = files.map((f) => ({
      url: `/uploads/${f.filename}`,
      fileName: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      type: f.mimetype.startsWith('video/') ? 'video' : 'image',
    }));

    res.json(uploaded);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Media upload failed' });
  }
});

// GET /api/social-media - List posts with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, status, platform, search, startDate, endDate, month, year } = req.query;
    const where: any = {};

    if (clientId) {
      where.clientId = Number(clientId);
    }

    if (status && status !== 'all') {
      where.status = String(status);
    }

    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate)),
      };
    } else if (month && year) {
      const y = Number(year);
      const m = Number(month) - 1; // 0-indexed
      const start = new Date(Date.UTC(y, m, 1));
      const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      where.scheduledDate = { gte: start, lte: end };
    }

    let posts = await prisma.socialMediaPost.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            company: true,
            address: true,
            status: true,
            notes: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // In-memory filter for platform or text search if provided
    let formatted = posts.map(formatPost);

    if (platform && platform !== 'all') {
      const platStr = String(platform).toLowerCase();
      formatted = formatted.filter((p: any) =>
        p.platforms.some((pl: string) => pl.toLowerCase() === platStr)
      );
    }

    if (search) {
      const q = String(search).toLowerCase();
      formatted = formatted.filter(
        (p: any) =>
          p.title.toLowerCase().includes(q) ||
          (p.caption && p.caption.toLowerCase().includes(q)) ||
          (p.hashtags && p.hashtags.toLowerCase().includes(q)) ||
          (p.client?.name && p.client.name.toLowerCase().includes(q)) ||
          (p.client?.company && p.client.company.toLowerCase().includes(q))
      );
    }

    res.json(formatted);
  } catch (err: any) {
    console.error('Error fetching social media posts:', err);
    res.status(500).json({ message: 'Server error fetching posts' });
  }
});

// GET /api/social-media/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.socialMediaPost.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        client: true,
      },
    });

    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(formatPost(post));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/social-media - Create post
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      clientId,
      title,
      caption,
      scheduledDate,
      platforms,
      postType = 'post',
      status = 'draft',
      mediaUrls,
      hashtags,
      targetUrl,
      notes,
      assignedToId,
    } = req.body;

    if (!clientId || !title || !scheduledDate) {
      return res.status(400).json({ message: 'Client, title, and scheduled date are required' });
    }

    const post = await prisma.socialMediaPost.create({
      data: {
        clientId: Number(clientId),
        title: String(title).trim(),
        caption: caption ? String(caption).trim() : null,
        scheduledDate: new Date(scheduledDate),
        platforms: Array.isArray(platforms) ? JSON.stringify(platforms) : (platforms || '[]'),
        postType: String(postType),
        status: String(status),
        mediaUrls: Array.isArray(mediaUrls) ? JSON.stringify(mediaUrls) : (mediaUrls || '[]'),
        hashtags: hashtags ? String(hashtags).trim() : null,
        targetUrl: targetUrl ? String(targetUrl).trim() : null,
        notes: notes ? String(notes).trim() : null,
        assignedToId: assignedToId ? Number(assignedToId) : null,
        createdById: req.user?.id || null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            company: true,
            address: true,
            status: true,
            notes: true,
          },
        },
      },
    });

    res.status(201).json(formatPost(post));
  } catch (err: any) {
    console.error('Error creating social media post:', err);
    res.status(500).json({ message: err.message || 'Server error creating post' });
  }
});

// PUT /api/social-media/:id - Update post
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      clientId,
      title,
      caption,
      scheduledDate,
      platforms,
      postType,
      status,
      mediaUrls,
      hashtags,
      targetUrl,
      notes,
      assignedToId,
    } = req.body;

    const data: any = {};
    if (clientId !== undefined) data.clientId = Number(clientId);
    if (title !== undefined) data.title = String(title).trim();
    if (caption !== undefined) data.caption = caption ? String(caption).trim() : null;
    if (scheduledDate !== undefined) data.scheduledDate = new Date(scheduledDate);
    if (platforms !== undefined) {
      data.platforms = Array.isArray(platforms) ? JSON.stringify(platforms) : String(platforms);
    }
    if (postType !== undefined) data.postType = String(postType);
    if (status !== undefined) data.status = String(status);
    if (mediaUrls !== undefined) {
      data.mediaUrls = Array.isArray(mediaUrls) ? JSON.stringify(mediaUrls) : String(mediaUrls);
    }
    if (hashtags !== undefined) data.hashtags = hashtags ? String(hashtags).trim() : null;
    if (targetUrl !== undefined) data.targetUrl = targetUrl ? String(targetUrl).trim() : null;
    if (notes !== undefined) data.notes = notes ? String(notes).trim() : null;
    if (assignedToId !== undefined) data.assignedToId = assignedToId ? Number(assignedToId) : null;

    const updated = await prisma.socialMediaPost.update({
      where: { id },
      data,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            company: true,
            address: true,
            status: true,
            notes: true,
          },
        },
      },
    });

    res.json(formatPost(updated));
  } catch (err: any) {
    console.error('Error updating social media post:', err);
    res.status(500).json({ message: err.message || 'Server error updating post' });
  }
});

// PATCH /api/social-media/:id/status - Quick status update
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });

    const updated = await prisma.socialMediaPost.update({
      where: { id },
      data: { status: String(status) },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            company: true,
            address: true,
            status: true,
            notes: true,
          },
        },
      },
    });

    res.json(formatPost(updated));
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// DELETE /api/social-media/:id - Delete post
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.socialMediaPost.delete({ where: { id } });
    res.json({ message: 'Post deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error deleting post' });
  }
});

export default router;
