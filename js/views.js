/* ==========================================================
   views.js  –  hospital modules: patients, doctors,
   appointments, billing, departments + dashboard + settings
   ========================================================== */

const Views = {};

/* ---------- lookups ---------- */
const nm = (table, id) => { const r = DB.get(table, id); return r ? r.name : '—'; };
const byName = (a, b) => a.name.localeCompare(b.name);
const OPT = {
  patients: () => DB.all('patients').sort(byName).map(p => ({ value: p.id, label: `${p.name} (${p.code})` })),
  doctors: () => DB.all('doctors').sort(byName).map(d => ({ value: d.id, label: `${d.name}, ${nm('departments', d.departmentId)}` })),
  departments: () => DB.all('departments').sort(byName).map(d => ({ value: d.id, label: d.name })),
  headDoctors: () => DB.all('doctors').sort(byName).map(d => ({ value: d.id, label: d.name }))
};
const PHONE_RE = /^[+\d][\d\s-]{7,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const subLine = (...parts) => parts.filter(Boolean).join(', ');

/* ==========================================================
   PATIENTS
   ========================================================== */
const patientsCrud = createCrud({
  table: 'patients', title: 'Patients', singular: 'patient',
  subtitle: 'Registration, admission status and medical notes.',
  searchHint: 'Search by name, code, phone or blood group',
  emptyHint: 'Register the first patient to start booking appointments and bills.',
  sort: { key: 'registered', dir: 'desc' }, wide: true,
  searchText: p => [p.name, p.code, p.phone, p.blood, p.email].join(' '),
  filter: { label: 'Status', all: 'All statuses', options: () => ['Admitted', 'Outpatient', 'Discharged'], get: p => p.status },
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'name', label: 'Patient', render: p => `<button class="link" data-open>${esc(p.name)}</button>` },
    { key: 'age', label: 'Age / sex', render: p => `${p.age} ${esc(p.gender.charAt(0))}`, cls: 'num' },
    { key: 'blood', label: 'Blood' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status', render: p => chip(p.status) },
    { key: 'departmentId', label: 'Ward', sortValue: p => nm('departments', p.departmentId), render: p => p.status === 'Admitted' ? esc(subLine(nm('departments', p.departmentId), p.room)) : '—' },
    { key: 'registered', label: 'Registered', render: p => fmtDate(p.registered) }
  ],
  fields: [
    { name: 'name', label: 'Full name', required: true, full: true },
    { name: 'age', label: 'Age', type: 'number', required: true, min: 0, max: 120 },
    { name: 'gender', label: 'Gender', type: 'select', required: true, options: ['Female', 'Male', 'Other'] },
    { name: 'blood', label: 'Blood group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '98410 20001' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'status', label: 'Status', type: 'select', required: true, options: ['Outpatient', 'Admitted', 'Discharged'], default: 'Outpatient', placeholder: 'Select status' },
    { name: 'departmentId', label: 'Ward department', type: 'select', options: OPT.departments, placeholder: 'None', hint: 'Needed when the patient is admitted.' },
    { name: 'room', label: 'Room or bed', placeholder: 'C-204' },
    { name: 'address', label: 'Address', type: 'textarea', full: true },
    { name: 'notes', label: 'Allergies and medical notes', type: 'textarea', full: true }
  ],
  defaults: () => ({ status: 'Outpatient', registered: D.today() }),
  validate(v) {
    if (!PHONE_RE.test(v.phone)) return { message: 'Enter a valid phone number, for example 98410 20001.', field: 'phone' };
    if (v.email && !EMAIL_RE.test(v.email)) return { message: 'Enter an email like name@example.com.', field: 'email' };
    if (v.status === 'Admitted' && !v.departmentId) return { message: 'Choose the ward department for an admitted patient.', field: 'departmentId' };
  },
  beforeSave(v, rec) {
    if (v.status !== 'Admitted') { v.departmentId = ''; v.room = ''; }
    v.registered = rec ? rec.registered : D.today();
  },
  open: id => showPatient(id)
});

function showPatient(id) {
  const p = DB.get('patients', id);
  if (!p) return;
  const appts = DB.all('appointments').filter(a => a.patientId === id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const invs = DB.all('invoices').filter(i => i.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const owed = invs.filter(i => i.status !== 'Paid').reduce((s, i) => s + DB.total(i), 0);

  const body = `
    <dl class="facts">
      <div><dt>Patient ID</dt><dd>${esc(p.code)}</dd></div>
      <div><dt>Age and sex</dt><dd>${p.age}, ${esc(p.gender)}</dd></div>
      <div><dt>Blood group</dt><dd>${esc(p.blood || '—')}</dd></div>
      <div><dt>Status</dt><dd>${chip(p.status)} ${p.status === 'Admitted' ? esc(subLine(nm('departments', p.departmentId), p.room)) : ''}</dd></div>
      <div><dt>Phone</dt><dd>${esc(p.phone)}</dd></div>
      <div><dt>Email</dt><dd>${esc(p.email || '—')}</dd></div>
      <div class="wide"><dt>Address</dt><dd>${esc(p.address || '—')}</dd></div>
      <div class="wide"><dt>Medical notes</dt><dd>${esc(p.notes || 'None recorded')}</dd></div>
    </dl>
    <h3>Appointments</h3>
    ${appts.length ? `<ul class="mini-list">${appts.map(a => `
      <li><span>${fmtDate(a.date)}, ${fmtTime(a.time)}</span><span>${esc(nm('doctors', a.doctorId))}, ${esc(a.reason || a.type)}</span>${chip(a.status)}</li>`).join('')}</ul>`
      : '<p class="muted">No appointments booked.</p>'}
    <h3>Billing ${owed ? `<small class="owed">${inr(owed)} outstanding</small>` : ''}</h3>
    ${invs.length ? `<ul class="mini-list">${invs.map(i => `
      <li><span>${esc(i.code)}, ${fmtDate(i.date)}</span><span class="num">${inr(DB.total(i))}</span>${chip(i.status)}</li>`).join('')}</ul>`
      : '<p class="muted">No invoices yet.</p>'}`;

  openModal({
    title: p.name, body, wide: true,
    actions: [{ label: 'Close' }, { label: 'Edit patient', kind: 'primary', onClick: close => { close(); patientsCrud.openForm(DB.get('patients', id)); } }]
  });
}
Views.patients = patientsCrud;

/* ==========================================================
   DOCTORS
   ========================================================== */
Views.doctors = createCrud({
  table: 'doctors', title: 'Doctors', singular: 'doctor',
  subtitle: 'Specialists, consulting days and availability.',
  searchHint: 'Search by name, specialization or code',
  emptyHint: 'Add doctors so appointments can be assigned to them.',
  sort: { key: 'name', dir: 'asc' }, wide: true,
  searchText: d => [d.name, d.code, d.specialization, nm('departments', d.departmentId)].join(' '),
  filter: { label: 'Availability', all: 'All doctors', options: () => ['On duty', 'On leave'], get: d => d.status },
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'name', label: 'Doctor' },
    { key: 'departmentId', label: 'Department', sortValue: d => nm('departments', d.departmentId), render: d => esc(nm('departments', d.departmentId)) },
    { key: 'specialization', label: 'Specialization' },
    { key: 'days', label: 'Consulting days' },
    { key: 'fee', label: 'Fee', cls: 'num', render: d => inr(d.fee) },
    { key: 'status', label: 'Status', render: d => chip(d.status) }
  ],
  fields: [
    { name: 'name', label: 'Full name', required: true, full: true, placeholder: 'Dr. ' },
    { name: 'departmentId', label: 'Department', type: 'select', required: true, options: OPT.departments },
    { name: 'specialization', label: 'Specialization', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'fee', label: 'Consultation fee (₹)', type: 'number', required: true, min: 0 },
    { name: 'days', label: 'Consulting days', placeholder: 'Mon, Wed, Fri' },
    { name: 'status', label: 'Availability', type: 'select', required: true, options: ['On duty', 'On leave'], default: 'On duty', placeholder: 'Select availability' }
  ],
  defaults: () => ({ status: 'On duty' }),
  validate(v) {
    if (!PHONE_RE.test(v.phone)) return { message: 'Enter a valid phone number, for example 98400 11201.', field: 'phone' };
    if (v.email && !EMAIL_RE.test(v.email)) return { message: 'Enter an email like name@example.com.', field: 'email' };
  }
});

/* ==========================================================
   APPOINTMENTS
   ========================================================== */
Views.appointments = createCrud({
  table: 'appointments', title: 'Appointments', singular: 'appointment',
  subtitle: 'Book visits, avoid double-booking and track outcomes.',
  searchHint: 'Search by patient, doctor, reason or code',
  emptyHint: 'Book the first appointment for a registered patient.',
  sort: { key: 'when', dir: 'desc' }, wide: true,
  searchText: a => [a.code, nm('patients', a.patientId), nm('doctors', a.doctorId), a.reason, a.type].join(' '),
  filter: { label: 'Status', all: 'All statuses', options: () => ['Scheduled', 'Completed', 'Cancelled', 'No-show'], get: a => a.status },
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'when', label: 'Date and time', sortValue: a => a.date + a.time, render: a => `${fmtDate(a.date)}<br><span class="muted">${fmtTime(a.time)}</span>` },
    { key: 'patientId', label: 'Patient', sortValue: a => nm('patients', a.patientId), render: a => esc(nm('patients', a.patientId)) },
    { key: 'doctorId', label: 'Doctor', sortValue: a => nm('doctors', a.doctorId), render: a => esc(nm('doctors', a.doctorId)) },
    { key: 'type', label: 'Type' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: a => chip(a.status) }
  ],
  rowActions: [{
    icon: 'check', label: 'Mark completed',
    onClick(a, refresh) {
      if (a.status === 'Completed') { toast('Already marked completed', 'info'); return; }
      DB.update('appointments', a.id, { status: 'Completed' });
      toast('Appointment marked completed');
      refresh();
    }
  }],
  fields: [
    { name: 'patientId', label: 'Patient', type: 'select', required: true, options: OPT.patients, full: true },
    { name: 'doctorId', label: 'Doctor', type: 'select', required: true, options: OPT.doctors, full: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'time', label: 'Time', type: 'time', required: true },
    { name: 'type', label: 'Visit type', type: 'select', required: true, options: ['Consultation', 'Follow-up', 'Procedure', 'Emergency'], default: 'Consultation', placeholder: 'Select visit type' },
    { name: 'status', label: 'Status', type: 'select', required: true, options: ['Scheduled', 'Completed', 'Cancelled', 'No-show'], default: 'Scheduled', placeholder: 'Select status' },
    { name: 'reason', label: 'Reason for visit', type: 'textarea', full: true }
  ],
  defaults: () => ({ date: D.today(), type: 'Consultation', status: 'Scheduled' }),
  validate(v, rec) {
    const doc = DB.get('doctors', v.doctorId);
    if (v.status === 'Scheduled' && doc && doc.status === 'On leave')
      return { message: `${doc.name} is on leave. Pick another doctor or change the doctor's availability first.`, field: 'doctorId' };
    if (v.status !== 'Cancelled') {
      const clash = DB.all('appointments').find(a => a.doctorId === v.doctorId && a.date === v.date && a.time === v.time && a.status !== 'Cancelled' && (!rec || a.id !== rec.id));
      if (clash) return { message: `${nm('doctors', v.doctorId)} already has ${clash.code} at ${fmtTime(v.time)} on ${fmtDate(v.date)}. Choose another time.`, field: 'time' };
    }
  }
});

