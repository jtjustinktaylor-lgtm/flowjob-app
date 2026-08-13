// Service History Module — Complete job history per customer
// Shows every quote, invoice, warranty, and service call in one timeline

Pages.serviceHistory = function() {
  const customers = App.state.customers || [];
  return `
    <div class="page-header"><h2>📋 Service History</h2><p>Complete history per customer — every job, quote, invoice, and warranty</p></div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <select class="form-control" id="sh-customer" onchange="ServiceHistory.load(this.value)" style="max-width:300px">
        <option value="">— Select a customer —</option>
        ${customers.map(c => `<option value="${App.esc(c.name)}">${App.esc(c.name)}${c.address?' — '+App.esc(c.address):''}</option>`).join('')}
      </select>
      <input class="form-control" id="sh-search" placeholder="Search customers..." style="max-width:250px" oninput="ServiceHistory._search(this.value)">
    </div>
    <div id="sh-content">
      <div class="card"><div class="empty-state"><div class="icon">📋</div><h3>Select a customer</h3><p>View their complete service history in one place</p></div></div>
    </div>`;
};

PageInit.serviceHistory = function() {};

const ServiceHistory = {
  _search(q) {
    q = q.toLowerCase();
    const sel = document.getElementById('sh-customer');
    if (!sel) return;
    for (let i = 0; i < sel.options.length; i++) {
      if (i === 0) continue;
      sel.options[i].style.display = sel.options[i].text.toLowerCase().includes(q) ? '' : 'none';
    }
  },

  load(customerName) {
    if (!customerName) return;
    const el = document.getElementById('sh-content');
    const quotes = (App.state.quotes||[]).filter(q => q.customer === customerName).sort((a,b) => b.date.localeCompare(a.date));
    const invoices = (App.state.invoices||[]).filter(i => i.customer === customerName).sort((a,b) => b.date.localeCompare(a.date));
    const warranties = (App.state.warranties||[]).filter(w => w.customer === customerName).sort((a,b) => b.jobDate.localeCompare(a.jobDate));
    const customer = (App.state.customers||[]).find(c => c.name === customerName);
    const totalSpent = invoices.filter(i => i.status === 'paid').reduce((s,i) => s + i.total, 0);
    const activeWarranties = warranties.filter(w => new Date(w.expiryDate) >= new Date()).length;

    const timeline = [];
    quotes.forEach(q => timeline.push({ date: q.date, type: 'quote', data: q }));
    invoices.forEach(i => timeline.push({ date: i.date, type: 'invoice', data: i }));
    warranties.forEach(w => timeline.push({ date: w.jobDate, type: 'warranty', data: w }));
    timeline.sort((a,b) => b.date.localeCompare(a.date));

    el.innerHTML = `
      ${customer ? `<div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px">
          <div>
            <h3 style="margin:0">${App.esc(customer.name)}</h3>
            <p style="color:var(--text-muted);margin:4px 0">${App.esc(customer.phone||'')} ${customer.email?'· '+App.esc(customer.email):''}</p>
            ${customer.address ? `<p style="color:var(--text-muted);font-size:13px">${App.esc(customer.address)}</p>` : ''}
          </div>
          <div style="display:flex;gap:16px;text-align:center">
            <div><div style="font-size:20px;font-weight:700;color:var(--navy)">${App.formatCurrency(totalSpent)}</div><div style="font-size:11px;color:var(--text-muted)">Total Spent</div></div>
            <div><div style="font-size:20px;font-weight:700">${invoices.length}</div><div style="font-size:11px;color:var(--text-muted)">Jobs</div></div>
            <div><div style="font-size:20px;font-weight:700;color:var(--success)">${activeWarranties}</div><div style="font-size:11px;color:var(--text-muted)">Warranties</div></div>
          </div>
        </div>
      </div>` : ''}

      <div class="grid grid-4" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-value">${quotes.length}</div><div class="stat-label">Quotes</div></div>
        <div class="stat-card"><div class="stat-value">${invoices.length}</div><div class="stat-label">Invoices</div></div>
        <div class="stat-card"><div class="stat-value">${warranties.length}</div><div class="stat-label">Warranties</div></div>
        <div class="stat-card"><div class="stat-value">${quotes.filter(q=>q.status==='pending').length + invoices.filter(i=>i.status==='unpaid'||i.status==='overdue').length}</div><div class="stat-label">Pending</div></div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px">📅 Timeline</h3>
        ${timeline.length === 0
          ? '<p style="color:var(--text-muted)">No history found for this customer.</p>'
          : `<div style="position:relative;padding-left:24px">
            <div style="position:absolute;left:8px;top:0;bottom:0;width:2px;background:var(--border)"></div>
            ${timeline.map(t => {
              const d = t.data;
              let content = '';
              if (t.type === 'quote') {
                content = `<strong>📋 Quote #${d.number}</strong> — ${App.formatCurrency(d.total)}
                  <span class="badge badge-${d.status==='accepted'?'success':'warning'}">${d.status}</span><br>
                  <small>${d.items.length} items</small>`;
              } else if (t.type === 'invoice') {
                content = `<strong>💰 Invoice #${d.number}</strong> — ${App.formatCurrency(d.total)}
                  <span class="badge badge-${d.status==='paid'?'success':d.status==='overdue'?'danger':'warning'}">${d.status}</span>
                  ${d.paymentMethod?' · '+d.paymentMethod:''}`;
              } else if (t.type === 'warranty') {
                const daysLeft = Math.ceil((new Date(d.expiryDate) - new Date()) / 86400000);
                content = `<strong>🛡️ Warranty</strong> — ${d.type==='labor'?'Labor':'Parts'}: ${App.esc(d.description||'—')}
                  <span class="badge badge-${daysLeft>30?'success':daysLeft>0?'warning':'danger'}">${daysLeft>0?daysLeft+'d left':'Expired'}</span>`;
              }
              return `<div style="position:relative;margin-bottom:16px;padding-left:16px">
                <div style="position:absolute;left:-20px;top:6px;width:12px;height:12px;border-radius:50%;background:var(--primary);border:2px solid var(--card-bg,#fff)"></div>
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">${App.formatDate(t.date)}</div>
                <div style="font-size:13px">${content}</div>
              </div>`;
            }).join('')}
          </div>`}
      </div>`;
  }
};
