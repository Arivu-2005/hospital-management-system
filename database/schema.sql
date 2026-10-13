-- CareLedger relational schema (reference design)
-- The browser app mirrors these tables in localStorage (js/db.js).
-- Use this file to move the project to MySQL / PostgreSQL / SQLite.

CREATE TABLE departments (
  id          INTEGER PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL UNIQUE,
  head_id     INTEGER,                      -- FK -> doctors.id (added below)
  floor       VARCHAR(5),
  beds        INTEGER      NOT NULL CHECK (beds >= 0),
  phone       VARCHAR(20)
);

CREATE TABLE doctors (
  id             INTEGER PRIMARY KEY,
  code           VARCHAR(12)  NOT NULL UNIQUE,
  name           VARCHAR(100) NOT NULL,
  department_id  INTEGER      NOT NULL REFERENCES departments(id),
  specialization VARCHAR(100) NOT NULL,
  phone          VARCHAR(20)  NOT NULL,
  email          VARCHAR(120),
  fee            DECIMAL(10,2) NOT NULL CHECK (fee >= 0),
  days           VARCHAR(60),
  status         VARCHAR(10)  NOT NULL CHECK (status IN ('On duty','On leave'))
);

ALTER TABLE departments ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_id) REFERENCES doctors(id);

CREATE TABLE patients (
  id             INTEGER PRIMARY KEY,
  code           VARCHAR(12)  NOT NULL UNIQUE,
  name           VARCHAR(100) NOT NULL,
  age            INTEGER      NOT NULL CHECK (age BETWEEN 0 AND 120),
  gender         VARCHAR(10)  NOT NULL,
  blood_group    VARCHAR(4),
  phone          VARCHAR(20)  NOT NULL,
  email          VARCHAR(120),
  address        TEXT,
  status         VARCHAR(12)  NOT NULL CHECK (status IN ('Outpatient','Admitted','Discharged')),
  department_id  INTEGER REFERENCES departments(id),  -- ward, when admitted
  room           VARCHAR(20),
  notes          TEXT,
  registered_on  DATE NOT NULL
);

CREATE TABLE appointments (
  id          INTEGER PRIMARY KEY,
  code        VARCHAR(12) NOT NULL UNIQUE,
  patient_id  INTEGER NOT NULL REFERENCES patients(id),
  doctor_id   INTEGER NOT NULL REFERENCES doctors(id),
  visit_date  DATE    NOT NULL,
  visit_time  TIME    NOT NULL,
  type        VARCHAR(15) NOT NULL,
  status      VARCHAR(10) NOT NULL CHECK (status IN ('Scheduled','Completed','Cancelled','No-show')),
  reason      TEXT,
  UNIQUE (doctor_id, visit_date, visit_time)       -- no double-booking
);

CREATE TABLE invoices (
  id          INTEGER PRIMARY KEY,
  code        VARCHAR(12) NOT NULL UNIQUE,
  patient_id  INTEGER NOT NULL REFERENCES patients(id),
  invoice_date DATE   NOT NULL,
  discount    DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
  method      VARCHAR(10) NOT NULL,
  status      VARCHAR(15) NOT NULL CHECK (status IN ('Pending','Insurance claim','Paid'))
);

CREATE TABLE invoice_items (
  id          INTEGER PRIMARY KEY,
  invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(160) NOT NULL,
  qty         INTEGER NOT NULL CHECK (qty >= 1),
  rate        DECIMAL(10,2) NOT NULL CHECK (rate >= 0)
);

-- Example report: unpaid balance per patient
-- SELECT p.name, SUM(ii.qty * ii.rate * (1 - i.discount/100)) AS due
-- FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id
-- JOIN patients p ON p.id = i.patient_id
-- WHERE i.status <> 'Paid' GROUP BY p.name;
