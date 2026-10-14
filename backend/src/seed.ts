import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // Permissions for ALL application pages & modules
  const modules = [
    'dashboard',
    'clients',
    'client-works',
    'enquiries',
    'tasks',
    'task-groups',
    'works',
    'reports',
    'quotations',
    'payments',
    'products',
    'calendar',
    'attendance',
    'activity-logs',
    'notifications',
    'files',
    'users',
    'roles',
  ];
  const actions = ['view', 'create', 'edit', 'delete'];

  const permissionsData = modules.flatMap((m) =>
    actions.map((a) => ({ module: m, action: a, description: `${a} ${m}` }))
  );

  for (const p of permissionsData) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: { description: p.description },
      create: p,
    });
  }

  const allPerms = await prisma.permission.findMany();

  // Admin role - all permissions
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { description: 'Full system access' },
    create: {
      name: 'admin',
      description: 'Full system access',
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPerms.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Manager - all except users/roles
  const managerPerms = allPerms.filter((p) => !['users', 'roles'].includes(p.module));
  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: { description: 'Manage all operations' },
    create: {
      name: 'manager',
      description: 'Manage all operations',
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: managerRole.id } });
  await prisma.rolePermission.createMany({
    data: managerPerms.map((p) => ({ roleId: managerRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Employee - tasks, works, reports, calendar, attendance, etc.
  const employeePerms = allPerms.filter((p) =>
    ['tasks', 'task-groups', 'works', 'reports', 'enquiries', 'clients', 'client-works', 'calendar', 'attendance', 'notifications', 'files'].includes(p.module) &&
    ['view', 'create'].includes(p.action)
  );
  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: { description: 'Task and report access' },
    create: {
      name: 'employee',
      description: 'Task and report access',
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: employeeRole.id } });
  await prisma.rolePermission.createMany({
    data: employeePerms.map((p) => ({ roleId: employeeRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Accountant - payments, quotations, products, clients, dashboard
  const accountantPerms = allPerms.filter((p) =>
    ['payments', 'quotations', 'products', 'clients', 'dashboard'].includes(p.module)
  );
  const accountantRole = await prisma.role.upsert({
    where: { name: 'accountant' },
    update: { description: 'Financial access' },
    create: {
      name: 'accountant',
      description: 'Financial access',
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: accountantRole.id } });
  await prisma.rolePermission.createMany({
    data: accountantPerms.map((p) => ({ roleId: accountantRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Ensure an admin user exists if none present
  const adminExists = await prisma.user.findFirst({
    where: { roleId: adminRole.id },
  });
  if (!adminExists) {
    const adminPass = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@webbeacrm.com',
        password: adminPass,
        phone: '9876543210',
        roleId: adminRole.id,
      },
    });
  }

  console.log('✅ System permissions & roles synchronized successfully (no dummy data created)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
