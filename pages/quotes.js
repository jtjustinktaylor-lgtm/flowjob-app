// Quotes Page — with search/filter, discounts, quick discount, deposits
Pages.quotes = function() {
  const quotes = App.state.quotes || [];
  return `
    <div class="page-header"><h2>Quotes</h2><p>Create and manage customer quotes</p></div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-primary" onclick="Quotes.new()">+ New Quote</button>
      <input class="form-control" id="quote-search" placeholder="Search quotes..." style="max-width:250px" oninput="Quotes._filter()">
      <select class="form-control" id="quote-status-filter" style="max-width:160px" onchange="Quotes._filter()">
        <option value="">All Statuses</option>
        <option value="pending">Pending</option><option value="request">Request</option>
        <option value="sent">Sent</option><option value="accepted">Accepted</option>
      </select>
    </div>
    ${quotes.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">📋</div><h3>No quotes yet</h3><p>Create your first quote to get started</p></div></div>'
      : `<div class="card"><div class="table-wrap"><table id="quote-table">
        <thead><tr><th>#</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${quotes.map(q => `<tr class="quote-row" data-customer="${App.esc((q.customer||'').toLowerCase())}" data-status="${q.status}" data-number="${q.number}">
          <td>${q.number}</td><td>${App.esc(q.customer||'—')}</td><td>${App.formatDate(q.date)}</td>
          <td>${App.formatCurrency(q.total)}</td>
          <td><span class="badge badge-${q.status==='accepted'?'success':q.status==='sent'?'info':'warning'}">${q.status}</span></td>
          <td style="white-space:nowrap"><button class="btn btn-sm btn-outline" onclick="Quotes.view('${q.id}')">View</button>
            <button class="btn btn-sm btn-primary" onclick="Quotes.toInvoice('${q.id}')">→ Invoice</button>
            <button class="btn btn-sm btn-danger" onclick="Quotes.remove('${q.id}')">✕</button></td>
        </tr>`).join('')}</tbody>
      </table></div></div>`}`;
};

PageInit.quotes = function() { Quotes._filter(); };

const Quotes = {
  _filter() {
    const q = (document.getElementById('quote-search')?.value || '').toLowerCase();
    const status = document.getElementById('quote-status-filter')?.value || '';
    document.querySelectorAll('.quote-row').forEach(row => {
      const matchText = row.dataset.customer.includes(q) || row.dataset.number.includes(q);
      const matchStatus = !status || row.dataset.status === status;
      row.style.display = (matchText && matchStatus) ? '' : 'none';
    });
  },

  new() {
    const id = App.genId();
    const num = App.state.nextQuoteNum++;
    const items = [];
    if (App.state.autoServiceCall) {
      const price = parseFloat(App.state.serviceCallPrice) || 99;
      items.push({ desc: 'Service Call', price });
    }
    const subtotal = items.reduce((s, i) => s + i.price, 0);
    const tax = +(subtotal * TAX_RATE).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    App.state.quotes.push({ id, number: num, date: App.today(), customer:'', customerEmail:'', items, notes:'', status:'pending', subtotal, tax, total, taxExempt:false });
    App.saveState();
    this.edit(id);
  },
  edit(id) {
    const q = App.state.quotes.find(x => x.id === id);
    if (!q) return;
    App.openModal(this._form(q));
  },
  _form(q) {
    const cats = Object.entries(FLAT_RATES);
    const custs = (App.state.customers || []).map(c => `<option value="${App.esc(c.name)}" data-email="${App.esc(c.email||'')}">${App.esc(c.name)}</option>`).join('');
    return `<div class="modal-header"><h3>Quote #${q.number}</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Customer</label>
        <select class="form-control" id="qf-cust-select" onchange="Quotes._fillCustomer('${q.id}',this.value)">
          <option value="">— Select existing or type below —</option>${custs}
        </select>
        <input class="form-control" id="qf-cust" value="${App.esc(q.customer||'')}" placeholder="Or type customer name" style="margin-top:6px">
      </div>
      <div class="form-group"><label>Customer Email</label><input class="form-control" id="qf-email" value="${App.esc(q.customerEmail||'')}"></div>
      <div class="form-group"><label>Add from Flat Rates</label>
        <select class="form-control" id="qf-add"><option value="">Select a service...</option>
          ${cats.map(([k,v])=>`<optgroup label="${App.esc(v.label)}">${v.items.map(i=>`<option value="${i.id}" data-price="${i.price}">${App.esc(i.desc)} — ${App.formatCurrency(i.price)}</option>`).join('')}</optgroup>`).join('')}
        </select>
        <button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="Quotes._addItem('${q.id}')">+ Add</button>
      </div>
      <div class="form-group"><label>Custom Item</label>
        <div style="display:flex;gap:8px">
          <input class="form-control" id="qf-custom-desc" placeholder="Description" style="flex:2">
          <input class="form-control" id="qf-custom-price" type="number" step="0.01" placeholder="Price" style="flex:1">
          <button class="btn btn-sm btn-outline" onclick="Quotes._addCustom('${q.id}')">+</button>
        </div>
      </div>
      <div id="qf-items">${this._renderItems(q)}</div>
      <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="qf-exempt" ${q.taxExempt?'checked':''} onchange="Quotes._toggleTax('${q.id}',this.checked)"> Tax Exempt (no HST)</label></div>
      <div class="form-group"><label>Apply Discount</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <select class="form-control" id="qf-discount" onchange="Quotes._applyDiscount('${q.id}',this.value)" style="flex:2;min-width:180px">
            <option value="">No discount</option>
            <option value="__quick__">⚡ Quick discount...</option>
            ${(App.state.discounts||[]).filter(d=>d.active&&(!d.validUntil||d.validUntil>=App.today())).map(d=>
              `<option value="${d.id}" ${q.discountId===d.id?'selected':''}>${App.esc(d.name)} — ${d.type==='percent'?d.value+'%':App.formatCurrency(d.value)} off</option>`
            ).join('')}
          </select>
          <div id="qf-quick-discount" style="display:${q.discountId==='__quick__'?'flex':'none'};gap:6px;align-items:center">
            <input class="form-control" type="number" step="0.01" id="qf-disc-val" value="${q.quickDiscountValue||''}" placeholder="Value" style="width:90px" oninput="Quotes._recalcQuickDiscount('${q.id}')">
            <select class="form-control" id="qf-disc-type" style="width:80px" onchange="Quotes._recalcQuickDiscount('${q.id}')">
              <option value="percent" ${q.quickDiscountType==='percent'?'selected':''}>%</option>
              <option value="flat" ${q.quickDiscountType==='flat'?'selected':''}>$</option>
            </select>
          </div>
        </div>
        ${q.discountAmount ? `<div style="margin-top:4px;font-size:13px;color:var(--success)">Discount: -${App.formatCurrency(q.discountAmount)}</div>` : ''}
      </div>
      <div class="form-group"><label>Deposit Required</label>
        <div style="display:flex;gap:8px;align-items:center">
          <select class="form-control" id="qf-deposit-type" style="max-width:160px" onchange="Quotes._recalcDeposit('${q.id}')">
            <option value="none" ${(!q.depositType||q.depositType==='none')?'selected':''}>No deposit</option>
            <option value="percent" ${q.depositType==='percent'?'selected':''}>Percentage</option>
            <option value="fixed" ${q.depositType==='fixed'?'selected':''}>Fixed amount</option>
          </select>
          <input class="form-control" type="number" step="0.01" id="qf-deposit-val" value="${q.depositValue||''}" placeholder="Amount or %" style="max-width:140px" oninput="Quotes._recalcDeposit('${q.id}')">
          <span id="qf-deposit-preview" style="font-weight:600;color:var(--navy);min-width:80px">${q.depositAmount ? App.formatCurrency(q.depositAmount) : ''}</span>
        </div>
      </div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" id="qf-notes">${App.esc(q.notes||'')}</textarea></div>
      <div class="form-group"><label>🔧 Job Costing (Actual Costs)</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:140px"><label style="font-size:12px;color:var(--text-muted)">Materials ($)</label>
            <input class="form-control" type="number" step="0.01" id="qf-actual-mat" value="${q.actualMaterials||''}" placeholder="0.00"></div>
          <div style="flex:1;min-width:140px"><label style="font-size:12px;color:var(--text-muted)">Labor ($)</label>
            <input class="form-control" type="number" step="0.01" id="qf-actual-lab" value="${q.actualLabor||''}" placeholder="0.00"></div>
          <div style="flex:1;min-width:140px"><label style="font-size:12px;color:var(--text-muted)">Hours</label>
            <input class="form-control" type="number" step="0.5" id="qf-actual-hrs" value="${q.actualHours||''}" placeholder="0"></div>
        </div>
        <small style="color:var(--text-muted)">Fill in after job completion to track profit margins</small>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="Quotes._print('${q.id}')">🖨️ Print</button>
        <button class="btn btn-outline" onclick="Quotes._emailQuoteDirect('${q.id}')">📧 Email</button>
        <button class="btn btn-outline" onclick="Quotes._shareQuote('${q.id}')">🔗 Share Quote</button>
        <button class="btn btn-outline" onclick="Quotes._save('${q.id}');App.closeModal()">Save</button>
        <button class="btn btn-primary" onclick="Quotes._save('${q.id}');Quotes._send('${q.id}');App.closeModal()">Save & Send</button>
      </div>`;
  },
  _fillCustomer(qid, name) {
    if (!name) return;
    const c = App.state.customers.find(x => x.name === name);
    if (!c) return;
    document.getElementById('qf-cust').value = c.name;
    document.getElementById('qf-email').value = c.email || '';
  },
  _renderItems(q) {
    if (!q.items.length) return '<p style="color:var(--text-muted);font-size:13px">No items added yet</p>';
    return `<table><thead><tr><th>Item</th><th>Price</th><th></th></tr></thead><tbody>
      ${q.items.map((it,i) => `<tr><td>${App.esc(it.desc)}</td><td>${App.formatCurrency(it.price)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="Quotes._removeItem('${q.id}',${i})">✕</button></td></tr>`).join('')}
    </tbody></table>
    <div style="text-align:right;margin-top:8px">
      <div>Subtotal: ${App.formatCurrency(q.subtotal)}</div>
      ${q.discountAmount ? `<div style="color:var(--success)">Discount: -${App.formatCurrency(q.discountAmount)}</div>` : ''}
      <div>${q.taxExempt ? 'HST: Exempt' : 'HST (13%): ' + App.formatCurrency(q.tax)}</div>
      <div style="font-size:18px;font-weight:700;color:var(--navy)">Total: ${App.formatCurrency(q.total)}</div>
      ${q.depositAmount ? `<div style="margin-top:8px;padding:8px;background:var(--bg);border-radius:6px;font-size:13px"><strong>Deposit required:</strong> ${App.formatCurrency(q.depositAmount)}${q.depositType==='percent'?' ('+q.depositValue+'%)':''}</div>` : ''}
    </div>`;
  },
  _addItem(qid) {
    const sel = document.getElementById('qf-add');
    const opt = sel.options[sel.selectedIndex];
    if (!opt.value) return;
    const q = App.state.quotes.find(x => x.id === qid);
    q.items.push({ desc: opt.textContent.split(' — ')[0], price: parseFloat(opt.dataset.price) });
    this._recalc(q); App.saveState(); this._refresh(qid);
  },
  _addCustom(qid) {
    const desc = document.getElementById('qf-custom-desc').value.trim();
    const price = parseFloat(document.getElementById('qf-custom-price').value) || 0;
    if (!desc || !price) return App.toast('Enter description and price','error');
    const q = App.state.quotes.find(x => x.id === qid);
    q.items.push({ desc, price });
    this._recalc(q); App.saveState(); this._refresh(qid);
  },
  _removeItem(qid, idx) {
    const q = App.state.quotes.find(x => x.id === qid);
    q.items.splice(idx, 1);
    this._recalc(q); App.saveState(); this._refresh(qid);
  },
  _recalc(q) {
    q.subtotal = q.items.reduce((s,i) => s + i.price, 0);
    let discountedSubtotal = q.subtotal;
    if (q.discountId) {
      if (q.discountId === '__quick__') {
        const val = parseFloat(q.quickDiscountValue) || 0;
        q.discountAmount = q.quickDiscountType === 'flat' ? Math.min(val, q.subtotal) : +(q.subtotal * val / 100).toFixed(2);
        discountedSubtotal = q.subtotal - q.discountAmount;
      } else {
        const d = (App.state.discounts||[]).find(x=>x.id===q.discountId);
        if (d && d.active) {
          q.discountAmount = d.type === 'percent' ? +(q.subtotal * d.value / 100).toFixed(2) : Math.min(d.value, q.subtotal);
          discountedSubtotal = q.subtotal - q.discountAmount;
        }
      }
    } else {
      q.discountAmount = 0;
    }
    q.tax = q.taxExempt ? 0 : +(discountedSubtotal * TAX_RATE).toFixed(2);
    q.total = +(discountedSubtotal + q.tax).toFixed(2);
  },
  _save(qid) {
    const q = App.state.quotes.find(x => x.id === qid);
    q.customer = document.getElementById('qf-cust').value;
    q.customerEmail = document.getElementById('qf-email').value;
    q.notes = document.getElementById('qf-notes')?.value || '';
    q.discountId = document.getElementById('qf-discount')?.value || '';
    q.quickDiscountValue = parseFloat(document.getElementById('qf-disc-val')?.value) || 0;
    q.quickDiscountType = document.getElementById('qf-disc-type')?.value || 'percent';
    const depType = document.getElementById('qf-deposit-type')?.value || 'none';
    const depVal = parseFloat(document.getElementById('qf-deposit-val')?.value) || 0;
    q.depositType = depType; q.depositValue = depVal;
    if (depType === 'percent') q.depositAmount = +(q.total * depVal / 100).toFixed(2);
    else if (depType === 'fixed') q.depositAmount = depVal;
    else q.depositAmount = 0;
    q.actualMaterials = parseFloat(document.getElementById('qf-actual-mat')?.value) || 0;
    q.actualLabor = parseFloat(document.getElementById('qf-actual-lab')?.value) || 0;
    q.actualHours = parseFloat(document.getElementById('qf-actual-hrs')?.value) || 0;
    App.saveState(); App.handleRoute(); App.toast('Quote saved');
  },
  _refresh(qid) {
    const q = App.state.quotes.find(x => x.id === qid);
    document.getElementById('qf-items').innerHTML = this._renderItems(q);
  },
  _send(qid) {
    const q = App.state.quotes.find(x => x.id === qid);
    q.status = 'sent'; App.saveState(); this._emailQuote(q); App.toast('Quote sent!');
  },
  _emailQuote(q) {
    const biz = App.getBusinessInfo();
    const body = `Hi ${q.customer},\n\nHere is your quote #${q.number} from ${biz.name}.\n\n` +
      q.items.map(i => `${i.desc}: ${App.formatCurrency(i.price)}`).join('\n') +
      `\n\nSubtotal: ${App.formatCurrency(q.subtotal)}\nHST: ${App.formatCurrency(q.tax)}\nTotal: ${App.formatCurrency(q.total)}` +
      (q.discountAmount ? `\nDiscount: -${App.formatCurrency(q.discountAmount)}` : '') +
      (q.depositAmount ? `\n\nDeposit required: ${App.formatCurrency(q.depositAmount)}` : '') +
      (biz.hstNumber ? `\nHST#: ${biz.hstNumber}` : '') +
      `\n\nPlease reply to confirm or call ${biz.phone}.\n\nThanks,\n${biz.contact}\n${biz.name}`;
    window.open(`mailto:${q.customerEmail}?subject=Quote #${q.number} — ${biz.name}&body=${encodeURIComponent(body)}`);
  },
  view(id) { this.edit(id); },
  toInvoice(id) {
    const q = App.state.quotes.find(x => x.id === id);
    if (!q) return;
    const invId = App.genId();
    const invNum = App.state.nextInvoiceNum++;
    App.state.invoices.push({
      id: invId, number: invNum, date: App.today(), dueDate: '',
      customer: q.customer, customerEmail: q.customerEmail,
      items: [...q.items], notes: q.notes, status: 'unpaid',
      subtotal: q.subtotal, tax: q.tax, total: q.total, quoteId: q.id,
      taxExempt: q.taxExempt || false,
      discountId: q.discountId || '', discountAmount: q.discountAmount || 0,
      depositType: q.depositType || 'none', depositValue: q.depositValue || 0, depositAmount: q.depositAmount || 0
    });
    q.status = 'accepted'; App.saveState();
    App.toast('Invoice created from quote');
    window.location.hash = 'invoices';
  },
  _toggleTax(qid, checked) {
    const q = App.state.quotes.find(x => x.id === qid);
    q.taxExempt = checked; this._recalc(q); App.saveState(); this._refresh(qid);
  },
  _applyDiscount(qid, discountId) {
    const q = App.state.quotes.find(x => x.id === qid);
    q.discountId = discountId || '';
    const qd = document.getElementById('qf-quick-discount');
    if (qd) qd.style.display = discountId === '__quick__' ? 'flex' : 'none';
    this._recalc(q); App.saveState(); this._refresh(qid);
  },
  _recalcQuickDiscount(qid) {
    const q = App.state.quotes.find(x => x.id === qid);
    q.quickDiscountValue = parseFloat(document.getElementById('qf-disc-val')?.value) || 0;
    q.quickDiscountType = document.getElementById('qf-disc-type')?.value || 'percent';
    this._recalc(q); App.saveState(); this._refresh(qid);
  },
  _recalcDeposit(qid) {
    const q = App.state.quotes.find(x => x.id === qid);
    const type = document.getElementById('qf-deposit-type')?.value || 'none';
    const val = parseFloat(document.getElementById('qf-deposit-val')?.value) || 0;
    q.depositType = type; q.depositValue = val;
    if (type === 'percent') q.depositAmount = +(q.total * val / 100).toFixed(2);
    else if (type === 'fixed') q.depositAmount = val;
    else q.depositAmount = 0;
    const preview = document.getElementById('qf-deposit-preview');
    if (preview) preview.textContent = q.depositAmount ? App.formatCurrency(q.depositAmount) : '';
  },
  async remove(id) {
    if (await App.confirm('Delete this quote?')) {
      App.state.quotes = App.state.quotes.filter(q => q.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Quote deleted');
    }
  },
  _print(id) {
    this._save(id);
    const q = App.state.quotes.find(x => x.id === id);
    if (!q) return;
    const biz = App.getBusinessInfo();
    const rows = q.items.map(i => `<tr><td>${App.esc(i.desc)}</td><td style="text-align:right">${App.formatCurrency(i.price)}</td></tr>`).join('');
    App.printSection(`
      <div style="display:flex;justify-content:space-between;margin-bottom:24px">
        <div><strong>Quote #${q.number}</strong><br>Date: ${App.formatDate(q.date)}</div>
        <div style="text-align:right"><strong>Prepared for:</strong><br>${App.esc(q.customer || '—')}<br>${App.esc(q.customerEmail || '')}</div>
      </div>
      <table><thead><tr><th>Service</th><th style="text-align:right">Price</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="total" style="text-align:right;margin-top:16px">
        <div>Subtotal: ${App.formatCurrency(q.subtotal)}</div>
        ${q.discountAmount ? `<div style="color:var(--success)">Discount: -${App.formatCurrency(q.discountAmount)}</div>` : ''}
        <div>${q.taxExempt ? 'HST: Exempt' : 'HST (13%): ' + App.formatCurrency(q.tax)}</div>
        <div style="font-size:20px;margin-top:8px"><strong>Total: ${App.formatCurrency(q.total)}</strong></div>
      </div>
      ${q.notes ? '<div style="margin-top:24px"><strong>Notes:</strong><br>' + App.esc(q.notes) + '</div>' : ''}
      ${q.depositAmount ? '<div style="margin-top:16px;padding:12px;background:#FFFBEB;border:1px solid #D4AF37;border-radius:6px"><strong>Deposit Required:</strong> ' + App.formatCurrency(q.depositAmount) + '</div>' : ''}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-size:12px;color:#666">
        <strong>${App.esc(biz.name)}</strong><br>
        ${App.esc(biz.contact)}<br>
        ${App.esc(biz.address)}<br>
        Tel: ${App.esc(biz.phone)}${biz.hstNumber ? ' | HST: ' + App.esc(biz.hstNumber) : ''}
        <br><br>
        This quote is valid for 30 days. To accept, call ${App.esc(biz.phone)} or reply to this quote.
      </div>`, 'Quote #' + q.number);
  },
  _emailQuoteDirect(id) {
    this._save(id);
    const q = App.state.quotes.find(x => x.id === id);
    if (!q) return;
    if (!q.customerEmail) return App.toast('Add a customer email first', 'error');
    this._emailQuote(q);
    q.status = 'sent'; App.saveState(); App.handleRoute();
    App.toast('Email client opened');
  },
  _shareQuote(id) {
    this._save(id);
    const q = App.state.quotes.find(x => x.id === id);
    if (!q) return;
    const biz = App.getBusinessInfo();
    const rows = q.items.map(i => `<tr><td style="padding:10px 12px;border-bottom:1px solid #eee">${App.esc(i.desc)}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${App.formatCurrency(i.price)}</td></tr>`).join('');
    const acceptSubject = encodeURIComponent(`Accept Quote #${q.number} — ${biz.name}`);
    const acceptBody = encodeURIComponent(`Hi,\n\nI would like to accept Quote #${q.number}.\n\nThank you.`);
    const declineSubject = encodeURIComponent(`Re: Quote #${q.number} — ${biz.name}`);
    const declineBody = encodeURIComponent(`Hi,\n\nI have decided not to proceed with Quote #${q.number} at this time.\n\nThank you.`);
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quote #${q.number} — ${App.esc(biz.name)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f7fa;color:#333;line-height:1.5}
  .container{max-width:680px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,.08);overflow:hidden}
  .header{background:linear-gradient(135deg,#1a2332,#2d3f54);color:#fff;padding:32px 40px}
  .header h1{font-size:24px;font-weight:700;margin-bottom:4px}
  .header p{opacity:.85;font-size:14px}
  .body{padding:32px 40px}
  .quote-info{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:24px;padding:16px;background:#f8f9fb;border-radius:8px;font-size:14px}
  .quote-info div strong{display:block;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#f8f9fb;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb}
  .totals{margin-top:20px;text-align:right;font-size:14px}
  .totals .row{padding:4px 0}
  .totals .total{font-size:22px;font-weight:700;color:#1a2332;margin-top:8px;padding-top:8px;border-top:2px solid #1a2332}
  .deposit-box{margin-top:20px;padding:16px;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;font-size:14px}
  .deposit-box strong{color:#b45309}
  .actions{display:flex;gap:12px;margin-top:28px;flex-wrap:wrap}
  .btn-accept{background:#16a34a;color:#fff;padding:12px 28px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
  .btn-decline{background:#fff;color:#666;padding:12px 28px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;cursor:pointer;text-decoration:none;display:inline-block}
  .btn-accept:hover{background:#15803d}
  .btn-decline:hover{background:#f9fafb}
  .footer{padding:24px 40px;background:#f8f9fb;border-top:1px solid #e5e7eb;font-size:12px;color:#666;text-align:center}
  .notes{margin-top:20px;padding:16px;background:#f0f7ff;border-radius:8px;font-size:14px}
  @media(max-width:600px){.container{margin:0;border-radius:0}.header,.body,.footer{padding:24px 20px}}
</style></head><body>
<div class="container">
  <div class="header">
    <h1>${App.esc(biz.name)}</h1>
    <p>Professional Quote</p>
  </div>
  <div class="body">
    <div class="quote-info">
      <div><strong>Quote Number</strong>#${q.number}</div>
      <div><strong>Date</strong>${App.formatDate(q.date)}</div>
      <div><strong>Prepared For</strong>${App.esc(q.customer || 'Valued Customer')}</div>
      <div><strong>Valid Until</strong>${App.formatDate(new Date(new Date(q.date).getTime() + 30*86400000).toISOString().slice(0,10))}</div>
    </div>
    <table>
      <thead><tr><th style="text-align:left">Service</th><th style="text-align:right">Price</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row">Subtotal: ${App.formatCurrency(q.subtotal)}</div>
      ${q.discountAmount ? `<div class="row" style="color:#16a34a">Discount: -${App.formatCurrency(q.discountAmount)}</div>` : ''}
      <div class="row">${q.taxExempt ? 'HST: Exempt' : 'HST (13%): ' + App.formatCurrency(q.tax)}</div>
      <div class="total">Total: ${App.formatCurrency(q.total)}</div>
    </div>
    ${q.depositAmount ? `<div class="deposit-box"><strong>Deposit Required:</strong> ${App.formatCurrency(q.depositAmount)}${q.depositType==='percent'?' ('+q.depositValue+'% of total)':''} due upon acceptance</div>` : ''}
    ${q.notes ? `<div class="notes"><strong>Notes:</strong><br>${App.esc(q.notes)}</div>` : ''}
    <div class="actions">
      <a class="btn-accept" href="mailto:${App.esc(biz.email)}?subject=${acceptSubject}&body=${acceptBody}">✓ Accept Quote</a>
      <a class="btn-decline" href="mailto:${App.esc(biz.email)}?subject=${declineSubject}&body=${declineBody}">✕ Decline</a>
    </div>
  </div>
  <div class="footer">
    <strong>${App.esc(biz.name)}</strong> · ${App.esc(biz.address)}<br>
    Tel: ${App.esc(biz.phone)} · Email: ${App.esc(biz.email)}${biz.hstNumber ? ' · HST: ' + App.esc(biz.hstNumber) : ''}<br>
    <span style="margin-top:4px;display:inline-block">This quote is valid for 30 days from the date issued.</span>
  </div>
</div>
</body></html>`);
    win.document.close();
    App.toast('Share page opened in new tab');
  }
};
