// E-Transfer & Payment Settings Module
// Canadian-focused payment configuration with e-transfer details

const PaymentSettings = {
  init() {
    if (!App.state.businessInfo) App.state.businessInfo = {};
    const biz = App.state.businessInfo;
    // Set Canadian defaults if not configured
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
    <!-- Canadian Business Info -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">🍁 Canadian Business Info</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Business Name</label>
          <input class="form-control" id="biz-name" value="${biz.name||''}" placeholder="FlowJob Plumbing"></div>
        <div class="form-group"><label>Contact Name</label>
          <input class="form-control" id="biz-contact" value="${biz.contact||''}" placeholder="Your name"></div>
        <div class="form-group"><label>Phone</label>
          <input class="form-control" id="biz-phone" value="${biz.phone||''}" placeholder="(519) 555-1234"></div>
        <div class="form-group"><label>Email</label>
          <input class="form-control" id="biz-email" value="${biz.email||''}" placeholder="you@business.ca"></div>
        <div class="form-group"><label>Address</label>
          <input class="form-control" id="biz-address" value="${biz.address||''}" placeholder="123 Main St, London ON N6A 1A1"></div>
        <div class="form-group"><label>Province</label>
          <select class="form-control" id="biz-province">
            ${['ON','AB','BC','MB','NB','NL','NS','NT','NU','PE','QC','SK','YT'].map(p =>
              `<option value="${p}" ${biz.province===p?'selected':''}>${p === 'ON' ? 'Ontario' : p === 'AB' ? 'Alberta' : p === 'BC' ? 'British Columbia' : p === 'MB' ? 'Manitoba' : p === 'NB' ? 'New Brunswick' : p === 'NL' ? 'Newfoundland' : p === 'NS' ? 'Nova Scotia' : p === 'QC' ? 'Quebec' : p === 'SK' ? 'Saskatchewan' : p}</option>`
            ).join('')}
          </select></div>
        <div class="form-group"><label>HST/GST Number</label>
          <input class="form-control" id="biz-hst" value="${biz.hstNumber||''}" placeholder="123456789 RT0001"></div>
        <div class="form-group"><label>License #</label>
          <input class="form-control" id="biz-license" value="${biz.license||''}" placeholder="Plumbing license number"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="PaymentSettings.saveBusiness()">💾 Save Business Info</button>
    </div>

    <!-- E-Transfer Configuration -->
    <div class="card" style="margin-bottom:16px;border-left:4px solid var(--primary)">
      <h3 style="margin-bottom:12px">📧 Interac E-Transfer Settings</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">
        These details appear on invoices and quotes so customers know where to send payment.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>E-Transfer Email or Phone</label>
          <input class="form-control" id="biz-etransfer" value="${biz.etransferEmail||''}" placeholder="payments@yourbusiness.ca or (519) 555-1234"></div>
        <div class="form-group"><label>Auto-Deposit Enabled?</label>
          <select class="form-control" id="biz-autodeposit">
            <option value="true" ${biz.etransferAutoDeposit?'selected':''}>Yes — Auto-Deposit (no security question needed)</option>
            <option value="false" ${!biz.etransferAutoDeposit?'selected':''}>No — Require security question</option>
          </select></div>
        <div class="form-group" style="grid-column:1/-1"><label>Security Question (if not auto-deposit)</label>
          <input class="form-control" id="biz-security-q" value="${biz.etransferSecurityQ||''}" placeholder="What is the invoice number?"></div>
        <div class="form-group" style="grid-column:1/-1"><label>Security Answer Hint</label>
          <input class="form-control" id="biz-security-a" value="${biz.etransferSecurityA||''}" placeholder="Enter your invoice # (e.g. 1001)"></div>
        <div class="form-group" style="grid-column:1/-1"><label>Additional Payment Notes</label>
          <textarea class="form-control" id="biz-etransfer-note" rows="2" placeholder="e.g. Please include invoice # in the message field">${biz.etransferNote||''}</textarea></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="PaymentSettings.saveEtransfer()">💾 Save E-Transfer Settings</button>
      ${biz.etransferEmail ? `<div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:8px;font-size:13px">
        <strong>Preview — How it appears on invoices:</strong><br>
        <div style="margin-top:8px;padding:10px;background:var(--card-bg,#fff);border:1px solid var(--border);border-radius:6px">
          <strong>📧 Payment Methods Accepted:</strong><br>
          • <strong>E-Transfer:</strong> Send to <strong>${biz.etransferEmail}</strong>${biz.etransferAutoDeposit ? ' (Auto-Deposit)' : ''}<br>
          • <strong>Cash:</strong> Accepted on-site<br>
          • <strong>Cheque:</strong> Payable to ${biz.name || 'Your Business'}<br>
          • <strong>Credit Card:</strong> Call ${biz.phone || 'to process'}<br>
          ${biz.etransferSecurityQ ? '<br><strong>Security Question:</strong> ' + biz.etransferSecurityQ + '<br><strong>Answer:</strong> ' + (biz.etransferSecurityA || '[your answer]') : ''}
          ${biz.etransferNote ? '<br><small>' + biz.etransferNote + '</small>' : ''}
        </div>
      </div>` : ''}
    </div>

    <!-- Accepted Payment Methods -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">💳 Accepted Payment Methods</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--bg);border-radius:8px;cursor:pointer">
          <input type="checkbox" id="pay-etransfer" checked disabled> 📧 Interac E-Transfer
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--bg);border-radius:8px;cursor:pointer">
          <input type="checkbox" id="pay-cash" checked disabled> 💵 Cash
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--bg);border-radius:8px;cursor:pointer">
          <input type="checkbox" id="pay-cheque" checked disabled> 📝 Cheque
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--bg);border-radius:8px;cursor:pointer">
          <input type="checkbox" id="pay-card" ${biz.acceptCard?'checked':''} onchange="PaymentSettings.toggleCard(this.checked)"> 💳 Credit Card
        </label>
      </div>
      ${biz.acceptCard ? `<div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:8px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Card Processor</label>
            <select class="form-control" id="biz-card-processor">
              <option value="square" ${biz.cardProcessor==='square'?'selected':''}>Square</option>
              <option value="stripe" ${biz.cardProcessor==='stripe'?'selected':''}>Stripe</option>
              <option value="clover" ${biz.cardProcessor==='clover'?'selected':''}>Clover</option>
              <option value="other" ${biz.cardProcessor==='other'?'selected':''}>Other</option>
            </select></div>
          <div class="form-group"><label>Card Processing Fee</label>
            <input class="form-control" id="biz-card-fee" value="${biz.cardFee||'2.65'}" placeholder="2.65">%</div>
        </div>
      </div>` : ''}
      <button class="btn btn-primary" style="margin-top:12px" onclick="PaymentSettings.saveMethods()">💾 Save Payment Methods</button>
    </div>

    <!-- Tax Configuration -->
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

  saveMethods() {
    const biz = App.state.businessInfo;
    biz.acceptCard = document.getElementById('pay-card')?.checked || false;
    biz.cardProcessor = document.getElementById('biz-card-processor')?.value || '';
    biz.cardFee = parseFloat(document.getElementById('biz-card-fee')?.value) || 0;
    App.saveState();
    App.toast('Payment methods saved');
  },

  saveTax() {
    const biz = App.state.businessInfo;
    biz.province = document.getElementById('tax-province').value;
    biz.taxRate = parseFloat(document.getElementById('tax-rate').value) || 13;
    biz.taxLabel = document.getElementById('tax-label').textContent;
    // Update global tax rate
    window.TAX_RATE = biz.taxRate / 100;
    App.saveState();
    App.toast('Tax settings saved');
  },

  toggleCard(checked) {
    const biz = App.state.businessInfo;
    biz.acceptCard = checked;
    App.saveState();
    App.handleRoute();
  },

  updateTaxRate(province) {
    const rates = {
      'ON': { rate: 13, label: 'HST' },
      'AB': { rate: 5, label: 'GST' },
      'BC': { rate: 5, label: 'GST' },
      'MB': { rate: 5, label: 'GST' },
      'NB': { rate: 15, label: 'HST' },
      'NL': { rate: 15, label: 'HST' },
      'NS': { rate: 15, label: 'HST' },
      'PE': { rate: 15, label: 'HST' },
      'QC': { rate: 5, label: 'GST' },
      'SK': { rate: 5, label: 'GST' }
    };
    const r = rates[province] || { rate: 13, label: 'HST' };
    document.getElementById('tax-rate').value = r.rate;
    document.getElementById('tax-label').textContent = r.label;
  }
};
