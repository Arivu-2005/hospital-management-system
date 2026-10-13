<<<<<<< HEAD
# CareLedger – Hospital Management System

A browser-based hospital management application for patient records, doctor information,
appointments, billing and administrative operations.

## Run it
Open `index.html` in any modern browser. No install, no server.

## Features
- **Dashboard** – today's schedule (mark completed), ward occupancy, unpaid invoices (mark paid), animated ECG header
- **Patients** – register, admit/discharge, medical notes, profile view with visit and billing history
- **Doctors** – department, specialization, consulting days, on duty / on leave
- **Appointments** – double-booking check, on-leave check, quick "mark completed"
- **Billing** – itemised invoices, live totals, discount %, payment status, printable invoice
- **Departments** – head of department, bed capacity and live occupancy
- **Data and backup** – export/import JSON, restore sample data, delete all records
- CRUD on every module with search, filter, sort, paging and validation
- Delete protection: a record linked to others (e.g. a patient with appointments) cannot be removed

## Technologies used
HTML5, CSS3 (Grid, Flexbox, custom properties, responsive), JavaScript (ES6, no frameworks),
localStorage as the database layer, relational schema in `database/schema.sql`.

## Structure
```
index.html
css/style.css
js/db.js      database layer: tables, codes, foreign-key checks, import/export
js/ui.js      helpers: modal, toast, forms, icons, formatting
js/crud.js    reusable CRUD engine (list, search, sort, paging, forms)
js/views.js   patients, doctors, appointments, billing, departments, dashboard, settings
js/app.js     navigation and hash router
database/schema.sql
```

## Moving to a real backend
`js/db.js` is the only file that touches storage. Replace its functions with `fetch()` calls to
a Node/Express, Django or Spring API backed by MySQL/PostgreSQL using `database/schema.sql`.
=======
# hospital-management-system
A Hospital Management System designed to manage patient records, doctor information, appointments, and billing with complete CRUD functionality.
>>>>>>> f32f6c36260d3e21cca4b09d0beee6d0bf7d4a7e
