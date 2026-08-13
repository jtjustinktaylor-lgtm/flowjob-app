/* ============================================
   CONTRACT & LEGAL — FlowJob
   Service agreements, waivers, signatures
   ============================================ */
const ContractLegal = (() => {
  // Contract templates
  const TEMPLATES = {
    service_agreement: {
      name: 'Service Agreement',
      description: 'Standard plumbing service agreement',
      sections: ['scope', 'pricing', 'warranty', 'payment', 'liability', 'termination']
    },
    liability_waiver: {
      name: 'Liability Waiver',
      description: 'Waiver for high-risk work (water heater, sewer, etc.)',
      sections: ['acknowledgment', 'risks', 'waiver', 'indemnification']
    },
    change_order: {
      name: 'Change Order',
      description: 'Authorization for additional work',
      sections: ['original_scope', 'changes', 'pricing', 'approval']
    },
    warranty_agreement: {
      name: 'Warranty Agreement',
      description: 'Extended warranty terms',
      sections: ['coverage', 'exclusions', 'duration', 'claims']
    }
  };

  // Generate contract
  const generateContract = (type, jobData, customerData) => {
    const template = TEMPLATES[type];
    if (!template) {
      showToast('Contract template not found', 'error');
      return null;
    }
    const settings = App.state.settings || {};
    const contract = {
      id: Date.now(),
      type: type,
      jobId: jobData?.id,
      customerId: customerData?.id,
      createdAt: new Date().toISOString(),
      status: 'draft',
      signedBy: [],
      content: buildContractContent(type, jobData, customerData, settings)
    };
    if (!App.state.contracts) App.state.contracts = [];
    App.state.contracts.push(contract);
    App.saveState();
    return contract;
  };

  // Build contract content
  const buildContractContent = (type, job, customer, settings) => {
    const businessName = settings.businessName || 'FlowJob Plumbing';
    const address = settings.address || '';
    const phone = settings.phone || '';
    const email = settings.email || '';
    const today = new Date().toLocaleDateString();
    switch (type) {
      case 'service_agreement':
        return `
SERVICE AGREEMENT

Date: ${today}

BETWEEN:
${businessName}
${address}
Phone: ${phone}
Email: ${email}

AND:
${customer?.name || '[Customer Name]'}
${customer?.address || '[Customer Address]'}
Phone: ${customer?.phone || '[Phone]'}
Email: ${customer?.email || '[Email]'}

SCOPE OF WORK:
${job?.title || '[Service Description]'}
${job?.notes || '[Detailed description of work to be performed]'}

PRICING:
Estimated Total: ${App.formatCurrency(job?.total || 0)}
${job?.deposit ? `Deposit Required: ${App.formatCurrency(job.deposit)}` : ''}

Payment Terms: Net 30 days from completion.
Late payments subject to 1.5% monthly interest.

WARRANTY:
All work performed comes with a standard 1-year warranty on labor.
Manufacturer warranties apply to all parts and equipment.

LIABILITY:
${businessName} carries general liability insurance.
Certificate of insurance available upon request.

TERMINATION:
Either party may terminate this agreement with 24-hour written notice.
Customer is responsible for payment of work completed up to termination.

SIGNATURES:

_________________________          _________________________
${businessName} Representative     Customer Signature

Date: _____________                Date: _____________
`;

      case 'liability_waiver':
        return `
LIABILITY WAIVER AND RELEASE

Date: ${today}

CUSTOMER: ${customer?.name || '[Customer Name]'}
ADDRESS: ${customer?.address || '[Customer Address]'}

PROJECT: ${job?.title || '[Project Description]'}

ACKNOWLEDGMENT:
I, the undersigned customer, acknowledge that plumbing work involving the following carries inherent risks:
• Water heater installation/replacement
• Sewer line repair/replacement
• Gas line work
• Major pipe repairs
• Renovation/demolition work

RISKS INCLUDE BUT ARE NOT LIMITED TO:
• Water damage to property
• Temporary loss of water/gas service
• Disruption to landscaping/driveways
• Unforeseen conditions behind walls/underground
• Delays due to permit requirements or inspections

WAIVER:
I hereby release ${settings.businessName || 'FlowJob Plumbing'}, its employees, agents, and contractors from any and all claims, damages, or liabilities arising from the performance of the described work, except in cases of gross negligence or willful misconduct.

INDEMNIFICATION:
I agree to indemnify and hold harmless ${settings.businessName || 'FlowJob Plumbing'} from any claims by third parties arising from the work performed on my property.

I have read this waiver and fully understand its terms. I sign voluntarily and of my own free will.

CUSTOMER SIGNATURE:

_________________________
${customer?.name || '[Customer Name]'}

Date: _____________

WITNESS:

_________________________
Witness Signature

Date: _____________
`;

      case 'change_order':
        return `
CHANGE ORDER

Date: ${today}
Original Job: #${job?.id || '[Job ID]'}

CUSTOMER: ${customer?.name || '[Customer Name]'}

ORIGINAL SCOPE:
${job?.title || '[Original Service Description]'}

PROPOSED CHANGES:
[Description of additional work needed]

REASON FOR CHANGE:
[ ] Unforeseen condition discovered
[ ] Customer requested additional work
[ ] Code requirement
[ ] Safety concern
[ ] Other: _______________

ADDITIONAL COST:
Materials: ${App.formatCurrency(0)}
Labor: ${App.formatCurrency(0)}
Total Additional: ${App.formatCurrency(0)}

REVISED TOTAL: ${App.formatCurrency(job?.total || 0)}

APPROVAL:
By signing below, customer authorizes the additional work and agrees to the revised pricing.

_________________________          _________________________
Customer Signature                  Date

_________________________          _________________________
${businessName} Representative     Date
`;

      case 'warranty_agreement':
        return `
WARRANTY AGREEMENT

Date: ${today}

CUSTOMER: ${customer?.name || '[Customer Name]'}
SERVICE: ${job?.title || '[Service Description]'}

COVERAGE:
${settings.businessName || 'FlowJob Plumbing'} warrants all labor performed for a period of ONE (1) YEAR from the date of completion.

This warranty covers:
• Defects in workmanship
• Improper installation
• Leaks resulting from our work

EXCLUSIONS:
This warranty does NOT cover:
• Damage from customer misuse or neglect
• Normal wear and tear
• Manufacturer defects (covered by manufacturer warranty)
• Pre-existing conditions
• Acts of God or force majeure
• Customer-supplied materials

WARRANTY CLAIMS:
To file a warranty claim, contact us at:
Phone: ${phone}
Email: ${email}

Claims will be processed within 48 business hours.

SIGNATURES:

_________________________          _________________________
${businessName} Representative     Customer Signature

Date: _____________                Date: _____________
`;

      default:
        return 'Contract template not available.';
    }
  };

  // Generate PDF contract
  const generatePDF = (contractId) => {
    const contract = App.state.contracts?.find(c => c.id === contractId);
    if (!contract) {
      showToast('Contract not found', 'error');
      return null;
    }
    if (typeof jsPDF !== 'undefined') {
      const doc = new jsPDF();
      doc.setFont('helvetica');
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(contract.content, 180);
      doc.text(lines, 15, 15);
      doc.save(`FlowJob_Contract_${contract.id}.pdf`);
      showToast('PDF generated', 'success');
    } else {
      // Fallback: print
      const win = window.open('', '_blank');
      win.document.write(`<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap">${App.esc(contract.content)}</pre>`);
      win.print();
    }
  };

  // Capture signature
  const captureSignature = (contractId, signerName) => {
    return new Promise((resolve) => {
      const contract = App.state.contracts?.find(c => c.id === contractId);
      if (!contract) { resolve(null); return; }
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center';
      modal.innerHTML = `
        <div class="glass-card p-6" style="max-width:500px;width:90%">
          <h3 class="text-lg font-bold mb-4">✍️ Signature Required</h3>
          <p class="text-sm text-gray-400 mb-4">Please sign below for: ${App.esc(signerName)}</p>
          <canvas id="sig-canvas" width="460" height="200" style="border:1px solid rgba(255,215,0,0.3);border-radius:8px;background:rgba(0,0,0,0.3)"></canvas>
          <div class="flex gap-2 mt-4">
            <button id="sig-clear" class="btn btn-secondary flex-1 py-2">Clear</button>
            <button id="sig-save" class="btn btn-primary flex-1 py-2">Save Signature</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      const canvas = modal.querySelector('#sig-canvas');
      const ctx = canvas.getContext('2d');
      let drawing = false;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      };
      canvas.addEventListener('mousedown', (e) => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); });
      canvas.addEventListener('mousemove', (e) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
      canvas.addEventListener('mouseup', () => { drawing = false; });
      canvas.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); });
      canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
      canvas.addEventListener('touchend', () => { drawing = false; });
      modal.querySelector('#sig-clear').onclick = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); };
      modal.querySelector('#sig-save').onclick = () => {
        const dataUrl = canvas.toDataURL('image/png');
        contract.signedBy = contract.signedBy || [];
        contract.signedBy.push({ name: signerName, signature: dataUrl, date: new Date().toISOString() });
        contract.status = 'signed';
        App.saveState();
        document.body.removeChild(modal);
        showToast('Signature captured', 'success');
        resolve(dataUrl);
      };
    });
  };

  // Render contracts settings
  const renderSettings = () => {
    const contracts = App.state.contracts || [];
    const stats = {
      total: contracts.length,
      draft: contracts.filter(c => c.status === 'draft').length,
      signed: contracts.filter(c => c.status === 'signed').length
    };
    return `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">📋 Contracts & Legal</h3>
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-gold-400">${stats.total}</p>
            <p class="text-sm text-gray-400">Total Contracts</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-yellow-400">${stats.draft}</p>
            <p class="text-sm text-gray-400">Drafts</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-green-400">${stats.signed}</p>
            <p class="text-sm text-gray-400">Signed</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          ${Object.entries(TEMPLATES).map(([key, t]) => `
            <button onclick="ContractLegal.showContractForm('${key}')" class="btn btn-secondary text-sm px-3 py-2">
              📄 ${t.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  };

  // Show contract form
  const showContractForm = (type) => {
    const jobs = App.state.jobs || [];
    const customers = App.state.customers || [];
    let html = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Select Job</label>
          <select id="contract-job" class="form-input">
            <option value="">Select a job...</option>
            ${jobs.map(j => `<option value="${j.id}">#${j.id} - ${App.esc(j.title)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Select Customer</label>
          <select id="contract-customer" class="form-input">
            <option value="">Select a customer...</option>
            ${customers.map(c => `<option value="${c.id}">${App.esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <button onclick="ContractLegal.generateFromForm('${type}')" class="btn btn-primary w-full py-2">
          Generate Contract
        </button>
      </div>`;
    App.showModal(TEMPLATES[type].name, html);
  };

  // Generate from form
  const generateFromForm = (type) => {
    const jobId = parseInt(document.getElementById('contract-job')?.value);
    const customerId = parseInt(document.getElementById('contract-customer')?.value);
    const job = App.state.jobs?.find(j => j.id === jobId);
    const customer = App.state.customers?.find(c => c.id === customerId);
    if (!job || !customer) {
      showToast('Please select both job and customer', 'warning');
      return;
    }
    const contract = generateContract(type, job, customer);
    if (contract) {
      App.closeModal();
      showToast('Contract generated!', 'success');
      // Show contract preview
      const win = window.open('', '_blank');
      win.document.write(`<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;padding:20px">${App.esc(contract.content)}</pre>`);
    }
  };

  return {
    TEMPLATES,
    generateContract,
    generatePDF,
    captureSignature,
    renderSettings,
    showContractForm,
    generateFromForm
  };
})();