/* ==========================================================
   BILLING  (invoice with line items)
   ========================================================== */
const itemRowHTML = (it = { desc: '', qty: 1, rate: '' }) => `
  <tr class="item-row">
    <td><input name="desc" aria-label="Item description" value="${esc(it.desc)}" placeholder="Consultation, lab test, ward charge"></td>
    <td><input name="qty" type="number" min="1" step="1" aria-label="Quantity" value="${esc(it.qty)}"></td>
    <td><input name="rate" type="number" min="0" step="0.01" aria-label="Rate in rupees" value="${esc(it.rate)}"></td>
    <td class="num line-total">${inr((Number(it.qty) || 0) * (Number(it.rate) || 0))}</td>
    <td><button type="button" class="icon-btn danger" data-remove-item aria-label="Remove item">${icon('close', 16)}</button></td>
  </tr>`;

const itemsField = {
  name: 'items', label: 'Billable items', type: 'custom', full: true, required: true,
  requiredMsg: 'Add at least one billable item with a description.',
  render: items => `
    <div class="items">
      <table><thead><tr><th>Description</th><th>Qty</th><th>Rate (₹)</th><th class="num">Amount</th><th></th></tr></thead>
      <tbody>${(items && items.length ? items : [undefined]).map(itemRowHTML).join('')}</tbody></table>
      <button type="button" class="btn small" data-add-item>${icon('plus', 16)} Add item</button>
      <dl class="totals">
        <div><dt>Subtotal</dt><dd data-subtotal>₹0</dd></div>
        <div><dt>Discount</dt><dd data-discount>₹0</dd></div>
        <div class="grand"><dt>Total</dt><dd data-total>₹0</dd></div>
      </dl>
    </div>`,
  read: form => $$('.item-row', form).map(r => ({
    desc: $('[name=desc]', r).value.trim(),
    qty: Number($('[name=qty]', r).value),
    rate: Number($('[name=rate]', r).value)
  })).filter(i => i.desc || i.rate),
  bind(form) {
    const body = $('.items tbody', form);
    const recalc = () => {
      let sub = 0;
      $$('.item-row', body).forEach(r => {
        const amt = (Number($('[name=qty]', r).value) || 0) * (Number($('[name=rate]', r).value) || 0);
        $('.line-total', r).textContent = inr(amt);
        sub += amt;
      });
      const pct = Math.min(100, Math.max(0, Number(form.elements.discount.value) || 0));
      const off = sub * pct / 100;
      $('[data-subtotal]', form).textContent = inr(sub);
      $('[data-discount]', form).textContent = '− ' + inr(off);
      $('[data-total]', form).textContent = inr(sub - off);
    };
    form.addEventListener('input', recalc);
    $('[data-add-item]', form).addEventListener('click', () => {
      body.insertAdjacentHTML('beforeend', itemRowHTML());
      $$('.item-row', body).pop().querySelector('input').focus();
    });
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-remove-item]');
      if (!b) return;
      if ($$('.item-row', body).length > 1) { b.closest('tr').remove(); recalc(); }
      else { $$('input', b.closest('tr')).forEach((i, n) => i.value = n === 1 ? 1 : ''); recalc(); }
    });
    recalc();
  }
};

