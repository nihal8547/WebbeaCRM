# WebbeaCRM

A complete CRM system built with React + Node.js + SQLite.

## Features
- **Dashboard** – Overview stats, recent tasks, overdue works
- **Clients** – Client profiles with GST, address, contacts
- **Client Works** – Multiple works per client with start/end dates, duration tracking, progress %
- **Task Management** – Daily/Monthly/Weekly tasks, task groups, priority & status
- **Task Groups** – Group related tasks, track group completion
- **Enquiries** – Lead tracking with follow-up dates, source tracking
- **Quotations** – Create quotations with line items, discount, tax
- **Payments** – Payment tracking, multiple methods (Cash/UPI/Bank/Cheque)
- **Work Reports** – Daily/Monthly employee reports with hours tracking
- **Users** – User creation with role assignment
- **Roles & Permissions** – Fine-grained access control per module

## Roles
| Role | Access |
|------|--------|
| Admin | Full access |
| Manager | All except user management |
| Employee | Tasks, reports, enquiries |
| Accountant | Payments, quotations, clients |

## Setup

### Backend
```bash
cd backend
npm install
npm run seed    # Creates DB and seeds sample data
npm run dev     # Starts on port 5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev     # Starts on port 3000
```

## Login
- **Admin**: admin@webbeacrm.com / admin123
- **Manager**: manager@webbeacrm.com / manager123
