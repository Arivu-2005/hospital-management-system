/* ==========================================================
   crud.js  –  one reusable engine that gives every module
   list + search + filter + sort + paging + create/edit/delete.
   Each module only describes its columns and form fields.
   ========================================================== */

function createCrud(cfg) {
  const PER_PAGE = 10;
  const st = { q: '', filter: '', page: 1, sort: cfg.sort || { key: cfg.columns[0].key, dir: 'asc' } };

  function getRows() {
    let list = DB.all(cfg.table);
    if (st.q) {
      const q = st.q.toLowerCase();
      list = list.filter(r => cfg.searchText(r).toLowerCase().includes(q));
    }
    if (st.filter && cfg.filter) list = list.filter(r => String(cfg.filter.get(r)) === st.filter);

    const col = cfg.columns.find(c => c.key === st.sort.key) || cfg.columns[0];
    const val = col.sortValue || (r => r[col.key]);
    const dir = st.sort.dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let x = val(a), y = val(b);
      if (typeof x === 'string') { x = x.toLowerCase(); y = String(y).toLowerCase(); }
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
    return list;
  }

  function mount() {
    const view = $('#view');
    const filterHTML = cfg.filter ? `
      <label class="sr-only" for="crud-filter">${esc(cfg.filter.label)}</label>
      <select id="crud-filter"><option value="">${esc(cfg.filter.all)}</option>
        ${cfg.filter.options().map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
      </select>` : '';

    view.innerHTML = `
      <div class="page-head">
        <div><h1>${esc(cfg.title)}</h1><p>${esc(cfg.subtitle)}</p></div>
        <button class="btn primary" id="crud-add">${icon('plus')} Add ${esc(cfg.singular)}</button>
      </div>
      <div class="panel">
        <div class="toolbar">
          <div class="search">${icon('search', 16)}
            <label class="sr-only" for="crud-search">Search ${esc(cfg.title.toLowerCase())}</label>
            <input id="crud-search" type="search" placeholder="${esc(cfg.searchHint)}" autocomplete="off">
          </div>
          ${filterHTML}
          <span class="count" id="crud-count"></span>
        </div>
        <div id="crud-table" class="table-wrap"></div>
        <div id="crud-pager" class="pager"></div>
      </div>`;

    $('#crud-add').addEventListener('click', () => openForm());
    $('#crud-search').addEventListener('input', e => { st.q = e.target.value.trim(); st.page = 1; update(); });
    if (cfg.filter) $('#crud-filter').addEventListener('change', e => { st.filter = e.target.value; st.page = 1; update(); });
    update();
  }

  function update() {
    const rows = getRows();
    const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    if (st.page > pages) st.page = pages;
    const slice = rows.slice((st.page - 1) * PER_PAGE, st.page * PER_PAGE);
    const total = DB.all(cfg.table).length;
    $('#crud-count').textContent = rows.length === total ? `${total} total` : `${rows.length} of ${total}`;

    const holder = $('#crud-table');
    if (!slice.length) {
      holder.innerHTML = total === 0
        ? `<div class="empty"><h3>No ${esc(cfg.title.toLowerCase())} yet</h3><p>${esc(cfg.emptyHint)}</p><button class="btn primary" data-empty-add>${icon('plus')} Add ${esc(cfg.singular)}</button></div>`
        : `<div class="empty"><h3>Nothing matches</h3><p>Try a different search word or clear the filter.</p></div>`;
      const b = $('[data-empty-add]', holder); if (b) b.addEventListener('click', () => openForm());
      $('#crud-pager').innerHTML = '';
      return;
    }

    const head = cfg.columns.map(c => {
      const active = st.sort.key === c.key;
      const aria = active ? (st.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      return `<th scope="col" class="${c.cls || ''}" aria-sort="${aria}">
        <button class="sort ${active ? 'on ' + st.sort.dir : ''}" data-sort="${c.key}">${esc(c.label)}</button></th>`;
    }).join('') + '<th scope="col" class="actions-col"><span class="sr-only">Actions</span></th>';

    const body = slice.map(r => `<tr data-id="${r.id}">
      ${cfg.columns.map(c => `<td class="${c.cls || ''}" data-label="${esc(c.label)}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}
      <td class="actions-col">
        ${(cfg.rowActions || []).map((a, i) => `<button class="icon-btn" data-act="${i}" aria-label="${esc(a.label)} ${esc(r.code || r.name || '')}" title="${esc(a.label)}">${icon(a.icon)}</button>`).join('')}
        <button class="icon-btn" data-edit aria-label="Edit ${esc(r.code || r.name || '')}" title="Edit">${icon('edit')}</button>
        <button class="icon-btn danger" data-del aria-label="Delete ${esc(r.code || r.name || '')}" title="Delete">${icon('trash')}</button>
      </td></tr>`).join('');

    holder.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

    $$('[data-sort]', holder).forEach(b => b.addEventListener('click', () => {
      const key = b.dataset.sort;
      st.sort = { key, dir: st.sort.key === key && st.sort.dir === 'asc' ? 'desc' : 'asc' };
      update();
    }));
    $$('tbody tr', holder).forEach(tr => {
      const id = tr.dataset.id;
      $('[data-edit]', tr).addEventListener('click', () => openForm(DB.get(cfg.table, id)));
      $('[data-del]', tr).addEventListener('click', () => remove(id));
      $$('[data-act]', tr).forEach(b => b.addEventListener('click', () => cfg.rowActions[+b.dataset.act].onClick(DB.get(cfg.table, id), update)));
      $$('[data-open]', tr).forEach(b => b.addEventListener('click', () => cfg.open(id)));
    });

    $('#crud-pager').innerHTML = pages > 1 ? `
      <button class="btn small" id="pg-prev" ${st.page === 1 ? 'disabled' : ''}>Previous</button>
      <span>Page ${st.page} of ${pages}</span>
      <button class="btn small" id="pg-next" ${st.page === pages ? 'disabled' : ''}>Next</button>` : '';
    const prev = $('#pg-prev'), next = $('#pg-next');
    if (prev) prev.addEventListener('click', () => { st.page--; update(); });
    if (next) next.addEventListener('click', () => { st.page++; update(); });
  }

  function openForm(rec) {
    const editing = !!rec;
    const vals = rec ? { ...rec } : (cfg.defaults ? cfg.defaults() : {});
    const fid = 'crud-form';
    openModal({
      title: editing ? `Edit ${cfg.singular}` : `Add ${cfg.singular}`,
      body: formHTML(cfg.fields, vals, fid),
      wide: cfg.wide,
      actions: [{ label: 'Cancel' }, { label: `Save ${cfg.singular}`, kind: 'primary', submitForm: fid }],
      onOpen: (wrap, close) => {
        const form = $('#' + fid, wrap);
        cfg.fields.forEach(f => f.bind && f.bind(form, vals));
        form.addEventListener('submit', e => {
          e.preventDefault();
          let { values, error, field } = readForm(form, cfg.fields);
          if (!error && cfg.validate) { const r = cfg.validate(values, rec); if (r) { error = r.message; field = r.field; } }
          if (error) { showFormError(form, error, field); return; }
          if (cfg.beforeSave) cfg.beforeSave(values, rec);
          if (editing) DB.update(cfg.table, rec.id, values); else DB.insert(cfg.table, values);
          close();
          toast(`${cap(cfg.singular)} saved`);
          if (cfg.afterSave) cfg.afterSave();
          if ($('#crud-table')) update();
        });
      }
    });
  }

  async function remove(id) {
    const rec = DB.get(cfg.table, id);
    const used = DB.usage(cfg.table, id);
    const blocked = (cfg.deleteGuard && cfg.deleteGuard(rec)) || (used.length ? `This ${cfg.singular} is still linked to ${used.join(', ')}. Remove or reassign those records first.` : '');
    if (blocked) {
      openModal({ title: `Can't delete ${cfg.singular}`, body: `<p class="confirm-text">${esc(blocked)}</p>`, actions: [{ label: 'Got it', kind: 'primary' }] });
      return;
    }
    const ok = await confirmBox({
      title: `Delete ${cfg.singular}?`,
      message: `<strong>${esc(rec.name || rec.code)}</strong> will be removed permanently.`,
      confirmLabel: `Delete ${cfg.singular}`
    });
    if (!ok) return;
    DB.remove(cfg.table, id);
    toast(`${cap(cfg.singular)} deleted`);
    update();
  }

  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  return { mount, openForm, update };
}
