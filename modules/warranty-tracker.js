// Warranty Tracker Module — Track labor & parts warranties per job
// Auto-calculates expiry dates, alerts when warranties expire soon

Pages.warrantyTracker = function() {
  const warranties = App.state.warranties || [];
  const today = new Date();
  const active = warranties.filter(w => new Date(w.expiryDate) >= today);
  const expiringSoon = active.filter(w => Math.ceil((new Date(w.expiryDate) - today) / 86400000) <= 30);
  const expired = warranties.filter(w => new Date(w.expiryDate) < today);

  return `
    <div class="page-header"><h2>🛡️ Warranty Tracker</h2><p>Track labor and parts warranties for all jobs</p></div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-primary" onclick="WarrantyTracker.new()">+ Add Warranty</button>
      <input class="form-control" id="warranty-search" placeholder="Search..." style="max-width:250px" oninput="WarrantyTracker._filter()">
      <select class="form-control" id="warranty-status-filter" style="max-width:160px" onchange="WarrantyTracker._filter()">
        <option value="">All</option><option value="active">✅ Active</option>
        <option value="expiring">⚠️ Expiring (30d)</option><option value="expired">❌ Expired</option>
      </select>
    </div>
    <div class="grid grid-4" style="margin-bottom:16px">
      <div class="stat-card"><div class="stat-value">${active.length}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--warning,#e5a500)">${expiringSoon.length}</div><div class="stat-label">Expiring Soon</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--danger,#dc3545)">${expired.length}</div><div class="stat-label">Expired</div></div>
      <div class="stat-card"><div class="stat-value">${warranties.length}</div><div class="stat-label">Total</div></div>
    </div>
    ${warranties.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">🛡️</div><h3>No warranties tracked yet</h3><p>Add warranties to protect your work and customers</p></div></div>'
      : `<div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Type</th><th>Description</th><th>Job Date</th><th>Expires</th><th>Days Left</th><th>Status</th><th></th></tr></thead>
        <tbody>${warranties.map(w => {
          const expiry = new Date(w.expiryDate);
          const daysLeft = Math.ceil((expiry - today) / 86400000);
          const status = daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'expiring' : 'active';
          return `<tr class="warranty-row" data-search="${App.esc((w.customer+' '+w.description+' '+w.type).toLowerCase())}" data-status="${status}">
            <td>${App.esc(w.customer||'—')}</td>
            <td><span class="badge badge-${w.type==='labor'?'info':'warning'}">${w.type==='labor'?'🔧 Labor':'🔩 Parts'}</span></td>
            <td>${App.esc(w.description||'—')}</td>
            <td>${App.formatDate(w.jobDate)}</td>
            <td>${App.formatDate(w.expiryDate)}</td>
            <td style="font-weight:600;color:${daysLeft<0?'var(--danger)':daysLeft<=30?'var(--warning,#e5a500)':'var(--success)'}">${daysLeft < 0 ? Math.abs(daysLeft) + 'd ago' : daysLeft + 'd'}</td>
            <td><span class="badge badge-${status==='active'?'success':status==='expiring'?'warning':'danger'}">${status}</span></td>
            <td><button class="btn btn-sm btn-outline" onclick="WarrantyTracker.view('${w.id}')">View</button>
              <button class="btn btn-sm btn-danger" onclick="WarrantyTracker.remove('${w.id}')">✕</button></td>
          </tr>`;
        }).join('')}</tbody></table></div></div>`}`;
};
PageInit.warrantyTracker = function() { WarrantyTracker._filter(); };

