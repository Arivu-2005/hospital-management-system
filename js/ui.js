/* ==========================================================
   ui.js  –  small helpers: formatting, icons, modal, toast,
   form building / reading
   ========================================================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = t => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${D.pad(m)} ${h < 12 ? 'am' : 'pm'}`;
};

/* ---------- icons ---------- */
const ICONS = {
  dashboard: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  patients: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M18 7v6M15 10h6"/>',
  doctors: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3"/><path d="M12 15v3M10.5 16.5h3"/>',
  appointments: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  billing: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  departments: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M12 8.5v3M10.5 10h3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-6h16v6h-3"/><rect x="7" y="14" width="10" height="7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 20h14"/>'
};
const icon = (name, size = 18) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------- status chips ---------- */
const CHIP_KIND = {
  'Scheduled': 'blue', 'Completed': 'green', 'Cancelled': 'grey', 'No-show': 'amber',
  'Pending': 'amber', 'Paid': 'green', 'Insurance claim': 'blue',
  'Admitted': 'blue', 'Outpatient': 'grey', 'Discharged': 'green',
  'On duty': 'green', 'On leave': 'amber'
};
const chip = text => `<span class="chip chip-${CHIP_KIND[text] || 'grey'}">${esc(text)}</span>`;

/* ---------- toast ---------- */
function toast(message, kind = 'ok') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = message;
  box.append(el);
  setTimeout(() => { el.classList.add('leave'); setTimeout(() => el.remove(), 250); }, 3200);
}

/* ---------- modal ---------- */
function openModal({ title, body, actions = [], wide = false, onOpen }) {
  const root = $('#modal-root');
  const previous = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button></header>
      <div class="modal-body"></div>
      <footer></footer>
    </div>`;
  const bodyEl = $('.modal-body', wrap);
  if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.append(body);

  const close = () => {
    document.removeEventListener('keydown', onKey);
    wrap.remove();
    if (previous && previous.focus) previous.focus();
  };
  const onKey = e => {
    if (e.key === 'Escape' && root.lastElementChild === wrap) close();
    if (e.key === 'Tab' && root.lastElementChild === wrap) {
      const f = $$('button, input, select, textarea, a[href]', wrap).filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  const foot = $('footer', wrap);
  actions.forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.kind || '');
    b.textContent = a.label;
    if (a.submitForm) { b.type = 'submit'; b.setAttribute('form', a.submitForm); }
    else { b.type = 'button'; b.addEventListener('click', () => a.onClick ? a.onClick(close) : close()); }
    foot.append(b);
  });
  if (!actions.length) foot.remove();

  wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
  $('[data-close]', wrap).addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  root.append(wrap);

  const firstField = $('input:not([type=hidden]), select, textarea', bodyEl) || $('.btn', wrap);
  if (firstField) firstField.focus();
  if (onOpen) onOpen(wrap, close);
  return close;
}

function confirmBox({ title, message, confirmLabel = 'Delete', kind = 'danger' }) {
  return new Promise(resolve => {
    let answered = false;
    const done = v => { if (!answered) { answered = true; resolve(v); } };
    openModal({
      title,
      body: `<p class="confirm-text">${message}</p>`,
      actions: [
        { label: 'Cancel', onClick: close => { done(false); close(); } },
        { label: confirmLabel, kind, onClick: close => { done(true); close(); } }
      ],
      onOpen: wrap => {
        const obs = new MutationObserver(() => { if (!wrap.isConnected) { done(false); obs.disconnect(); } });
        obs.observe($('#modal-root'), { childList: true });
      }
    });
  });
}

/* ---------- forms ---------- */
function fieldHTML(f, val) {
  const id = 'f_' + f.name;
  const v = val ?? f.default ?? '';
  const req = f.required ? 'required' : '';
  let input;
  if (f.type === 'select') {
    const opts = typeof f.options === 'function' ? f.options() : f.options;
    input = `<select id="${id}" name="${f.name}" ${req}>
      <option value="">${esc(f.placeholder || 'Select')}</option>
      ${opts.map(o => { const ov = typeof o === 'string' ? o : o.value, ol = typeof o === 'string' ? o : o.label;
        return `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}
    </select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${id}" name="${f.name}" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
  } else if (f.type === 'custom') {
    input = f.render(val);
  } else {
    input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${req}
      ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''}
      placeholder="${esc(f.placeholder || '')}" autocomplete="off">`;
  }
  return `<div class="field${f.full ? ' full' : ''}" data-field="${f.name}">
    <label for="${id}">${esc(f.label)}${f.required ? '<span class="req" aria-hidden="true"> *</span>' : ''}</label>
    ${input}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}
  </div>`;
}

function formHTML(fields, values, id) {
  return `<form id="${id}" class="form-grid" novalidate>
    ${fields.map(f => fieldHTML(f, values[f.name])).join('')}
    <p class="form-error" role="alert" hidden></p>
  </form>`;
}

function showFormError(form, message, fieldName) {
  $$('.field.invalid', form).forEach(n => n.classList.remove('invalid'));
  const box = $('.form-error', form);
  box.textContent = message || '';
  box.hidden = !message;
  if (message && fieldName) {
    const wrap = $(`[data-field="${fieldName}"]`, form);
    if (wrap) {
      wrap.classList.add('invalid');
      const inp = $('input, select, textarea', wrap);
      if (inp) inp.focus();
    }
  }
}

function readForm(form, fields) {
  const values = {};
  for (const f of fields) {
    let v;
    if (f.type === 'custom') v = f.read(form);
    else {
      const el = form.elements[f.name];
      v = (el.value || '').trim();
      if (f.type === 'number' && v !== '') v = Number(v);
    }
    values[f.name] = v;

    const empty = Array.isArray(v) ? v.length === 0 : v === '';
    let msg = '';
    if (f.required && empty) msg = f.requiredMsg || `${f.label} is required.`;
    else if (f.type === 'number' && !empty) {
      if (Number.isNaN(v)) msg = `${f.label} must be a number.`;
      else if ((f.min != null && v < f.min) || (f.max != null && v > f.max)) {
        msg = `${f.label} must be ` + (f.min != null && f.max != null ? `between ${f.min} and ${f.max}.` : f.min != null ? `at least ${f.min}.` : `at most ${f.max}.`);
      }
    }
    if (msg) return { values, error: msg, field: f.name };
  }
  return { values, error: '', field: '' };
}
