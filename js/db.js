/* ==========================================================
   db.js  –  tiny relational "database" on top of localStorage
   Tables: departments, doctors, patients, appointments, invoices
   Provides CRUD, auto-generated codes and referential checks.
   ========================================================== */

const D = {
  pad: n => String(n).padStart(2, '0'),
  iso(d) { return d.getFullYear() + '-' + D.pad(d.getMonth() + 1) + '-' + D.pad(d.getDate()); },
  today() { return D.iso(new Date()); },
  offset(n) { const d = new Date(); d.setDate(d.getDate() + n); return D.iso(d); }
};

const DB = (() => {
  const KEY = 'careledger.v1';
  const TABLES = ['departments', 'doctors', 'patients', 'appointments', 'invoices'];
  const PREFIX = { patients: 'PT', doctors: 'DR', appointments: 'AP', invoices: 'INV' };
  const START = { patients: 1001, doctors: 201, appointments: 5001, invoices: 9001 };

  // Foreign keys: a record in `table` points at `refTable` through `field`
  const REFS = [
    { table: 'appointments', field: 'patientId',    refTable: 'patients',    label: 'appointment' },
    { table: 'invoices',     field: 'patientId',    refTable: 'patients',    label: 'invoice' },
    { table: 'appointments', field: 'doctorId',     refTable: 'doctors',     label: 'appointment' },
    { table: 'departments',  field: 'headId',       refTable: 'doctors',     label: 'department headed' },
    { table: 'doctors',      field: 'departmentId', refTable: 'departments', label: 'doctor' },
    { table: 'patients',     field: 'departmentId', refTable: 'departments', label: 'patient' }
  ];

  let data = load();

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn('Could not read saved data', e); }
    const s = seed();
    persist(s);
    return s;
  }

  function persist(s = data) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (e) { console.warn('Could not save data', e); }
  }

  function blank() {
    const s = { counters: { ...START } };
    TABLES.forEach(t => s[t] = []);
    return s;
  }

  function seed() {
    const s = blank();
    const t = D.today();

    s.departments = [
      { id: 'd1', name: 'Cardiology',       headId: 'dr1', floor: '2', beds: 20, phone: '044-2201-1101' },
      { id: 'd2', name: 'Orthopaedics',     headId: 'dr2', floor: '3', beds: 16, phone: '044-2201-1102' },
      { id: 'd3', name: 'Paediatrics',      headId: 'dr3', floor: '1', beds: 14, phone: '044-2201-1103' },
      { id: 'd4', name: 'General Medicine', headId: 'dr4', floor: '1', beds: 24, phone: '044-2201-1104' },
      { id: 'd5', name: 'Neurology',        headId: 'dr5', floor: '4', beds: 12, phone: '044-2201-1105' },
      { id: 'd6', name: 'Emergency',        headId: 'dr6', floor: 'G', beds: 10, phone: '044-2201-1100' }
    ];

    s.doctors = [
      { id: 'dr1', code: 'DR-201', name: 'Dr. Meenakshi Raman',     departmentId: 'd1', specialization: 'Interventional cardiology', phone: '98400 11201', email: 'meenakshi.raman@careledger.test', fee: 900,  days: 'Mon, Wed, Fri',   status: 'On duty' },
      { id: 'dr2', code: 'DR-202', name: 'Dr. Arjun Venkatesh',     departmentId: 'd2', specialization: 'Joint replacement',         phone: '98400 11202', email: 'arjun.venkatesh@careledger.test', fee: 800,  days: 'Tue, Thu, Sat',   status: 'On duty' },
      { id: 'dr3', code: 'DR-203', name: 'Dr. Farah Siddiqui',      departmentId: 'd3', specialization: 'Child health',              phone: '98400 11203', email: 'farah.siddiqui@careledger.test',  fee: 600,  days: 'Mon to Sat',      status: 'On duty' },
      { id: 'dr4', code: 'DR-204', name: 'Dr. Karthik Subramanian', departmentId: 'd4', specialization: 'Internal medicine',         phone: '98400 11204', email: 'karthik.s@careledger.test',       fee: 500,  days: 'Mon to Fri',      status: 'On duty' },
      { id: 'dr5', code: 'DR-205', name: 'Dr. Lakshmi Narayanan',   departmentId: 'd5', specialization: 'Stroke and epilepsy',       phone: '98400 11205', email: 'lakshmi.n@careledger.test',       fee: 1000, days: 'Tue, Fri',        status: 'On leave' },
      { id: 'dr6', code: 'DR-206', name: 'Dr. Imran Pasha',         departmentId: 'd6', specialization: 'Emergency care',            phone: '98400 11206', email: 'imran.pasha@careledger.test',     fee: 700,  days: 'Rotating shifts', status: 'On duty' }
    ];

    s.patients = [
      { id: 'p1', code: 'PT-1001', name: 'Ravi Kumar',      age: 54, gender: 'Male',   blood: 'B+',  phone: '98410 20001', email: 'ravi.kumar@mail.test',  address: '12 Gandhi Street, Adyar, Chennai',       status: 'Admitted',   departmentId: 'd1', room: 'C-204',    notes: 'Hypertension. Allergic to penicillin.',  registered: D.offset(-12) },
      { id: 'p2', code: 'PT-1002', name: 'Anitha Sundaram', age: 34, gender: 'Female', blood: 'O+',  phone: '98410 20002', email: 'anitha.s@mail.test',    address: '7 Lake View Road, Velachery, Chennai',   status: 'Outpatient', departmentId: '',   room: '',         notes: 'Migraine, follow-up every 3 months.',     registered: D.offset(-40) },
      { id: 'p3', code: 'PT-1003', name: 'Mohammed Yusuf',  age: 67, gender: 'Male',   blood: 'A+',  phone: '98410 20003', email: '',                      address: '41 Mosque Street, Triplicane, Chennai',  status: 'Admitted',   departmentId: 'd2', room: 'Ortho-12', notes: 'Recovering after hip replacement.',       registered: D.offset(-6) },
      { id: 'p4', code: 'PT-1004', name: 'Divya Prakash',   age: 8,  gender: 'Female', blood: 'AB+', phone: '98410 20004', email: '',                      address: '88 Temple Road, Mylapore, Chennai',      status: 'Outpatient', departmentId: '',   room: '',         notes: 'Seasonal asthma.',                        registered: D.offset(-90) },
      { id: 'p5', code: 'PT-1005', name: 'Suresh Babu',     age: 45, gender: 'Male',   blood: 'O-',  phone: '98410 20005', email: 'suresh.babu@mail.test', address: '3 Beach Road, Besant Nagar, Chennai',    status: 'Outpatient', departmentId: '',   room: '',         notes: 'Type 2 diabetes.',                        registered: D.offset(-25) },
      { id: 'p6', code: 'PT-1006', name: 'Kavitha Rajan',   age: 29, gender: 'Female', blood: 'B-',  phone: '98410 20006', email: 'kavitha.r@mail.test',   address: '19 Park Avenue, Anna Nagar, Chennai',    status: 'Discharged', departmentId: '',   room: '',         notes: 'Discharged after observation.',           registered: D.offset(-15) },
      { id: 'p7', code: 'PT-1007', name: 'Joseph Antony',   age: 72, gender: 'Male',   blood: 'A-',  phone: '98410 20007', email: '',                      address: '56 Church Lane, Perambur, Chennai',      status: 'Admitted',   departmentId: 'd5', room: 'N-07',     notes: 'Post-stroke monitoring.',                 registered: D.offset(-3) },
      { id: 'p8', code: 'PT-1008', name: 'Priya Natarajan', age: 38, gender: 'Female', blood: 'B+',  phone: '98410 20008', email: 'priya.n@mail.test',     address: '27 Garden Street, T. Nagar, Chennai',    status: 'Outpatient', departmentId: '',   room: '',         notes: '',                                        registered: D.offset(-1) }
    ];

    s.appointments = [
      { id: 'a1',  code: 'AP-5001', patientId: 'p2', doctorId: 'dr4', date: t,            time: '09:30', type: 'Follow-up',    status: 'Completed', reason: 'Migraine review' },
      { id: 'a2',  code: 'AP-5002', patientId: 'p5', doctorId: 'dr4', date: t,            time: '10:15', type: 'Consultation', status: 'Scheduled', reason: 'Blood sugar check' },
      { id: 'a3',  code: 'AP-5003', patientId: 'p4', doctorId: 'dr3', date: t,            time: '11:00', type: 'Follow-up',    status: 'Scheduled', reason: 'Asthma inhaler review' },
      { id: 'a4',  code: 'AP-5004', patientId: 'p1', doctorId: 'dr1', date: t,            time: '14:30', type: 'Follow-up',    status: 'Scheduled', reason: 'ECG and medication review' },
      { id: 'a5',  code: 'AP-5005', patientId: 'p8', doctorId: 'dr4', date: t,            time: '16:00', type: 'Consultation', status: 'Scheduled', reason: 'Fever for three days' },
      { id: 'a6',  code: 'AP-5006', patientId: 'p6', doctorId: 'dr4', date: D.offset(-1), time: '12:00', type: 'Follow-up',    status: 'Completed', reason: 'Discharge check' },
      { id: 'a7',  code: 'AP-5007', patientId: 'p3', doctorId: 'dr2', date: D.offset(1),  time: '10:00', type: 'Procedure',    status: 'Scheduled', reason: 'Dressing and physiotherapy plan' },
      { id: 'a8',  code: 'AP-5008', patientId: 'p2', doctorId: 'dr5', date: D.offset(3),  time: '15:30', type: 'Consultation', status: 'Scheduled', reason: 'Neurology second opinion' },
      { id: 'a9',  code: 'AP-5009', patientId: 'p5', doctorId: 'dr1', date: D.offset(-4), time: '11:30', type: 'Consultation', status: 'Cancelled', reason: 'Patient asked for a later date' },
      { id: 'a10', code: 'AP-5010', patientId: 'p8', doctorId: 'dr3', date: D.offset(-7), time: '17:00', type: 'Consultation', status: 'No-show',   reason: 'Child vaccination query' }
    ];

    s.invoices = [
      { id: 'i1', code: 'INV-9001', patientId: 'p1', date: D.offset(-10), discount: 0,  status: 'Pending',         method: 'Insurance', items: [{ desc: 'Cardiac ward, per day', qty: 5, rate: 4500 }, { desc: 'ECG and echo', qty: 1, rate: 3200 }, { desc: 'Medication', qty: 1, rate: 5400 }] },
      { id: 'i2', code: 'INV-9002', patientId: 'p2', date: t,             discount: 0,  status: 'Paid',            method: 'UPI',       items: [{ desc: 'Consultation – General Medicine', qty: 1, rate: 500 }] },
      { id: 'i3', code: 'INV-9003', patientId: 'p3', date: D.offset(-5),  discount: 5,  status: 'Insurance claim', method: 'Insurance', items: [{ desc: 'Hip replacement surgery', qty: 1, rate: 185000 }, { desc: 'Ortho ward, per day', qty: 5, rate: 3800 }] },
      { id: 'i4', code: 'INV-9004', patientId: 'p6', date: D.offset(-1),  discount: 10, status: 'Paid',            method: 'Card',      items: [{ desc: 'Observation bed, per day', qty: 2, rate: 2800 }, { desc: 'Lab tests', qty: 1, rate: 1650 }] },
      { id: 'i5', code: 'INV-9005', patientId: 'p5', date: D.offset(-2),  discount: 0,  status: 'Pending',         method: 'Cash',      items: [{ desc: 'HbA1c and lipid profile', qty: 1, rate: 1400 }] }
    ];

    s.counters = { patients: 1009, doctors: 207, appointments: 5011, invoices: 9006 };
    return s;
  }

  const clone = o => JSON.parse(JSON.stringify(o));

  return {
    TABLES,
    all: table => clone(data[table] || []),
    get: (table, id) => { const r = (data[table] || []).find(x => x.id === id); return r ? clone(r) : null; },

    insert(table, rec) {
      const row = { ...clone(rec), id: uid() };
      if (PREFIX[table]) {
        row.code = PREFIX[table] + '-' + data.counters[table];
        data.counters[table]++;
      }
      data[table].push(row);
      persist();
      return clone(row);
    },

    update(table, id, patch) {
      const i = data[table].findIndex(x => x.id === id);
      if (i < 0) return null;
      data[table][i] = { ...data[table][i], ...clone(patch), id };
      persist();
      return clone(data[table][i]);
    },

    remove(table, id) {
      data[table] = data[table].filter(x => x.id !== id);
      persist();
    },

    /* Which records still point at this one? Returns readable strings. */
    usage(table, id) {
      return REFS.filter(r => r.refTable === table).map(r => {
        const n = data[r.table].filter(x => x[r.field] === id).length;
        return n ? `${n} ${r.label}${n > 1 ? 's' : ''}` : '';
      }).filter(Boolean);
    },

    subtotal: inv => (inv.items || []).reduce((s, i) => s + i.qty * i.rate, 0),
    total(inv) {
      const sub = (inv.items || []).reduce((s, i) => s + i.qty * i.rate, 0);
      return Math.round(sub * (1 - (inv.discount || 0) / 100) * 100) / 100;
    },

    exportJSON: () => JSON.stringify(data, null, 2),

    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!TABLES.every(t => Array.isArray(parsed[t]))) throw new Error('This file is not a CareLedger backup.');
      parsed.counters = { ...START, ...(parsed.counters || {}) };
      data = parsed;
      persist();
    },

    reset() { data = seed(); persist(); },
    clearAll() { data = blank(); persist(); }
  };
})();