function printInvoice(inv) {
  const p = DB.get('patients', inv.patientId) || {};
  const sub = DB.subtotal(inv), total = DB.total(inv), off = sub - total;
  const rows = inv.items.map(i => `<tr><td>${esc(i.desc)}</td><td class="r">${i.qty}</td><td class="r">${inr(i.rate)}</td><td class="r">${inr(i.qty * i.rate)}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(inv.code)}</title>
  <style>
    body{font:14px/1.5 'IBM Plex Sans',Arial,sans-serif;color:#13201F;margin:40px auto;max-width:720px;padding:0 20px}
    h1{font-size:26px;margin:0 0 2px} .muted{color:#5C6F6C} .head{display:flex;justify-content:space-between;border-bottom:3px solid #0F3D3A;padding-bottom:14px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-top:18px} th,td{padding:9px 6px;border-bottom:1px solid #D5E0DC;text-align:left} th{font-size:12px;color:#5C6F6C}
    .r{text-align:right} .tot td{border:0;padding:4px 6px} .grand td{font-weight:700;font-size:16px;border-top:2px solid #0F3D3A}
    .stamp{display:inline-block;border:2px solid #0F3D3A;padding:2px 10px;border-radius:4px;font-weight:600}
    @media print{body{margin:0}}
  </style></head><body>
  <div class="head"><div><h1>CareLedger Hospital</h1><div class="muted">12 Health Avenue, Chennai 600 001</div></div>
  <div style="text-align:right"><strong>Invoice ${esc(inv.code)}</strong><br>${fmtDate(inv.date)}<br><span class="stamp">${esc(inv.status)}</span></div></div>
  <div><strong>${esc(p.name || '—')}</strong> (${esc(p.code || '')})<br><span class="muted">${esc(p.phone || '')}</span></div>
  <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <table class="tot"><tr><td></td><td class="r muted">Subtotal</td><td class="r" style="width:120px">${inr(sub)}</td></tr>
  <tr><td></td><td class="r muted">Discount (${inv.discount || 0}%)</td><td class="r">− ${inr(off)}</td></tr>
  <tr class="grand"><td></td><td class="r">Total</td><td class="r">${inr(total)}</td></tr></table>
  <p class="muted">Payment method: ${esc(inv.method)}</p></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { toast('Allow pop-ups to print the invoice', 'error'); return; }
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => w.print(), 300);
}

Views.billing = createCrud({
  table: 'invoices', title: 'Billing', singular: 'invoice',
  subtitle: 'Itemised invoices, discounts and payment status.',
  searchHint: 'Search by invoice, patient or payment method',
  emptyHint: 'Create an invoice for a patient visit or admission.',
  sort: { key: 'date', dir: 'desc' }, wide: true,
  searchText: i => [i.code, nm('patients', i.patientId), i.method, i.status].join(' '),
  filter: { label: 'Payment status', all: 'All invoices', options: () => ['Pending', 'Insurance claim', 'Paid'], get: i => i.status },
  columns: [
    { key: 'code', label: 'Invoice' },
    { key: 'date', label: 'Date', render: i => fmtDate(i.date) },
    { key: 'patientId', label: 'Patient', sortValue: i => nm('patients', i.patientId), render: i => esc(nm('patients', i.patientId)) },
    { key: 'items', label: 'Items', sortValue: i => i.items.length, cls: 'num', render: i => i.items.length },
    { key: 'method', label: 'Method' },
    { key: 'total', label: 'Total', cls: 'num', sortValue: i => DB.total(i), render: i => `<strong>${inr(DB.total(i))}</strong>` },
    { key: 'status', label: 'Status', render: i => chip(i.status) }
  ],
  rowActions: [{ icon: 'print', label: 'Print invoice', onClick: inv => printInvoice(inv) }],
  fields: [
    { name: 'patientId', label: 'Patient', type: 'select', required: true, options: OPT.patients, full: true },
    { name: 'date', label: 'Invoice date', type: 'date', required: true },
    { name: 'method', label: 'Payment method', type: 'select', required: true, options: ['Cash', 'Card', 'UPI', 'Insurance'], placeholder: 'Select method' },
    { name: 'status', label: 'Payment status', type: 'select', required: true, options: ['Pending', 'Insurance claim', 'Paid'], default: 'Pending', placeholder: 'Select status' },
    { name: 'discount', label: 'Discount (%)', type: 'number', min: 0, max: 100, step: '0.5', default: 0 },
    itemsField
  ],
  defaults: () => ({ date: D.today(), status: 'Pending', discount: 0 }),
  validate(v) {
    if (v.items.some(i => !i.desc)) return { message: 'Every item needs a description.', field: 'items' };
    if (v.items.some(i => !(i.qty >= 1) || !(i.rate >= 0))) return { message: 'Check quantity (1 or more) and rate (0 or more) on each item.', field: 'items' };
  },
  beforeSave(v) { v.discount = v.discount === '' ? 0 : v.discount; }
});

/* ==========================================================
   DEPARTMENTS
   ========================================================== */
const admittedIn = id => DB.all('patients').filter(p => p.status === 'Admitted' && p.departmentId === id).length;

Views.departments = createCrud({
  table: 'departments', title: 'Departments', singular: 'department',
  subtitle: 'Wards, department heads and bed capacity.',
  searchHint: 'Search by department or head',
  emptyHint: 'Add the first department, then assign doctors to it.',
  sort: { key: 'name', dir: 'asc' },
  searchText: d => [d.name, nm('doctors', d.headId), d.phone].join(' '),
  columns: [
    { key: 'name', label: 'Department' },
    { key: 'headId', label: 'Head', sortValue: d => nm('doctors', d.headId), render: d => esc(nm('doctors', d.headId)) },
    { key: 'floor', label: 'Floor' },
    { key: 'phone', label: 'Phone' },
    { key: 'doctors', label: 'Doctors', cls: 'num', sortValue: d => DB.all('doctors').filter(x => x.departmentId === d.id).length, render: d => DB.all('doctors').filter(x => x.departmentId === d.id).length },
    { key: 'beds', label: 'Beds in use', sortValue: d => admittedIn(d.id) / (d.beds || 1), render: d => {
      const n = admittedIn(d.id), pct = Math.min(100, Math.round(n / (d.beds || 1) * 100));
      return `<div class="meter-row"><div class="meter" role="img" aria-label="${n} of ${d.beds} beds"><span style="width:${pct}%"></span></div><span class="num">${n}/${d.beds}</span></div>`;
    } }
  ],
  fields: [
    { name: 'name', label: 'Department name', required: true, full: true },
    { name: 'headId', label: 'Head of department', type: 'select', options: OPT.headDoctors, placeholder: 'Not assigned' },
    { name: 'floor', label: 'Floor', placeholder: '2' },
    { name: 'beds', label: 'Total beds', type: 'number', required: true, min: 0, max: 500 },
    { name: 'phone', label: 'Phone', type: 'tel' }
  ],
  validate(v, rec) {
    const dup = DB.all('departments').find(d => d.name.toLowerCase() === v.name.toLowerCase() && (!rec || d.id !== rec.id));
    if (dup) return { message: `A department named ${dup.name} already exists.`, field: 'name' };
  }
});

/* ==========================================================
   DASHBOARD
   ========================================================== */
const ECG_BEAT = 'h40 l8 -10 l8 10 h18 l6 6 l8 -56 l10 70 l8 -20 h20 l10 -14 l12 14 h50';

Views.dashboard = {
  mount() {
    const view = $('#view');
    const t = D.today();
    const patients = DB.all('patients'), appts = DB.all('appointments'), invs = DB.all('invoices');
    const todays = appts.filter(a => a.date === t).sort((a, b) => a.time.localeCompare(b.time));
    const pendingToday = todays.filter(a => a.status === 'Scheduled').length;
    const admitted = patients.filter(p => p.status === 'Admitted').length;
    const unpaid = invs.filter(i => i.status !== 'Paid').sort((a, b) => a.date.localeCompare(b.date));
    const outstanding = unpaid.reduce((s, i) => s + DB.total(i), 0);
    const onDuty = DB.all('doctors').filter(d => d.status === 'On duty').length;
    const hr = new Date().getHours();
    const hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const dateLong = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const depts = DB.all('departments').map(d => ({ ...d, n: admittedIn(d.id) })).sort((a, b) => (b.n / (b.beds || 1)) - (a.n / (a.beds || 1)));

    view.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <h1>${hello}</h1>
          <p>${dateLong}. ${pendingToday ? `${pendingToday} appointment${pendingToday > 1 ? 's' : ''} still to be seen today` : 'No appointments waiting today'} and ${admitted} patient${admitted === 1 ? '' : 's'} admitted.</p>
        </div>
        <svg class="ecg" viewBox="0 0 1188 120" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="1" d="M0 70 ${ECG_BEAT.repeat(1)} ${Array(5).fill(ECG_BEAT).join(' ')}"/>
        </svg>
      </section>

      <section class="ledger" aria-label="Key numbers">
        <div><strong>${patients.length}</strong><span>patients on record</span></div>
        <div><strong>${todays.length}</strong><span>appointments today</span></div>
        <div><strong>${onDuty}</strong><span>doctors on duty</span></div>
        <div><strong>${inr(outstanding)}</strong><span>unpaid across ${unpaid.length} invoice${unpaid.length === 1 ? '' : 's'}</span></div>
      </section>

      <div class="dash-grid">
        <section class="panel">
          <div class="panel-head"><h2>Today's schedule</h2><a href="#/appointments">All appointments</a></div>
          ${todays.length ? `<ul class="rows">${todays.map(a => `
            <li>
              <span class="time">${fmtTime(a.time)}</span>
              <span class="grow"><strong>${esc(nm('patients', a.patientId))}</strong><br><span class="muted">${esc(nm('doctors', a.doctorId))}, ${esc(a.reason || a.type)}</span></span>
              ${chip(a.status)}
              ${a.status === 'Scheduled' ? `<button class="btn small" data-complete="${a.id}">Mark completed</button>` : ''}
            </li>`).join('')}</ul>`
            : `<div class="empty small"><p>No visits are booked for today.</p><a class="btn" href="#/appointments">Book an appointment</a></div>`}
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Ward occupancy</h2><a href="#/departments">Departments</a></div>
          <ul class="rows">${depts.map(d => {
            const pct = Math.min(100, Math.round(d.n / (d.beds || 1) * 100));
            return `<li><span class="grow">${esc(d.name)}</span>
              <div class="meter-row"><div class="meter ${pct >= 80 ? 'hot' : ''}" role="img" aria-label="${d.n} of ${d.beds} beds in use"><span style="width:${pct}%"></span></div><span class="num">${d.n}/${d.beds}</span></div></li>`;
          }).join('')}</ul>
        </section>

        <section class="panel wide-panel">
          <div class="panel-head"><h2>Invoices waiting for payment</h2><a href="#/billing">All billing</a></div>
          ${unpaid.length ? `<ul class="rows">${unpaid.map(i => `
            <li>
              <span class="grow"><strong>${esc(nm('patients', i.patientId))}</strong><br><span class="muted">${esc(i.code)}, ${fmtDate(i.date)}, ${esc(i.method)}</span></span>
              <span class="num"><strong>${inr(DB.total(i))}</strong></span>
              ${chip(i.status)}
              <button class="btn small" data-paid="${i.id}">Mark paid</button>
            </li>`).join('')}</ul>`
            : `<div class="empty small"><p>Every invoice is paid.</p></div>`}
        </section>
      </div>`;

    $$('[data-complete]', view).forEach(b => b.addEventListener('click', () => {
      DB.update('appointments', b.dataset.complete, { status: 'Completed' });
      toast('Appointment marked completed');
      Views.dashboard.mount();
    }));
    $$('[data-paid]', view).forEach(b => b.addEventListener('click', () => {
      DB.update('invoices', b.dataset.paid, { status: 'Paid' });
      toast('Invoice marked paid');
      Views.dashboard.mount();
    }));
  }
};

