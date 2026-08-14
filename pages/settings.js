// Settings Page — Formspree config, backup/restore, data management, payment settings
Pages.settings = function() {
  const formspree = App.state.formspreeEndpoint || '';
  const backups = App.getBackupInfo();
  const stateSize = (JSON.stringify(App.state).length / 1024).toFixed(1);
  const totalCustomers = (App.state.customers || []).length;
  const totalInvoices = (App.state.invoices || []).length;
  const totalQuotes = (App.state.quotes || []).length;
  const totalJobs = (App.state.jobs || []).length;

  return `
    <div class="page-header">
      <h2>Settings</h2>
      <p>Configure your app, manage backups, and set up integrations</p>
    </div>

    <div class="card" style="margin-bottom:16px;border-left:4px solid var(--primary)">
      <h3 style="margin-bottom:12px">🍁 Business & Payment Settings</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        Configure your Canadian business info, e-transfer details, tax rates, and accepted payment methods.
      </p>
      <a href="#settings/payments" class="btn btn-primary">⚙️ Open Payment Settings</a>
    </div>

    <div class="card" style="margin-bottom:16px;border-left:4px solid var(--primary)">
      <h3 style="margin-bottom:12px">🔧 Service Call Fee</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        Automatically add a service call fee line item to every new quote and invoice.
      </p>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <input type="checkbox" id="set-auto-svc" ${App.state.autoServiceCall ? 'checked' : ''}>
        <label for="set-auto-svc" style="margin:0;cursor:pointer">Auto-add service call fee to new quotes &amp; invoices</label>
      </div>
      <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0">
          <label>Service Call Price ($)</label>
          <input class="form-control" id="set-svc-price" type="number" min="0" step="0.01" value="${App.state.serviceCallPrice != null ? App.state.serviceCallPrice : 99}">
        </div>
        <button class="btn btn-primary" onclick="Settings.saveServiceCall()">Save</button>
      </div>
    </div>

    ${typeof CalendarIntegration !== 'undefined' ? CalendarIntegration.renderSettings() : ''}

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">📧 Formspree — Contact Form Endpoint</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        Your booking, quote request, and referral forms submit to Formspree. Create a free form at
        <a href="https://formspree.io" target="_blank" rel="noopener" style="color:var(--primary)">formspree.io</a>
        and paste your endpoint below.
      </p>
      <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:250px;margin-bottom:0">
          <label>Formspree Endpoint</label>
          <input class="form-control" id="set-formspree" value="${App.esc(formspree)}" placeholder="https://formspree.io/f/your-form-id">
        </div>
        <button class="btn btn-primary" onclick="Settings.saveFormspree()">Save</button>
      </div>
      ${formspree ? `<p style="color:var(--success);font-size:12px;margin-top:8px">✓ Forms will submit to: ${App.esc(formspree)}</p>` : `<p style="color:var(--warning,#e5a500);font-size:12px;margin-top:8px">⚠ No endpoint configured — forms will fall back to phone call</p>`}
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">💾 Backup & Restore</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">Auto-backup runs daily (7-day rolling). You can also manually export or restore.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn btn-primary" onclick="App.exportData()">📦 Export All Data</button>
        <button class="btn btn-outline" onclick="App.importData()">📥 Import from File</button>
        <button class="btn btn-outline" onclick="App.restoreFromBackup()">🔄 Restore from Auto-Backup</button>
      </div>
      ${backups.length > 0 ? `<div style="font-size:13px;color:var(--text-muted)"><strong>Auto-backups available:</strong> ${backups.map(b => `${b.date} (${b.size})`).join(' · ')}</div>` : '<p style="font-size:13px;color:var(--text-muted)">No auto-backups yet.</p>'}
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">📊 Data Summary</h3>
      <div class="grid grid-4">
        <div class="stat-card"><div class="stat-value">${totalCustomers}</div><div class="stat-label">Customers</div></div>
        <div class="stat-card"><div class="stat-value">${totalQuotes}</div><div class="stat-label">Quotes</div></div>
        <div class="stat-card"><div class="stat-value">${totalInvoices}</div><div class="stat-label">Invoices</div></div>
        <div class="stat-card"><div class="stat-value">${totalJobs}</div><div class="stat-label">Jobs</div></div>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Storage used: ${stateSize} KB</p>
    </div>

    <div class="card" style="margin-bottom:16px;border-left:4px solid var(--success)">
      <h3 style="margin-bottom:12px">📢 Share FlowJob</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        Know a plumber who could use this? Share FlowJob — it's free, works offline, and each person gets their own private workspace. No signup required.
      </p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn btn-primary" onclick="Settings.copyShareLink()">📋 Copy Link</button>
        <button class="btn btn-outline" onclick="Settings.shareViaText()">💬 Share via Text</button>
        <button class="btn btn-outline" onclick="Settings.shareViaEmail()">📧 Share via Email</button>
      </div>
      <div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px 14px;font-size:13px;font-family:monospace;word-break:break-all;color:var(--text-secondary)" id="share-url-display">
        ${window.location.origin}${window.location.pathname}
      </div>
    </div>

    <div class="card" style="border-color:var(--danger,#dc3545)">
      <h3 style="margin-bottom:12px;color:var(--danger,#dc3545)">⚠️ Danger Zone</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">These actions cannot be undone. Export your data first.</p>
      <button class="btn btn-danger" onclick="Settings.clearAllData()">Clear All Data</button>
    </div>
  `;
};

