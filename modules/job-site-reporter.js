// FlowJob — Job Site Reporter Module
// Photo documentation, damage assessment, PDF reports for insurance claims

const JobSiteReporter = {
  categories: [
    { id: 'before', label: 'Before', icon: '📷' },
    { id: 'during', label: 'During', icon: '🔧' },
    { id: 'after', label: 'After', icon: '✅' },
    { id: 'damage', label: 'Damage', icon: '⚠️' },
    { id: 'materials', label: 'Materials', icon: '📦' },
    { id: 'measurements', label: 'Measurements', icon: '📏' },
    { id: 'code-issues', label: 'Code Issues', icon: '🚫' },
    { id: 'hazards', label: 'Hazards', icon: '☠️' },
  ],

  damageTypes: ['Water Damage', 'Mold', 'Corrosion', 'Crack', 'Blockage', 'Leak', 'Structural', 'Code Violation'],
  severityLevels: ['Minor', 'Moderate', 'Severe', 'Critical'],

  renderReporter() {
    const reports = App.state.photoReports || [];
    const activeReport = App.state.activePhotoReport;

    if (activeReport) {
      return this.renderActiveReport(activeReport);
    }

    return `
      <div class="glass-card p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-gold-400">📸 Photo Reports</h3>
          <button class="btn btn-gold btn-sm" onclick="JobSiteReporter.newReport()">+ New Report</button>
        </div>
        ${reports.length === 0 ?
          '<p class="text-muted text-center p-4">No photo reports yet. Create one to start documenting job sites.</p>' :
          reports.map((r, i) => `
            <div class="flex justify-between items-center p-3 mb-2" style="background:rgba(255,255,255,0.03);border-radius:8px;cursor:pointer;" onclick="JobSiteReporter.openReport(${i})">
              <div>
                <div class="font-bold">${r.title || 'Untitled Report'}</div>
                <div class="text-muted text-sm">${r.customer || 'No customer'} — ${r.date || 'No date'} — ${(r.photos || []).length} photos</div>
              </div>
              <div class="flex gap-2">
                <span class="badge badge-${r.status === 'complete' ? 'success' : 'warning'}">${r.status || 'draft'}</span>
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();JobSiteReporter.deleteReport(${i})">🗑️</button>
              </div>
            </div>
          `).join('')}
      </div>
    `;
  },

  renderActiveReport(report) {
    const photos = report.photos || [];
    const grouped = {};
    this.categories.forEach(c => grouped[c.id] = []);
    photos.forEach(p => {
      if (grouped[p.category]) grouped[p.category].push(p);
    });

    return `
      <div class="flex justify-between items-center mb-4">
        <button class="btn btn-outline btn-sm" onclick="JobSiteReporter.closeReport()">← Back to Reports</button>
        <div class="flex gap-2">
          <button class="btn btn-outline btn-sm" onclick="JobSiteReporter.editReportInfo()">✏️ Edit Info</button>
          <button class="btn btn-gold btn-sm" onclick="JobSiteReporter.exportReport()">📄 Export Report</button>
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-gold-400 mb-2">${App.esc(report.title || 'Untitled Report')}</h3>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><span class="text-muted">Customer:</span> ${App.esc(report.customer || 'N/A')}</div>
          <div><span class="text-muted">Property:</span> ${App.esc(report.address || 'N/A')}</div>
          <div><span class="text-muted">Date:</span> ${App.esc(report.date || 'N/A')}</div>
          <div><span class="text-muted">Type:</span> ${App.esc(report.jobType || 'N/A')}</div>
          <div><span class="text-muted">Job ID:</span> ${App.esc(report.jobId || 'N/A')}</div>
          <div><span class="text-muted">Technician:</span> ${App.esc(report.technician || 'N/A')}</div>
        </div>
      </div>

      <div class="glass-card p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-gold-400">📷 Photos</h3>
          <button class="btn btn-gold btn-sm" onclick="JobSiteReporter.addPhoto()">+ Add Photo</button>
        </div>

        ${this.categories.map(cat => {
          const catPhotos = grouped[cat.id] || [];
          if (catPhotos.length === 0 && cat.id !== 'before' && cat.id !== 'after' && cat.id !== 'damage') return '';
          return `
            <div class="mb-4">
              <h4 class="font-bold mb-2">${cat.icon} ${cat.label} (${catPhotos.length})</h4>
              ${catPhotos.length === 0 ?
                '<p class="text-muted text-sm">No photos in this category</p>' :
                catPhotos.map((p, pi) => `
                  <div class="p-3 mb-2" style="background:rgba(255,255,255,0.03);border-radius:8px;">
                    <div class="flex justify-between">
                      <div>
                        <div class="font-bold">${App.esc(p.description || 'No description')}</div>
                        <div class="text-muted text-sm">${p.timestamp || ''} ${p.severity ? '— Severity: ' + p.severity : ''} ${p.damageType ? '— ' + p.damageType : ''}</div>
                      </div>
                      <button class="btn btn-outline btn-sm" style="color:#ef4444" onclick="JobSiteReporter.removePhoto(${photos.indexOf(p)})">✕</button>
                    </div>
                  </div>
                `).join('')}
            </div>
          `;
        }).join('')}
      </div>

      ${this.renderDamageSummary(photos)}

      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-gold-400 mb-2">📝 Notes</h3>
        <textarea id="report-notes" class="form-control" rows="4" placeholder="Additional observations, code issues, safety concerns..."
          onchange="JobSiteReporter.saveNotes(this.value)">${App.esc(report.notes || '')}</textarea>
      </div>
    `;
  },

  renderDamageSummary(photos) {
    const damagePhotos = photos.filter(p => p.category === 'damage');
    if (damagePhotos.length === 0) return '';

    return `
      <div class="glass-card p-6" style="border:2px solid #ef4444;">
        <h3 class="text-lg font-bold mb-4" style="color:#ef4444;">⚠️ Damage Assessment Summary</h3>
        <table class="data-table" style="width:100%;">
          <thead><tr><th>Type</th><th>Severity</th><th>Description</th></tr></thead>
          <tbody>
            ${damagePhotos.map(p => `
              <tr>
                <td>${App.esc(p.damageType || 'Unspecified')}</td>
                <td><span class="badge badge-${p.severity === 'Critical' ? 'danger' : p.severity === 'Severe' ? 'warning' : 'info'}">${App.esc(p.severity || 'N/A')}</span></td>
                <td>${App.esc(p.description || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  newReport() {
    const biz = App.getBusinessInfo();
    App.showModal('New Photo Report', `
      <div class="form-grid">
        <div class="form-group"><label>Report Title</label><input id="nr-title" class="form-control" placeholder="e.g., Water Damage - Smith Residence"></div>
        <div class="form-group"><label>Customer</label><input id="nr-customer" class="form-control" placeholder="Customer name"></div>
        <div class="form-group"><label>Property Address</label><input id="nr-address" class="form-control" placeholder="123 Main St"></div>
        <div class="form-group"><label>Date</label><input id="nr-date" class="form-control" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label>Job Type</label>
          <select id="nr-type" class="form-control">
            <option value="repair">Repair</option><option value="installation">Installation</option>
            <option value="inspection">Inspection</option><option value="damage-assessment">Damage Assessment</option>
            <option value="insurance-claim">Insurance Claim</option>
          </select>
        </div>
        <div class="form-group"><label>Job ID (optional)</label><input id="nr-jobid" class="form-control" placeholder="JOB-001"></div>
        <div class="form-group"><label>Technician</label><input id="nr-tech" class="form-control" value="${App.esc(biz.contact || '')}"></div>
      </div>
      <button class="btn btn-gold mt-3" onclick="JobSiteReporter.saveNewReport()">Create Report</button>
    `);
  },

  saveNewReport() {
    const report = {
      title: document.getElementById('nr-title')?.value || 'Untitled',
      customer: document.getElementById('nr-customer')?.value || '',
      address: document.getElementById('nr-address')?.value || '',
      date: document.getElementById('nr-date')?.value || new Date().toISOString().split('T')[0],
      jobType: document.getElementById('nr-type')?.value || '',
      jobId: document.getElementById('nr-jobid')?.value || '',
      technician: document.getElementById('nr-tech')?.value || '',
      status: 'draft',
      photos: [],
      notes: '',
      created: new Date().toISOString(),
    };
    const reports = App.state.photoReports || [];
    reports.push(report);
    App.state.photoReports = reports;
    App.state.activePhotoReport = report;
    App.state.activePhotoReportIdx = reports.length - 1;
    App.saveState();
    App.closeModal();
    this.refresh();
    App.toast('Photo report created!', 'success');
  },

  openReport(idx) {
    const reports = App.state.photoReports || [];
    if (!reports[idx]) return;
    App.state.activePhotoReport = reports[idx];
    App.state.activePhotoReportIdx = idx;
    this.refresh();
  },

  closeReport() {
    delete App.state.activePhotoReport;
    delete App.state.activePhotoReportIdx;
    this.refresh();
  },

  addPhoto() {
    App.showModal('Add Photo', `
      <div class="form-grid">
        <div class="form-group"><label>Category</label>
          <select id="ap-category" class="form-control">
            ${this.categories.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Description</label><input id="ap-desc" class="form-control" placeholder="What does this photo show?"></div>
        <div class="form-group"><label>Timestamp</label><input id="ap-time" class="form-control" type="datetime-local" value="${new Date().toISOString().slice(0, 16)}"></div>
        <div class="form-group" id="ap-damage-fields" style="display:none;">
          <label>Damage Type</label>
          <select id="ap-damage" class="form-control">
            ${this.damageTypes.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="ap-severity-field" style="display:none;">
          <label>Severity</label>
          <select id="ap-severity" class="form-control">
            ${this.severityLevels.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-gold mt-3" onclick="JobSiteReporter.savePhoto()">Add Photo</button>
    `);

    // Show/hide damage fields based on category
    document.getElementById('ap-category')?.addEventListener('change', (e) => {
      const isDamage = e.target.value === 'damage';
      const df = document.getElementById('ap-damage-fields');
      const sf = document.getElementById('ap-severity-field');
      if (df) df.style.display = isDamage ? 'block' : 'none';
      if (sf) sf.style.display = isDamage ? 'block' : 'none';
    });
  },

  savePhoto() {
    const photo = {
      category: document.getElementById('ap-category')?.value || 'before',
      description: document.getElementById('ap-desc')?.value || '',
      timestamp: document.getElementById('ap-time')?.value || new Date().toISOString(),
      damageType: document.getElementById('ap-damage')?.value || '',
      severity: document.getElementById('ap-severity')?.value || '',
    };
    const report = App.state.activePhotoReport;
    if (!report) return;
    report.photos = report.photos || [];
    report.photos.push(photo);
    this.syncReport(report);
    App.closeModal();
    this.refresh();
    App.toast('Photo added', 'success');
  },

  removePhoto(idx) {
    const report = App.state.activePhotoReport;
    if (!report || !report.photos) return;
    report.photos.splice(idx, 1);
    this.syncReport(report);
    this.refresh();
  },

  saveNotes(val) {
    const report = App.state.activePhotoReport;
    if (!report) return;
    report.notes = val;
    this.syncReport(report);
  },

  editReportInfo() {
    const r = App.state.activePhotoReport;
    if (!r) return;
    App.showModal('Edit Report Info', `
      <div class="form-grid">
        <div class="form-group"><label>Title</label><input id="er-title" class="form-control" value="${App.esc(r.title || '')}"></div>
        <div class="form-group"><label>Customer</label><input id="er-customer" class="form-control" value="${App.esc(r.customer || '')}"></div>
        <div class="form-group"><label>Address</label><input id="er-address" class="form-control" value="${App.esc(r.address || '')}"></div>
        <div class="form-group"><label>Status</label>
          <select id="er-status" class="form-control">
            <option value="draft" ${r.status === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="complete" ${r.status === 'complete' ? 'selected' : ''}>Complete</option>
          </select>
        </div>
      </div>
      <button class="btn btn-gold mt-3" onclick="JobSiteReporter.saveReportInfo()">Save</button>
    `);
  },

  saveReportInfo() {
    const report = App.state.activePhotoReport;
    if (!report) return;
    report.title = document.getElementById('er-title')?.value || report.title;
    report.customer = document.getElementById('er-customer')?.value || report.customer;
    report.address = document.getElementById('er-address')?.value || report.address;
    report.status = document.getElementById('er-status')?.value || report.status;
    this.syncReport(report);
    App.closeModal();
    this.refresh();
    App.toast('Report updated', 'success');
  },

  syncReport(report) {
    const idx = App.state.activePhotoReportIdx;
    if (idx !== undefined && App.state.photoReports) {
      App.state.photoReports[idx] = report;
    }
    App.state.activePhotoReport = report;
    App.saveState();
  },

  exportReport() {
    const r = App.state.activePhotoReport;
    if (!r) return;
    const photos = r.photos || [];
    const grouped = {};
    this.categories.forEach(c => grouped[c.id] = []);
    photos.forEach(p => { if (grouped[p.category]) grouped[p.category].push(p); });

    let html = `
      <p><strong>Customer:</strong> ${App.esc(r.customer || 'N/A')} | <strong>Property:</strong> ${App.esc(r.address || 'N/A')}</p>
      <p><strong>Date:</strong> ${App.esc(r.date || 'N/A')} | <strong>Type:</strong> ${App.esc(r.jobType || 'N/A')} | <strong>Technician:</strong> ${App.esc(r.technician || 'N/A')}</p>
      <hr>`;

    this.categories.forEach(cat => {
      const cp = grouped[cat.id] || [];
      if (cp.length === 0) return;
      html += `<h3>${cat.icon} ${cat.label} Photos</h3><table><thead><tr><th>#</th><th>Description</th><th>Time</th>`;
      if (cat.id === 'damage') html += '<th>Type</th><th>Severity</th>';
      html += '</tr></thead><tbody>';
      cp.forEach((p, i) => {
        html += `<tr><td>${i + 1}</td><td>${App.esc(p.description || '')}</td><td>${App.esc(p.timestamp || '')}</td>`;
        if (cat.id === 'damage') html += `<td>${App.esc(p.damageType || '')}</td><td>${App.esc(p.severity || '')}</td>`;
        html += '</tr>';
      });
      html += '</tbody></table>';
    });

    if (r.notes) html += `<h3>Notes</h3><p>${App.esc(r.notes)}</p>`;

    App.printSection('Job Site Photo Report', html);
  },

  deleteReport(idx) {
    if (!confirm('Delete this report?')) return;
    const reports = App.state.photoReports || [];
    reports.splice(idx, 1);
    App.state.photoReports = reports;
    App.saveState();
    this.refresh();
    App.toast('Report deleted', 'info');
  },

  refresh() {
    const content = document.getElementById('content');
    if (content && window.location.hash === '#photo-report') {
      content.innerHTML = `<div class="page-header"><h2>📸 Job Site Reporter</h2></div>${this.renderReporter()}`;
      App.injectPageIcons();
    }
  },
};
