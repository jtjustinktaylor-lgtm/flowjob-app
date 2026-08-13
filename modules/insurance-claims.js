/* ============================================
   INSURANCE CLAIMS — FlowJob
   Claim documentation, photos, adjuster comm
   ============================================ */
const InsuranceClaims = (() => {
  // Claim status types
  const STATUS_TYPES = {
    draft: { label: 'Draft', color: 'gray', icon: '📝' },
    submitted: { label: 'Submitted', color: 'blue', icon: '📤' },
    under_review: { label: 'Under Review', color: 'yellow', icon: '🔍' },
    adjuster_assigned: { label: 'Adjuster Assigned', color: 'purple', icon: '👤' },
    inspection_scheduled: { label: 'Inspection Scheduled', color: 'cyan', icon: '📅' },
    approved: { label: 'Approved', color: 'green', icon: '✅' },
    partial_approval: { label: 'Partially Approved', color: 'orange', icon: '⚠️' },
    denied: { label: 'Denied', color: 'red', icon: '❌' },
    paid: { label: 'Paid', color: 'gold', icon: '💰' },
    closed: { label: 'Closed', color: 'gray', icon: '📁' }
  };

  // Damage types
  const DAMAGE_TYPES = {
    water_damage: { name: 'Water Damage', icon: '💧', common: true },
    sewer_backup: { name: 'Sewer Backup', icon: '🚽', common: true },
    frozen_pipes: { name: 'Frozen Pipes', icon: '❄️', common: true },
    burst_pipe: { name: 'Burst Pipe', icon: '💥', common: true },
    water_heater: { name: 'Water Heater Failure', icon: '🔥', common: true },
    flood: { name: 'Flood Damage', icon: '🌊', common: false },
    mold: { name: 'Mold from Plumbing', icon: '🦠', common: false },
    gas_leak: { name: 'Gas Leak', icon: '⚠️', common: false },
    foundation: { name: 'Foundation Leak', icon: '🏗️', common: false },
    other: { name: 'Other', icon: '📋', common: false }
  };

  // Create claim
  const createClaim = (data) => {
    if (!App.state.claims) App.state.claims = [];
    const claim = {
      id: Date.now(),
      jobId: data.jobId,
      customerId: data.customerId,
      customerName: data.customerName,
      insuranceCompany: data.insuranceCompany || '',
      claimNumber: data.claimNumber || '',
      policyNumber: data.policyNumber || '',
      damageType: data.damageType || 'water_damage',
      damageDescription: data.damageDescription || '',
      estimatedCost: data.estimatedCost || 0,
      status: 'draft',
      adjusterName: data.adjusterName || '',
      adjusterPhone: data.adjusterPhone || '',
      adjusterEmail: data.adjusterEmail || '',
      photos: [],
      documents: [],
      communications: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: data.notes || ''
    };
    App.state.claims.push(claim);
    App.saveState();
    showToast('Claim created', 'success');
    return claim;
  };

  // Update claim
  const updateClaim = (claimId, updates) => {
    const claim = App.state.claims?.find(c => c.id === claimId);
    if (!claim) return false;
    Object.assign(claim, updates, { updatedAt: new Date().toISOString() });
    App.saveState();
    return true;
  };

  // Add photos to claim
  const addPhotos = (claimId, photos) => {
    const claim = App.state.claims?.find(c => c.id === claimId);
    if (!claim) return false;
    photos.forEach(photo => {
      claim.photos.push({
        id: Date.now() + Math.random(),
        url: photo.url || photo,
        caption: photo.caption || '',
        category: photo.category || 'damage',
        timestamp: new Date().toISOString()
      });
    });
    claim.updatedAt = new Date().toISOString();
    App.saveState();
    return true;
  };

  // Add communication
  const addCommunication = (claimId, comm) => {
    const claim = App.state.claims?.find(c => c.id === claimId);
    if (!claim) return false;
    claim.communications.push({
      id: Date.now(),
      type: comm.type || 'phone',
      direction: comm.direction || 'outbound',
      with: comm.with || '',
      subject: comm.subject || '',
      notes: comm.notes || '',
      date: new Date().toISOString()
    });
    claim.updatedAt = new Date().toISOString();
    App.saveState();
    return true;
  };

  // Generate claim report
  const generateReport = (claimId) => {
    const claim = App.state.claims?.find(c => c.id === claimId);
    if (!claim) {
      showToast('Claim not found', 'error');
      return null;
    }
    const settings = App.state.settings || {};
    const customer = App.state.customers?.find(c => c.id === claim.customerId);
    const job = App.state.jobs?.find(j => j.id === claim.jobId);
    const report = `
INSURANCE CLAIM DOCUMENTATION
${settings.businessName || 'FlowJob Plumbing'}
${settings.address || ''}
${settings.phone || ''}

Date: ${new Date().toLocaleDateString()}
Claim #: ${claim.claimNumber || 'Pending'}

═══════════════════════════════════════════

CLAIM INFORMATION

Insurance Company: ${claim.insuranceCompany}
Policy Number: ${claim.policyNumber}
Claim Number: ${claim.claimNumber}
Status: ${STATUS_TYPES[claim.status]?.label || claim.status}

═══════════════════════════════════════════

CUSTOMER INFORMATION

Name: ${customer?.name || claim.customerName || 'N/A'}
Address: ${customer?.address || 'N/A'}
Phone: ${customer?.phone || 'N/A'}
Email: ${customer?.email || 'N/A'}

═══════════════════════════════════════════

DAMAGE ASSESSMENT

Type: ${DAMAGE_TYPES[claim.damageType]?.name || claim.damageType}
Description: ${claim.damageDescription || 'N/A'}

Estimated Repair Cost: $${(claim.estimatedCost || 0).toFixed(2)}

═══════════════════════════════════════════

WORK PERFORMED

Job #: ${job?.id || 'N/A'}
Service: ${job?.title || 'N/A'}
Date: ${job?.date || 'N/A'}
Cost: $${(job?.total || 0).toFixed(2)}

═══════════════════════════════════════════

ADJUSTER CONTACT

Name: ${claim.adjusterName || 'N/A'}
Phone: ${claim.adjusterPhone || 'N/A'}
Email: ${claim.adjusterEmail || 'N/A'}

═══════════════════════════════════════════

PHOTOS: ${claim.photos.length} attached
DOCUMENTS: ${claim.documents.length} attached
COMMUNICATIONS: ${claim.communications.length} logged

═══════════════════════════════════════════

NOTES:
${claim.notes || 'None'}

═══════════════════════════════════════════

Prepared by: ${settings.businessName || 'FlowJob Plumbing'}
Date: ${new Date().toLocaleDateString()}
`;
    // Download as text
    download(report, `FlowJob_Claim_${claim.claimNumber || claim.id}.txt`, 'text/plain');
    return report;
  };

  // Get stats
  const getStats = () => {
    const claims = App.state.claims || [];
    return {
      total: claims.length,
      active: claims.filter(c => !['closed', 'paid', 'denied'].includes(c.status)).length,
      approved: claims.filter(c => ['approved', 'partial_approval', 'paid'].includes(c.status)).length,
      totalValue: claims.reduce((sum, c) => sum + (c.estimatedCost || 0), 0)
    };
  };

  // Render settings
  const renderSettings = () => {
    const stats = getStats();
    const claims = App.state.claims || [];
    return `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">📸 Insurance Claims</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-gold-400">${stats.total}</p>
            <p class="text-sm text-gray-400">Total Claims</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-blue-400">${stats.active}</p>
            <p class="text-sm text-gray-400">Active</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-green-400">${stats.approved}</p>
            <p class="text-sm text-gray-400">Approved</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-purple-400">$${stats.totalValue.toFixed(0)}</p>
            <p class="text-sm text-gray-400">Total Value</p>
          </div>
        </div>
        ${claims.length > 0 ? `
          <div class="mb-4 max-h-48 overflow-y-auto">
            ${claims.slice(0, 10).map(c => `
              <div class="flex items-center justify-between p-3 rounded-lg mb-2" style="background:rgba(255,255,255,0.05)">
                <div>
                  <p class="font-semibold">${DAMAGE_TYPES[c.damageType]?.icon || '📋'} Claim #${c.claimNumber || c.id}</p>
                  <p class="text-xs text-gray-400">${App.esc(c.insuranceCompany)} • $${(c.estimatedCost || 0).toFixed(2)}</p>
                </div>
                <span class="text-xs px-2 py-1 rounded" style="background:rgba(255,255,255,0.1)">${STATUS_TYPES[c.status]?.label || c.status}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        <button onclick="InsuranceClaims.showCreateForm()" class="btn btn-primary w-full py-2">
          ➕ New Insurance Claim
        </button>
      </div>
    `;
  };

  // Show create form
  const showCreateForm = () => {
    const jobs = App.state.jobs || [];
    const customers = App.state.customers || [];
    let html = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Insurance Company *</label>
          <input type="text" id="claim-insurance" class="form-input" placeholder="e.g., State Farm, Allstate">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Claim Number</label>
          <input type="text" id="claim-number" class="form-input" placeholder="Claim #">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Customer</label>
          <select id="claim-customer" class="form-input">
            <option value="">Select customer...</option>
            ${customers.map(c => `<option value="${c.id}">${App.esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Related Job</label>
          <select id="claim-job" class="form-input">
            <option value="">Select job...</option>
            ${jobs.map(j => `<option value="${j.id}">#${j.id} - ${App.esc(j.title)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Damage Type</label>
          <select id="claim-damage" class="form-input">
            ${Object.entries(DAMAGE_TYPES).map(([k,v]) => `<option value="${k}">${v.icon} ${v.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Estimated Cost ($)</label>
          <input type="number" id="claim-cost" class="form-input" placeholder="0.00" step="0.01">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Description</label>
          <textarea id="claim-desc" class="form-input" rows="3" placeholder="Describe the damage..."></textarea>
        </div>
        <button onclick="InsuranceClaims.createFromForm()" class="btn btn-primary w-full py-2">
          Create Claim
        </button>
      </div>`;
    App.showModal('New Insurance Claim', html);
  };

  // Create from form
  const createFromForm = () => {
    const insurance = document.getElementById('claim-insurance')?.value?.trim();
    if (!insurance) {
      showToast('Insurance company is required', 'warning');
      return;
    }
    const customerId = parseInt(document.getElementById('claim-customer')?.value);
    const customer = App.state.customers?.find(c => c.id === customerId);
    createClaim({
      insuranceCompany: insurance,
      claimNumber: document.getElementById('claim-number')?.value?.trim(),
      customerId: customerId,
      customerName: customer?.name,
      jobId: parseInt(document.getElementById('claim-job')?.value),
      damageType: document.getElementById('claim-damage')?.value,
      estimatedCost: parseFloat(document.getElementById('claim-cost')?.value) || 0,
      damageDescription: document.getElementById('claim-desc')?.value?.trim()
    });
    App.closeModal();
  };

  return {
    STATUS_TYPES,
    DAMAGE_TYPES,
    createClaim,
    updateClaim,
    addPhotos,
    addCommunication,
    generateReport,
    getStats,
    renderSettings,
    showCreateForm,
    createFromForm
  };
})();
