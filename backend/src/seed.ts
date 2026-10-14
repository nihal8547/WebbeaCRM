import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // Permissions
  const modules = ['dashboard', 'clients', 'client-works', 'enquiries', 'tasks', 'task-groups', 'quotations', 'payments', 'reports', 'users', 'roles'];
  const actions = ['view', 'create', 'edit', 'delete'];

  const permissionsData = modules.flatMap((m) =>
    actions.map((a) => ({ module: m, action: a, description: `${a} ${m}` }))
  );

  for (const p of permissionsData) {
    await prisma.permission.upsert({ where: { module_action: { module: p.module, action: p.action } }, update: {}, create: p });
  }

  const allPerms = await prisma.permission.findMany();

  // Admin role - all permissions
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Full system access',
      permissions: { create: allPerms.map((p) => ({ permissionId: p.id })) },
    },
  });

  // Manager - all except users/roles
  const managerPerms = allPerms.filter((p) => !['users', 'roles'].includes(p.module));
  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      description: 'Manage all operations',
      permissions: { create: managerPerms.map((p) => ({ permissionId: p.id })) },
    },
  });

  // Employee - tasks, reports, enquiries view
  const employeePerms = allPerms.filter((p) =>
    ['tasks', 'task-groups', 'reports', 'enquiries', 'clients', 'client-works'].includes(p.module) &&
    ['view', 'create'].includes(p.action)
  );
  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: {
      name: 'employee',
      description: 'Task and report access',
      permissions: { create: employeePerms.map((p) => ({ permissionId: p.id })) },
    },
  });

  // Accountant - payments, quotations
  const accountantPerms = allPerms.filter((p) =>
    ['payments', 'quotations', 'clients', 'dashboard'].includes(p.module)
  );
  const accountantRole = await prisma.role.upsert({
    where: { name: 'accountant' },
    update: {},
    create: {
      name: 'accountant',
      description: 'Financial access',
      permissions: { create: accountantPerms.map((p) => ({ permissionId: p.id })) },
    },
  });

  // Admin user
  const adminPass = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@webbeacrm.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@webbeacrm.com',
      password: adminPass,
      phone: '9876543210',
      roleId: adminRole.id,
    },
  });

  // Sample manager
  const managerPass = await bcrypt.hash('manager123', 10);
  await prisma.user.upsert({
    where: { email: 'manager@webbeacrm.com' },
    update: {},
    create: {
      name: 'Rahul Manager',
      email: 'manager@webbeacrm.com',
      password: managerPass,
      phone: '9876543211',
      roleId: managerRole.id,
    },
  });

  // Sample clients
  const clients = [
    { name: 'Arun Kumar', email: 'arun@example.com', phone: '9876543220', company: 'AK Enterprises', address: 'Kochi, Kerala' },
    { name: 'Priya Nair', email: 'priya@example.com', phone: '9876543221', company: 'PN Solutions', address: 'Trivandrum, Kerala' },
    { name: 'Suresh Menon', email: 'suresh@example.com', phone: '9876543222', company: 'SM Trading', address: 'Thrissur, Kerala' },
  ];

  for (const c of clients) {
    const existing = await prisma.client.findFirst({ where: { phone: c.phone } });
    if (!existing) await prisma.client.create({ data: c });
  }

  console.log('✅ Seed completed!');
  console.log('Login: admin@webbeacrm.com / admin123');
  console.log('Login: manager@webbeacrm.com / manager123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
