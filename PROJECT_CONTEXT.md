
# Library Management System - Project Context

## Overview
The Library Management System (LMS) is a web-based application designed to automate and streamline the management of library resources, users, and transactions. Built with PHP (backend), MySQL (database), and HTML/CSS/JavaScript (frontend), it provides a comprehensive solution for librarians and library members to manage books, borrowing, returns, and user accounts efficiently.

## Technology Stack
- **Frontend:** HTML, CSS (Bootstrap), JavaScript
- **Backend:** PHP
- **Database:** MySQL

## Project Structure
- **Root Directory:** Main entry points and shared PHP files (e.g., `index.php`, `login.php`, `signup.php`, `dbcon.php`, `header.php`, `footer.php`).
- **css/**: Stylesheets for layout and design, including Bootstrap and custom styles.
- **db/**: Database scripts and backups (e.g., `eb_lms.sql`).
- **font/**: Font files for UI typography.
- **images5/**: Image assets for the website.
- **js/**: JavaScript files for interactivity.
- **librarian/**: Core module for librarian operations (book, member, transaction management, etc.).
- **library/**, **LMS/**: Additional modules/resources (e.g., images, assets, or legacy code).
- **scripts/**: Additional scripts.
- **PROJECT REPORT/**, **PPTs/**: Documentation and presentation materials.
- **screenshots/**: UI screenshots.

## User Roles & Permissions
- **Librarian/Admin:**
	- Add, edit, delete, and view books
	- Manage members (add, edit, delete, view)
	- Issue and return books
	- Manage user accounts (add, edit, delete users)
	- View transaction history
- **Member/User:**
	- Register and log in
	- View/search books
	- View own borrowing history

## Main Modules & Workflows

### 1. Authentication & User Management
- **login.php, signup.php, logout.php:** Handle user authentication and registration.
- **users.php:** Admin can add, edit, or delete user accounts.

### 2. Book Management
- **books.php:** List all books with options to add, edit, delete, or print book records.
- **add_books.php, books_save.php:** Add new books to the system.
- **edit_book.php, update_books.php:** Edit existing book details.
- **delete_books.php:** Archive (soft-delete) books.

### 3. Member Management
- **member.php:** List all members with options to add, edit, or delete.
- **add_member.php, member_save.php:** Add new members.
- **edit_member.php, update_member.php:** Edit member details.
- **delete_member.php:** Remove members from the system.

### 4. Borrowing & Returning Books
- **borrow.php, borrow_save.php:** Issue books to members. Select member, due date, and books to borrow.
- **return.php, return_save.php:** Process book returns and update status.
- **view_borrow.php, view_return.php:** View all borrowed and returned books, including borrower details and dates.

### 5. Transactions & Reports
- **transaction.php:** View and manage all transactions.
- **Print and export:** Print book and transaction tables for records.

### 6. Additional Features
- **Captcha:** Security for login/signup (see `generatecaptcha.php`).
- **Password Management:** Change password functionality (`change_password.php`).
- **Navigation:** Modular navigation bars for different sections (e.g., `navbar_books.php`, `navbar_member.php`).

## Database Schema (Summary)
The main tables in the MySQL database (`eb_lms`) include:

- **book**: Stores book details (title, author, category, copies, publisher, ISBN, status, etc.)
- **category**: Book categories (e.g., Science, Math, English)
- **member**: Library members (name, gender, address, contact, type, year level, status)
- **users**: System users (username, password, first/last name)
- **borrow**: Borrow transactions (member, date borrowed, due date)
- **borrowdetails**: Details of each borrowed book (book, borrow, status, date returned)
- **type**: Types of borrowers (e.g., Student, Teacher)

See `db/eb_lms.sql` for full schema and sample data.

## Typical Workflows

### Book Borrowing
1. Librarian selects a member and due date.
2. Selects one or more books to borrow.
3. System records the transaction in `borrow` and `borrowdetails` tables.

### Book Returning
1. Librarian selects the borrowed book to return.
2. System updates the status in `borrowdetails` and records the return date.

### Member Management
1. Librarian adds/edits/deletes member records.
2. Members can be students, teachers, or other types.

### Book Management
1. Librarian adds new books with all details.
2. Can edit or archive (soft-delete) books.

### User Management
1. Admin adds/edits/deletes system users (librarians).

## Security & Validation
- User authentication for all sensitive operations
- Captcha for login/signup
- Input validation on forms
- Role-based access (librarian vs. member)

## Customization & Extension
- Update styles in `css/` for branding
- Add new modules or features as needed
- Extend database schema for more functionality (e.g., fines, notifications)

## Documentation
- This file provides a detailed context and reference for the project.
- See `README.md` for setup and installation instructions.
- Refer to `PROJECT REPORT/` for in-depth documentation and system design.

---
_Last updated: August 11, 2025_
