/* ==========================================================
   app.js  –  navigation and hash router
   ========================================================== */

const ROUTES = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'patients',     label: 'Patients' },
  { id: 'doctors',      label: 'Doctors' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'billing',      label: 'Billing' },
  { id: 'departments',  label: 'Departments' },
  { id: 'settings',     label: 'Data and backup' }
];

function buildNav() {
  $('#nav').innerHTML = ROUTES.map(r =>
    `<a href="#/${r.id}" data-route="${r.id}">${icon(r.id)}<span>${r.label}</span></a>`).join('');
}

function route() {
  const id = location.hash.replace('#/', '') || 'dashboard';
  const r = ROUTES.find(x => x.id === id) || ROUTES[0];
  $$('#nav a').forEach(a => {
    const on = a.dataset.route === r.id;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  Views[r.id].mount();
  document.title = `${r.label} – CareLedger`;
  window.scrollTo(0, 0);
}

buildNav();
window.addEventListener('hashchange', route);
route();
