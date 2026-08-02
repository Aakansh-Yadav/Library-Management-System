# Online Library Management System

A web-based library management system that automates traditional manual library operations to improve efficiency and data accuracy.

**Project Duration:** September 2025 – October 2025

## Features

- **Role-Based Access Control (RBAC)** — Separate interfaces for Librarians and Regular Users
- **Book Management** — Full CRUD operations for the book catalog
- **Issue/Return Tracking** — Manage book lending, returns, and due dates
- **User Management** — Create and manage library member profiles
- **Record Maintenance** — Complete activity logs for all transactions

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js with Express
- **Database:** SQLite (via better-sqlite3)
- **Authentication:** JWT-based with bcrypt password hashing

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)

### Installation

```bash
cd library-management-system
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Accounts

| Role      | Email                  | Password      |
|-----------|------------------------|---------------|
| Librarian | librarian@library.com  | librarian123  |
| User      | user@library.com       | user123       |

## Project Structure

```
library-management-system/
├── server.js              # Express server entry point
├── database/
│   └── init.js            # SQLite schema & seed data
├── middleware/
│   └── auth.js            # JWT authentication & RBAC
├── routes/
│   ├── auth.js            # Login & session
│   ├── books.js           # Book CRUD
│   ├── issues.js          # Issue/return tracking
│   ├── users.js           # User management
│   └── records.js         # Activity logs & stats
└── public/
    ├── index.html         # Login page
    ├── librarian.html     # Librarian dashboard
    ├── user.html          # User dashboard
    ├── css/style.css
    └── js/                # Frontend logic
```

## API Endpoints

| Method | Endpoint                  | Access    | Description          |
|--------|---------------------------|-----------|----------------------|
| POST   | /api/auth/login           | Public    | User login           |
| GET    | /api/books                | Auth      | List/search books    |
| POST   | /api/books                | Librarian | Add book             |
| PUT    | /api/books/:id            | Librarian | Update book          |
| DELETE | /api/books/:id            | Librarian | Remove book          |
| GET    | /api/issues               | Auth      | List issue records   |
| POST   | /api/issues/issue         | Librarian | Issue book to user   |
| POST   | /api/issues/:id/return    | Librarian | Mark book returned   |
| POST   | /api/issues/request       | User      | Self-service borrow  |
| GET    | /api/users                | Librarian | List all users       |
| POST   | /api/users                | Librarian | Create user          |
| GET    | /api/records              | Librarian | View activity logs   |
| GET    | /api/records/stats        | Librarian | Dashboard statistics |

## License

MIT
