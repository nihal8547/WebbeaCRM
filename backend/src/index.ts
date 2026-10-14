import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

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
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/client-works', clientWorkRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/task-groups', taskGroupRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/works', workRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/files', fileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