const WarrantyTracker = {
  _filter() {
    const q = (document.getElementById('warranty-search')?.value || '').toLowerCase();
    const status = document.getElementById('warranty-status-filter')?.value || '';
    document.querySelectorAll('.warranty-row').forEach(row => {
      const matchText = row.dataset.search.includes(q);
      const matchStatus = !status || row.dataset.status === status;
      row.style.display = (matchText && matchStatus) ? '' : 'none';
    });
  },

  new() {
    App.openModal(`
      <div class="modal-header"><h3>Add Warranty</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Customer</label>
        <select class="form-control" id="wt-cust-select" onchange="document.getElementById('wt-cust').value=this.value">
          <option value="">— Select or type below —</option>
          ${(App.state.customers||[]).map(c => `<option value="${App.esc(c.name)}">${App.esc(c.name)}</option>`).join('')}
        </select>
        <input class="form-control" id="wt-cust" placeholder="Customer name" style="margin-top:6px">
      </div>
      <div class="form-group"><label>Warranty Type</label>
        <select class="form-control" id="wt-type">
          <option value="labor">🔧 Labor Warranty</option>
          <option value="parts">🔩 Parts/Equipment Warranty</option>
        </select></div>
      <div class="form-group"><label>Description</label>
        <input class="form-control" id="wt-desc" placeholder="e.g. Water heater installation"></div>
      <div class="form-group"><label>Job/Service Date</label>
        <input class="form-control" type="date" id="wt-job-date" value="${App.today()}"></div>
      <div class="form-group"><label>Warranty Period</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input class="form-control" type="number" id="wt-period" value="12" style="width:80px">
          <select class="form-control" id="wt-unit" style="width:100px">
            <option value="months">Months</option><option value="years">Years</option>
          </select>
          <span style="font-size:12px;color:var(--text-muted)">Standard: 1 year labor</span>
        </div>
      </div>
      <div class="form-group"><label>Notes</label>
        <textarea class="form-control" id="wt-notes" placeholder="Conditions, exclusions, serial numbers..."></textarea></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="WarrantyTracker._saveNew()">Add Warranty</button>
      </div>`);
  },

  _saveNew() {
    const customer = document.getElementById('wt-cust').value.trim();
    if (!customer) return App.toast('Customer name required', 'error');
    const jobDate = document.getElementById('wt-job-date').value;
    const period = parseInt(document.getElementById('wt-period').value) || 12;
    const unit = document.getElementById('wt-unit').value;
    const expiry = new Date(jobDate);
    if (unit === 'years') expiry.setFullYear(expiry.getFullYear() + period);
    else expiry.setMonth(expiry.getMonth() + period);

    if (!App.state.warranties) App.state.warranties = [];
    App.state.warranties.push({
      id: App.genId(), customer,
      type: document.getElementById('wt-type').value,
      description: document.getElementById('wt-desc').value.trim(),
      jobDate, warrantyPeriod: period, warrantyUnit: unit,
      expiryDate: expiry.toISOString().slice(0, 10),
      notes: document.getElementById('wt-notes').value.trim(),
      status: 'active', createdAt: App.today()
    });
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Warranty added');
  },

  view(id) {
    const w = (App.state.warranties||[]).find(x => x.id === id);
    if (!w) return;
    const daysLeft = Math.ceil((new Date(w.expiryDate) - new Date()) / 86400000);
    App.openModal(`
      <div class="modal-header"><h3>Warranty Details</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div style="padding:16px 0">
        <p><strong>Customer:</strong> ${App.esc(w.customer)}</p>
        <p><strong>Type:</strong> ${w.type === 'labor' ? '🔧 Labor' : '🔩 Parts/Equipment'}</p>
        <p><strong>Description:</strong> ${App.esc(w.description || '—')}</p>
        <p><strong>Job Date:</strong> ${App.formatDate(w.jobDate)}</p>
        <p><strong>Warranty Period:</strong> ${w.warrantyPeriod} ${w.warrantyUnit}</p>
        <p><strong>Expires:</strong> ${App.formatDate(w.expiryDate)}</p>
        <p><strong>Status:</strong> <span style="font-weight:700;color:${daysLeft<0?'var(--danger)':daysLeft<=30?'var(--warning,#e5a500)':'var(--success)'}">
          ${daysLeft < 0 ? '❌ Expired ' + Math.abs(daysLeft) + ' days ago' : daysLeft <= 30 ? '⚠️ Expiring in ' + daysLeft + ' days' : '✅ Active — ' + daysLeft + ' days remaining'}</span></p>
        ${w.notes ? '<p><strong>Notes:</strong><br>' + App.esc(w.notes) + '</p>' : ''}
      </div>
      <div class="modal-footer">
        ${daysLeft > 0 ? `<button class="btn btn-primary" onclick="WarrantyTracker._extend('${w.id}')">🔄 Extend</button>` : ''}
        <button class="btn btn-outline" onclick="App.closeModal()">Close</button>
      </div>`);
  },

  _extend(id) {
    const w = (App.state.warranties||[]).find(x => x.id === id);
    if (!w) return;
    const expiry = new Date(w.expiryDate);
    if (w.warrantyUnit === 'years') expiry.setFullYear(expiry.getFullYear() + w.warrantyPeriod);
    else expiry.setMonth(expiry.getMonth() + w.warrantyPeriod);
    w.expiryDate = expiry.toISOString().slice(0, 10);
    App.saveState(); App.closeModal(); App.handleRoute();
    App.toast('Extended by ' + w.warrantyPeriod + ' ' + w.warrantyUnit);
  },

  async remove(id) {
    if (await App.confirm('Delete this warranty?')) {
      App.state.warranties = (App.state.warranties||[]).filter(w => w.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Warranty deleted');
    }
  }
};