PageInit.settings = function() {};

const Settings = {
  saveFormspree() {
    const endpoint = document.getElementById('set-formspree').value.trim();
    App.state.formspreeEndpoint = endpoint;
    App.saveState();
    App.toast(endpoint ? 'Formspree endpoint saved' : 'Formspree endpoint cleared');
    App.handleRoute();
  },

  saveServiceCall() {
    const autoSvc = document.getElementById('set-auto-svc').checked;
    const svcPrice = parseFloat(document.getElementById('set-svc-price').value) || 0;
    App.state.autoServiceCall = autoSvc;
    App.state.serviceCallPrice = svcPrice;
    App.saveState();
    App.toast(autoSvc ? `Service call fee enabled — $${svcPrice.toFixed(2)}` : 'Service call fee disabled');
    App.handleRoute();
  },

  async clearAllData() {
    if (!(await App.confirm('This will permanently delete ALL data — quotes, invoices, jobs, customers, everything. Export first if you want to keep anything. Continue?'))) return;
    if (!(await App.confirm('Are you absolutely sure? This cannot be undone.'))) return;
    localStorage.removeItem('flowjob_state');
    location.reload();
  },

  getShareUrl() {
    return window.location.origin + window.location.pathname;
  },

  getShareMessage() {
    return 'Check out FlowJob — free plumbing business manager. Works offline, no signup needed. Quotes, invoices, scheduling, and more. Each plumber gets their own private workspace.';
  },

  async copyShareLink() {
    const url = this.getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      App.toast('📋 Link copied to clipboard!');
    } catch (e) {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      App.toast('📋 Link copied!');
    }
  },

  shareViaText() {
    const msg = this.getShareMessage() + '\n' + this.getShareUrl();
    if (navigator.share) {
      navigator.share({ title: 'FlowJob — Plumbing Business Manager', text: msg, url: this.getShareUrl() })
        .catch(() => {});
    } else {
      // Fallback: open SMS
      window.open('sms:?body=' + encodeURIComponent(msg), '_self');
    }
  },

  shareViaEmail() {
    const subject = encodeURIComponent('FlowJob — Free Plumbing Business Manager');
    const body = encodeURIComponent(this.getShareMessage() + '\n\n' + this.getShareUrl());
    window.open('mailto:?subject=' + subject + '&body=' + body, '_self');
  }
};

// Payment Settings Page (sub-page of settings)
Pages.settingsPayments = function() {
  return `
    <div class="page-header">
      <h2>🍁 Payment & Business Settings</h2>
      <p><a href="#settings" style="color:var(--primary)">← Back to Settings</a></p>
    </div>
    ${PaymentSettings.renderSettingsCard()}
  `;
};
