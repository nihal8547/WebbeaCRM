import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import roleRoutes from './routes/roles';
import clientRoutes from './routes/clients';
import clientWorkRoutes from './routes/clientWorks';
import enquiryRoutes from './routes/enquiries';
import taskRoutes from './routes/tasks';
import taskGroupRoutes from './routes/taskGroups';
import quotationRoutes from './routes/quotations';
import paymentRoutes from './routes/payments';
import reportRoutes from './routes/reports';
import workRoutes from './routes/works';
import dashboardRoutes from './routes/dashboard';
import productRoutes from './routes/products';
import attendanceRoutes from './routes/attendance';
import notificationRoutes from './routes/notifications';
import activityLogRoutes from './routes/activity-logs';
import fileRoutes from './routes/files';

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — in production restrict to your domain
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting — login endpoint stricter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/roles', apiLimiter, roleRoutes);
app.use('/api/clients', apiLimiter, clientRoutes);
app.use('/api/client-works', apiLimiter, clientWorkRoutes);
app.use('/api/enquiries', apiLimiter, enquiryRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);
app.use('/api/task-groups', apiLimiter, taskGroupRoutes);
app.use('/api/quotations', apiLimiter, quotationRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/works', apiLimiter, workRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/attendance', apiLimiter, attendanceRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/activity-logs', apiLimiter, activityLogRoutes);
app.use('/api/files', apiLimiter, fileRoutes);

// Serve frontend static build in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`));