/* ==========================================================
   SETTINGS  (backup / restore / reset)
   ========================================================== */
Views.settings = {
  mount() {
    const view = $('#view');
    const counts = DB.TABLES.map(t => `<li><span>${t.charAt(0).toUpperCase() + t.slice(1)}</span><strong>${DB.all(t).length}</strong></li>`).join('');
    view.innerHTML = `
      <div class="page-head"><div><h1>Data and backup</h1><p>Everything is stored in this browser. Export a copy before clearing browser data.</p></div></div>
      <div class="settings-grid">
        <section class="panel pad">
          <h2>Records stored</h2>
          <ul class="rows plain">${counts}</ul>
        </section>
        <section class="panel pad">
          <h2>Backup</h2>
          <p class="muted">Download all records as a JSON file, or load a file you exported earlier.</p>
          <div class="btn-row">
            <button class="btn primary" id="exp">${icon('download')} Export backup</button>
            <label class="btn" for="imp">${icon('upload')} Import backup</label>
            <input id="imp" type="file" accept="application/json,.json" hidden>
          </div>
        </section>
        <section class="panel pad">
          <h2>Reset</h2>
          <p class="muted">Restore the sample hospital data, or empty every table to start fresh.</p>
          <div class="btn-row">
            <button class="btn" id="reset">Restore sample data</button>
            <button class="btn danger" id="clear">Delete all records</button>
          </div>
        </section>
      </div>`;

    $('#exp').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([DB.exportJSON()], { type: 'application/json' }));
      a.download = `careledger-backup-${D.today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Backup downloaded');
    });
    $('#imp').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try { DB.importJSON(r.result); toast('Backup imported'); Views.settings.mount(); }
        catch (err) { toast(err.message || 'That file could not be read', 'error'); }
      };
      r.readAsText(file);
    });
    $('#reset').addEventListener('click', async () => {
      if (await confirmBox({ title: 'Restore sample data?', message: 'This replaces all current records with the sample hospital data.', confirmLabel: 'Restore sample data' })) {
        DB.reset(); toast('Sample data restored'); Views.settings.mount();
      }
    });
    $('#clear').addEventListener('click', async () => {
      if (await confirmBox({ title: 'Delete all records?', message: 'Every patient, doctor, appointment, invoice and department will be removed. Export a backup first if you may need them.', confirmLabel: 'Delete all records' })) {
        DB.clearAll(); toast('All records deleted'); Views.settings.mount();
      }
    });
  }
};
