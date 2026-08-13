// E-Transfer & Payment Settings Module
// Canadian-focused payment configuration with e-transfer details

const PaymentSettings = {
  init() {
    if (!App.state.businessInfo) App.state.businessInfo = {};
    const biz = App.state.businessInfo;
    if (!biz.country) biz.country = 'CA';
    if (!biz.currency) biz.currency = 'CAD';
    if (!biz.taxLabel) biz.taxLabel = 'HST';
    if (!biz.taxRate) biz.taxRate = 13;
    if (!biz.province) biz.province = 'ON';
    App.saveState();
  },

  renderSettingsCard() {
    this.init();
    const biz = App.state.businessInfo || {};
    return `
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">🍁 Canadian Business Info</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Business Name</label>
          <input class="form-control" id="biz-name" value="${App.esc(biz.name||'')}" placeholder="FlowJob Plumbing"></div>
        <div class="form-group"><label>Contact Name</label>
          <input class="form-control" id="biz-contact" value="${App.esc(biz.contact||'')}" placeholder="Your name"></div>
        <div class="form-group"><label>Phone</label>
          <input class="form-control" id="biz-phone" value="${App.esc(biz.phone||'')}" placeholder="(519) 555-1234"></div>
        <div class="form-group"><label>Email</label>
          <input class="form-control" id="biz-email" value="${App.esc(biz.email||'')}" placeholder="you@business.ca"></div>
        <div class="form-group"><label>Address</label>
          <input class="form-control" id="biz-address" value="${App.esc(biz.address||'')}" placeholder="123 Main St, London ON N6A 1A1"></div>
        <div class="form-group"><label>Province</label>
          <select class="form-control" id="biz-province">
            ${['ON','AB','BC','MB','NB','NL','NS','NT','NU','PE','QC','SK','YT'].map(p => {
              const names = {ON:'Ontario',AB:'Alberta',BC:'British Columbia',MB:'Manitoba',NB:'New Brunswick',NL:'Newfoundland',NS:'Nova Scotia',NT:'Northwest Territories',NU:'Nunavut',PE:'Prince Edward Island',QC:'Quebec',SK:'Saskatchewan',YT:'Yukon'};
              return `<option value="${p}" ${biz.province===p?'selected':''}>${names[p]||p}</option>`;
            }).join('')}
          </select></div>
        <div class="form-group"><label>HST/GST Number</label>
          <input class="form-control" id="biz-hst" value="${App.esc(biz.hstNumber||'')}" placeholder="123456789 RT0001"></div>
        <div class="form-group"><label>License #</label>
          <input class="form-control" id="biz-license" value="${App.esc(biz.license||'')}" placeholder="Plumbing license number"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="PaymentSettings.saveBusiness()">💾 Save Business Info</button>
    </div>

    <div class="card" style="margin-bottom:16px;border-left:4px solid var(--primary)">
      <h3 style="margin-bottom:12px">📧 Interac E-Transfer Settings</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">These details appear on invoices and quotes so customers know where to send payment.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>E-Transfer Email or Phone</label>
          <input class="form-control" id="biz-etransfer" value="${App.esc(biz.etransferEmail||'')}" placeholder="payments@yourbusiness.ca"></div>
        <div class="form-group"><label>Auto-Deposit?</label>
          <select class="form-control" id="biz-autodeposit">
            <option value="true" ${biz.etransferAutoDeposit?'selected':''}>Yes — Auto-Deposit (no security question)</option>
            <option value="false" ${!biz.etransferAutoDeposit?'selected':''}>No — Require security question</option>
          </select></div>
        <div class="form-group"><label>Security Question (if not auto-deposit)</label>
          <input class="form-control" id="biz-security-q" value="${App.esc(biz.etransferSecurityQ||'')}" placeholder="What is the invoice number?"></div>
        <div class="form-group"><label>Security Answer Hint</label>
          <input class="form-control" id="biz-security-a" value="${App.esc(biz.etransferSecurityA||'')}" placeholder="Enter your invoice #"></div>
        <div class="form-group" style="grid-column:1/-1"><label>Additional Payment Notes</label>
          <textarea class="form-control" id="biz-etransfer-note" rows="2" placeholder="e.g. Please include invoice # in the message">${App.esc(biz.etransferNote||'')}</textarea></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="PaymentSettings.saveEtransfer()">💾 Save E-Transfer Settings</button>
      ${biz.etransferEmail ? `<div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:8px;font-size:13px">
        <strong>Preview — How it appears on invoices:</strong>
        <div style="margin-top:8px;padding:10px;border:1px solid var(--border);border-radius:6px">
          <strong>📧 Payment Methods Accepted:</strong><br>
          • <strong>E-Transfer:</strong> Send to <strong>${App.esc(biz.etransferEmail)}</strong>${biz.etransferAutoDeposit ? ' (Auto-Deposit)' : ''}<br>
          • <strong>Cash:</strong> Accepted on-site<br>
          • <strong>Cheque:</strong> Payable to ${App.esc(biz.name || 'Your Business')}<br>
          ${biz.etransferSecurityQ ? '<br><strong>Security Q:</strong> ' + App.esc(biz.etransferSecurityQ) + '<br><strong>Answer:</strong> ' + App.esc(biz.etransferSecurityA || '[your answer]') : ''}
          ${biz.etransferNote ? '<br><small>' + App.esc(biz.etransferNote) + '</small>' : ''}
        </div>
      </div>` : ''}
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">🧮 Tax Configuration</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Province (determines tax rate)</label>
          <select class="form-control" id="tax-province" onchange="PaymentSettings.updateTaxRate(this.value)">
            <option value="ON" ${biz.province==='ON'?'selected':''}>Ontario — HST 13%</option>
            <option value="AB" ${biz.province==='AB'?'selected':''}>Alberta — GST 5%</option>
            <option value="BC" ${biz.province==='BC'?'selected':''}>British Columbia — GST 5%</option>
            <option value="MB" ${biz.province==='MB'?'selected':''}>Manitoba — GST 5%</option>
            <option value="NB" ${biz.province==='NB'?'selected':''}>New Brunswick — HST 15%</option>
            <option value="NL" ${biz.province==='NL'?'selected':''}>Newfoundland — HST 15%</option>
            <option value="NS" ${biz.province==='NS'?'selected':''}>Nova Scotia — HST 15%</option>
            <option value="PE" ${biz.province==='PE'?'selected':''}>PEI — HST 15%</option>
            <option value="QC" ${biz.province==='QC'?'selected':''}>Quebec — GST 5%</option>
            <option value="SK" ${biz.province==='SK'?'selected':''}>Saskatchewan — GST 5%</option>
          </select></div>
        <div class="form-group"><label>Tax Rate</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input class="form-control" id="tax-rate" value="${biz.taxRate||13}" style="max-width:80px">
            <span>%</span>
            <span style="font-size:12px;color:var(--text-muted)" id="tax-label">${biz.taxLabel||'HST'}</span>
          </div></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="PaymentSettings.saveTax()">💾 Save Tax Settings</button>
    </div>`;
  },

  saveBusiness() {
    const biz = App.state.businessInfo;
    biz.name = document.getElementById('biz-name').value.trim();
    biz.contact = document.getElementById('biz-contact').value.trim();
    biz.phone = document.getElementById('biz-phone').value.trim();
    biz.email = document.getElementById('biz-email').value.trim();
    biz.address = document.getElementById('biz-address').value.trim();
    biz.province = document.getElementById('biz-province').value;
    biz.hstNumber = document.getElementById('biz-hst').value.trim();
    biz.license = document.getElementById('biz-license').value.trim();
    biz.country = 'CA';
    biz.currency = 'CAD';
    App.saveState();
    App.updateSidebarFooter();
    App.toast('Business info saved');
  },

  saveEtransfer() {
    const biz = App.state.businessInfo;
    biz.etransferEmail = document.getElementById('biz-etransfer').value.trim();
    biz.etransferAutoDeposit = document.getElementById('biz-autodeposit').value === 'true';
    biz.etransferSecurityQ = document.getElementById('biz-security-q').value.trim();
    biz.etransferSecurityA = document.getElementById('biz-security-a').value.trim();
    biz.etransferNote = document.getElementById('biz-etransfer-note').value.trim();
    App.saveState();
    App.toast('E-Transfer settings saved');
    App.handleRoute();
  },

  saveTax() {
    const biz = App.state.businessInfo;
    biz.province = document.getElementById('tax-province').value;
    biz.taxRate = parseFloat(document.getElementById('tax-rate').value) || 13;
    biz.taxLabel = document.getElementById('tax-label').textContent;
    window.TAX_RATE = biz.taxRate / 100;
    App.saveState();
    App.toast('Tax settings saved — ' + biz.taxLabel + ' ' + biz.taxRate + '%');
  },

  updateTaxRate(province) {
    const rates = {
      'ON': { rate: 13, label: 'HST' }, 'AB': { rate: 5, label: 'GST' },
      'BC': { rate: 5, label: 'GST' }, 'MB': { rate: 5, label: 'GST' },
      'NB': { rate: 15, label: 'HST' }, 'NL': { rate: 15, label: 'HST' },
      'NS': { rate: 15, label: 'HST' }, 'PE': { rate: 15, label: 'HST' },
      'QC': { rate: 5, label: 'GST' }, 'SK': { rate: 5, label: 'GST' }
    };
    const r = rates[province] || { rate: 13, label: 'HST' };
    document.getElementById('tax-rate').value = r.rate;
    document.getElementById('tax-label').textContent = r.label;
  }
};
