// FlowJob — Plumbing Estimator Module
// Material takeoffs, fixture unit calculations, pipe sizing, labor estimates

const PlumbingEstimator = {
  // --- Fixture Unit Tables ---
  wsfu: {
    'water-closet-valve': { name: 'Water Closet (Flush Valve)', wsfu: 10, supply: '1"' },
    'water-closet-tank': { name: 'Water Closet (Tank)', wsfu: 5, supply: '1/2"' },
    'lavatory-public': { name: 'Lavatory (Public)', wsfu: 1.5, supply: '1/2"' },
    'lavatory-private': { name: 'Lavatory (Private)', wsfu: 1, supply: '1/2"' },
    'bathtub': { name: 'Bathtub', wsfu: 2, supply: '1/2"' },
    'shower': { name: 'Shower', wsfu: 2, supply: '1/2"' },
    'kitchen-sink': { name: 'Kitchen Sink', wsfu: 2, supply: '1/2"' },
    'dishwasher': { name: 'Dishwasher', wsfu: 2, supply: '1/2"' },
    'clothes-washer': { name: 'Clothes Washer', wsfu: 3, supply: '1/2"' },
    'laundry-sink': { name: 'Laundry Sink', wsfu: 2, supply: '1/2"' },
    'bar-sink': { name: 'Bar Sink', wsfu: 1, supply: '1/2"' },
    'hose-bib': { name: 'Hose Bib', wsfu: 2, supply: '1/2"' },
    'water-heater': { name: 'Water Heater', wsfu: 1, supply: '3/4"' },
  },

  dfu: {
    'wc-flush-valve': { name: 'Water Closet (Flush Valve)', dfu: 6, trap: '3"' },
    'wc-tank': { name: 'Water Closet (Tank)', dfu: 4, trap: '3"' },
    'lavatory': { name: 'Lavatory', dfu: 1, trap: '1-1/4"' },
    'bathtub-d': { name: 'Bathtub / Shower', dfu: 2, trap: '1-1/2"' },
    'kitchen-sink-d': { name: 'Kitchen Sink', dfu: 2, trap: '1-1/2"' },
    'dishwasher-d': { name: 'Dishwasher', dfu: 2, trap: '1-1/2"' },
    'clothes-washer-d': { name: 'Clothes Washer', dfu: 3, trap: '2"' },
    'laundry-sink-d': { name: 'Laundry Sink', dfu: 2, trap: '1-1/2"' },
    'bar-sink-d': { name: 'Bar Sink', dfu: 1, trap: '1-1/2"' },
    'floor-drain': { name: 'Floor Drain', dfu: 2, trap: '2"' },
    'urinal': { name: 'Urinal (Flush Valve)', dfu: 4, trap: '1-1/2"' },
  },

  supplyPipeLimits: [
    { maxWSFU: 4, size: '1/2"' },
    { maxWSFU: 8, size: '3/4"' },
    { maxWSFU: 14, size: '1"' },
    { maxWSFU: 25, size: '1-1/4"' },
    { maxWSFU: 40, size: '1-1/2"' },
    { maxWSFU: 999, size: '2"' },
  ],

  drainPipeLimits: [
    { maxDFU: 3, size: '1-1/2"' },
    { maxDFU: 21, size: '2"' },
    { maxDFU: 48, size: '3"' },
    { maxDFU: 108, size: '4"' },
    { maxDFU: 256, size: '6"' },
    { maxDFU: 999, size: '8"' },
  ],

  laborRates: {
    'rough-supply': { name: 'Rough-in Supply (per fixture)', hoursMin: 1.5, hoursMax: 2.5 },
    'rough-drain': { name: 'Rough-in Drain (per fixture)', hoursMin: 1.5, hoursMax: 2.5 },
    'trim-out': { name: 'Trim-out (per fixture)', hoursMin: 1, hoursMax: 1.5 },
    'water-heater-tank': { name: 'Water Heater (Tank)', hoursMin: 3, hoursMax: 5 },
    'water-heater-tankless': { name: 'Water Heater (Tankless)', hoursMin: 5, hoursMax: 8 },
    'repipe-pex': { name: 'Repipe per fixture (PEX)', hoursMin: 2, hoursMax: 4 },
    'sewer-repair': { name: 'Sewer Repair (per lin ft)', hoursMin: 0.5, hoursMax: 1 },
  },

  getEstimateId() {
    return 'EST-' + Date.now().toString(36).toUpperCase();
  },

  getSupplySize(wsfu) {
    for (const limit of this.supplyPipeLimits) {
      if (wsfu <= limit.maxWSFU) return limit.size;
    }
    return '2"';
  },

  getDrainSize(dfu) {
    for (const limit of this.drainPipeLimits) {
      if (dfu <= limit.maxDFU) return limit.size;
    }
    return '8"';
  },

  renderEstimator() {
    const est = App.state.plumbingEstimator || {};
    const fixtures = est.fixtures || [];
    const laborRate = est.laborRate || 85;

    return `
      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">🔧 Job Details</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Job Type</label>
            <select id="est-job-type" class="form-control">
              <option value="new-construction" ${est.jobType === 'new-construction' ? 'selected' : ''}>New Construction</option>
              <option value="remodel" ${est.jobType === 'remodel' ? 'selected' : ''}>Remodel</option>
              <option value="repipe" ${est.jobType === 'repipe' ? 'selected' : ''}>Repipe</option>
              <option value="water-heater" ${est.jobType === 'water-heater' ? 'selected' : ''}>Water Heater</option>
              <option value="repair" ${est.jobType === 'repair' ? 'selected' : ''}>Repair</option>
              <option value="sewer" ${est.jobType === 'sewer' ? 'selected' : ''}>Sewer/Drain</option>
            </select>
          </div>
          <div class="form-group">
            <label>Pipe Material</label>
            <select id="est-pipe-material" class="form-control">
              <option value="pex" ${est.pipeMaterial === 'pex' ? 'selected' : ''}>PEX</option>
              <option value="copper-l" ${est.pipeMaterial === 'copper-l' ? 'selected' : ''}>Copper Type L</option>
              <option value="copper-m" ${est.pipeMaterial === 'copper-m' ? 'selected' : ''}>Copper Type M</option>
              <option value="cpvc" ${est.pipeMaterial === 'cpvc' ? 'selected' : ''}>CPVC</option>
            </select>
          </div>
          <div class="form-group">
            <label>Hourly Rate ($)</label>
            <input type="number" id="est-labor-rate" class="form-control" value="${laborRate}" min="50" max="200">
          </div>
          <div class="form-group">
            <label>Markup (%)</label>
            <input type="number" id="est-markup" class="form-control" value="${est.markup || 25}" min="0" max="100">
          </div>
        </div>
      </div>

      <div class="glass-card p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-gold-400">🚿 Fixtures</h3>
          <button class="btn btn-gold btn-sm" onclick="PlumbingEstimator.addFixture()">+ Add Fixture</button>
        </div>
        <div id="est-fixtures-list">
          ${this.renderFixturesList(fixtures)}
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">📦 Additional Materials</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Expansion Tank</label>
            <input type="number" id="est-expansion-tank" class="form-control" value="${est.expansionTank || 0}" min="0">
          </div>
          <div class="form-group">
            <label>PRV (Pressure Reducing Valve)</label>
            <input type="number" id="est-prv" class="form-control" value="${est.prv || 0}" min="0">
          </div>
          <div class="form-group">
            <label>Ball Valves (shutoffs)</label>
            <input type="number" id="est-ball-valves" class="form-control" value="${est.ballValves || 0}" min="0">
          </div>
          <div class="form-group">
            <label>Permit Fee ($)</label>
            <input type="number" id="est-permit" class="form-control" value="${est.permitFee || 0}" min="0">
          </div>
        </div>
      </div>

      <div class="flex gap-3 mt-4">
        <button class="btn btn-gold" onclick="PlumbingEstimator.calculate()">📊 Calculate Estimate</button>
        <button class="btn btn-outline" onclick="PlumbingEstimator.clear()">🗑️ Clear</button>
      </div>

      <div id="est-results" class="mt-4"></div>
    `;
  },

  renderFixturesList(fixtures) {
    if (fixtures.length === 0) {
      return '<p class="text-muted text-center p-4">No fixtures added yet. Click "Add Fixture" to begin.</p>';
    }
    const allFixtures = { ...this.wsfu, ...this.dfu };
    return fixtures.map((f, i) => `
      <div class="flex gap-3 items-center mb-2 p-3" style="background:rgba(255,255,255,0.03);border-radius:8px;">
        <select class="form-control" style="flex:2" onchange="PlumbingEstimator.updateFixture(${i}, 'type', this.value)">
          <optgroup label="Fixtures">
            ${Object.entries(this.wsfu).map(([k, v]) =>
              `<option value="${k}" ${f.type === k ? 'selected' : ''}>${v.name} (WSFU: ${v.wsfu})</option>`
            ).join('')}
          </optgroup>
        </select>
        <input type="number" class="form-control" style="flex:0 0 80px" value="${f.qty || 1}" min="1" max="50"
          onchange="PlumbingEstimator.updateFixture(${i}, 'qty', this.value)" placeholder="Qty">
        <span class="text-muted" style="flex:0 0 60px">× $${f.unitCost || 0}</span>
        <button class="btn btn-sm" style="color:#ef4444" onclick="PlumbingEstimator.removeFixture(${i})">✕</button>
      </div>
    `).join('');
  },

  addFixture() {
    const est = App.state.plumbingEstimator || { fixtures: [] };
    est.fixtures = est.fixtures || [];
    est.fixtures.push({ type: 'wc-tank', qty: 1, unitCost: 150 });
    App.state.plumbingEstimator = est;
    App.saveState();
    this.refresh();
  },

  updateFixture(idx, field, value) {
    const est = App.state.plumbingEstimator || {};
    if (!est.fixtures || !est.fixtures[idx]) return;
    if (field === 'qty') est.fixtures[idx].qty = parseInt(value) || 1;
    else est.fixtures[idx][field] = value;
    App.state.plumbingEstimator = est;
    App.saveState();
    this.refresh();
  },

  removeFixture(idx) {
    const est = App.state.plumbingEstimator || {};
    if (est.fixtures) est.fixtures.splice(idx, 1);
    App.state.plumbingEstimator = est;
    App.saveState();
    this.refresh();
  },

  calculate() {
    const est = App.state.plumbingEstimator || {};
    const fixtures = est.fixtures || [];
    const laborRate = parseFloat(document.getElementById('est-labor-rate')?.value) || 85;
    const markup = parseFloat(document.getElementById('est-markup')?.value) || 25;
    const permitFee = parseFloat(document.getElementById('est-permit')?.value) || 0;
    const expansionTank = parseFloat(document.getElementById('est-expansion-tank')?.value) || 0;
    const prv = parseFloat(document.getElementById('est-prv')?.value) || 0;
    const ballValves = parseFloat(document.getElementById('est-ball-valves')?.value) || 0;

    if (fixtures.length === 0) {
      App.toast('Add at least one fixture first', 'error');
      return;
    }

    // Calculate fixture units
    let totalWSFU = 0, totalDFU = 0;
    const materialLines = [];
    let totalMaterialCost = 0;

    fixtures.forEach(f => {
      const wsfuData = this.wsfu[f.type];
      const dfuData = this.dfu[f.type + '-d'] || this.dfu[f.type];
      const qty = f.qty || 1;

      if (wsfuData) totalWSFU += wsfuData.wsfu * qty;
      if (dfuData) totalDFU += dfuData.dfu * qty;

      const cost = (f.unitCost || 150) * qty;
      totalMaterialCost += cost;
      materialLines.push({
        name: (wsfuData || dfuData || { name: f.type }).name,
        qty,
        unit: f.unitCost || 150,
        total: cost,
      });
    });

    // Pipe sizing
    const supplySize = this.getSupplySize(totalWSFU);
    const drainSize = this.getDrainSize(totalDFU);

    // Additional materials
    const addOns = [];
    if (expansionTank > 0) { addOns.push({ name: 'Expansion Tank', qty: expansionTank, unit: 45, total: expansionTank * 45 }); totalMaterialCost += expansionTank * 45; }
    if (prv > 0) { addOns.push({ name: 'PRV', qty: prv, unit: 65, total: prv * 65 }); totalMaterialCost += prv * 65; }
    if (ballValves > 0) { addOns.push({ name: 'Ball Valve', qty: ballValves, unit: 12, total: ballValves * 12 }); totalMaterialCost += ballValves * 12; }

    // Waste factor (10%)
    const wasteFactor = totalMaterialCost * 0.10;
    totalMaterialCost += wasteFactor;

    // Labor estimate
    const totalFixtures = fixtures.reduce((sum, f) => sum + (f.qty || 1), 0);
    const laborHoursMin = totalFixtures * 1.5;
    const laborHoursMax = totalFixtures * 2.5;
    const laborHoursAvg = (laborHoursMin + laborHoursMax) / 2;
    const laborCost = laborHoursAvg * laborRate;

    // Totals
    const subtotal = totalMaterialCost + laborCost + permitFee;
    const markupAmount = subtotal * (markup / 100);
    const grandTotal = subtotal + markupAmount;

    // Render results
    const resultsEl = document.getElementById('est-results');
    if (!resultsEl) return;

    resultsEl.innerHTML = `
      <div class="glass-card p-6" style="border:2px solid #D4AF37;">
        <h3 class="text-lg font-bold text-gold-400 mb-2">📊 Estimate Results</h3>
        <div class="grid grid-cols-3 gap-4 mb-4 text-center">
          <div class="p-3" style="background:rgba(212,175,55,0.1);border-radius:8px;">
            <div class="text-2xl font-bold text-gold-400">${totalWSFU}</div>
            <div class="text-sm text-muted">Total WSFU</div>
          </div>
          <div class="p-3" style="background:rgba(212,175,55,0.1);border-radius:8px;">
            <div class="text-2xl font-bold text-gold-400">${totalDFU}</div>
            <div class="text-sm text-muted">Total DFU</div>
          </div>
          <div class="p-3" style="background:rgba(212,175,55,0.1);border-radius:8px;">
            <div class="text-lg font-bold text-gold-400">${supplySize} / ${drainSize}</div>
            <div class="text-sm text-muted">Supply / Drain Size</div>
          </div>
        </div>

        <h4 class="font-bold mt-4 mb-2">Materials</h4>
        <table class="data-table" style="width:100%;">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit $</th><th>Total</th></tr></thead>
          <tbody>
            ${materialLines.map(l => `<tr><td>${l.name}</td><td>${l.qty}</td><td>$${l.unit.toFixed(2)}</td><td>$${l.total.toFixed(2)}</td></tr>`).join('')}
            ${addOns.map(l => `<tr><td>${l.name}</td><td>${l.qty}</td><td>$${l.unit.toFixed(2)}</td><td>$${l.total.toFixed(2)}</td></tr>`).join('')}
            <tr><td colspan="3" class="text-right">Waste Factor (10%)</td><td>$${wasteFactor.toFixed(2)}</td></tr>
          </tbody>
          <tfoot><tr><td colspan="3" class="font-bold">Subtotal Materials</td><td class="font-bold">$${totalMaterialCost.toFixed(2)}</td></tr></tfoot>
        </table>

        <h4 class="font-bold mt-4 mb-2">Labor</h4>
        <table class="data-table" style="width:100%;">
          <thead><tr><th>Task</th><th>Hours</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>
            <tr><td>Rough-in + Trim-out (${totalFixtures} fixtures)</td><td>${laborHoursAvg.toFixed(1)}</td><td>$${laborRate}/hr</td><td>$${laborCost.toFixed(2)}</td></tr>
          </tbody>
        </table>

        <div class="mt-4 p-4" style="background:rgba(212,175,55,0.08);border-radius:8px;">
          <div class="flex justify-between mb-1"><span>Materials:</span><span>$${totalMaterialCost.toFixed(2)}</span></div>
          <div class="flex justify-between mb-1"><span>Labor:</span><span>$${laborCost.toFixed(2)}</span></div>
          ${permitFee > 0 ? `<div class="flex justify-between mb-1"><span>Permit:</span><span>$${permitFee.toFixed(2)}</span></div>` : ''}
          <div class="flex justify-between mb-1"><span>Markup (${markup}%):</span><span>$${markupAmount.toFixed(2)}</span></div>
          <hr style="border-color:rgba(212,175,55,0.3);margin:8px 0;">
          <div class="flex justify-between text-xl font-bold text-gold-400"><span>TOTAL:</span><span>$${grandTotal.toFixed(2)}</span></div>
        </div>

        <div class="flex gap-3 mt-4">
          <button class="btn btn-gold btn-sm" onclick="PlumbingEstimator.createQuote()">📄 Create Quote</button>
          <button class="btn btn-outline btn-sm" onclick="PlumbingEstimator.printEstimate()">🖨️ Print</button>
        </div>
      </div>
    `;

    // Save estimate
    est.lastEstimate = {
      id: this.getEstimateId(),
      date: new Date().toISOString(),
      fixtures, totalWSFU, totalDFU, supplySize, drainSize,
      materialLines, addOns, totalMaterialCost, laborHoursAvg, laborCost,
      permitFee, markup, markupAmount, grandTotal,
      laborRate, jobType: est.jobType, pipeMaterial: est.pipeMaterial,
    };
    est.laborRate = laborRate;
    est.markup = markup;
    App.state.plumbingEstimator = est;
    App.saveState();
    App.toast('Estimate calculated!', 'success');
  },

  createQuote() {
    const est = App.state.plumbingEstimator || {};
    const e = est.lastEstimate;
    if (!e) return;
    if (typeof Quotes !== 'undefined' && Quotes.new) {
      Quotes.new();
      App.toast('Quote created from estimate — fill in customer details', 'info');
    } else {
      App.toast('Navigate to Quotes to create from this estimate', 'info');
    }
  },

  printEstimate() {
    const est = App.state.plumbingEstimator || {};
    const e = est.lastEstimate;
    if (!e) return;
    const rows = e.materialLines.map(l => `<tr><td>${l.name}</td><td>${l.qty}</td><td>$${l.unit.toFixed(2)}</td><td>$${l.total.toFixed(2)}</td></tr>`).join('');
    App.printSection('Plumbing Estimate', `
      <p><strong>Date:</strong> ${new Date(e.date).toLocaleDateString()}</p>
      <p><strong>Job Type:</strong> ${e.jobType || 'N/A'} | <strong>Pipe:</strong> ${e.pipeMaterial || 'N/A'}</p>
      <p><strong>Fixture Units:</strong> ${e.totalWSFU} WSFU / ${e.totalDFU} DFU | <strong>Supply:</strong> ${e.supplySize} | <strong>Drain:</strong> ${e.drainSize}</p>
      <h3>Materials</h3>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Unit $</th><th>Total</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3">Subtotal Materials</td><td>$${e.totalMaterialCost.toFixed(2)}</td></tr></tfoot></table>
      <h3>Labor</h3>
      <table><thead><tr><th>Task</th><th>Hours</th><th>Rate</th><th>Total</th></tr></thead>
      <tbody><tr><td>Rough-in + Trim-out</td><td>${e.laborHoursAvg.toFixed(1)}</td><td>$${e.laborRate}/hr</td><td>$${e.laborCost.toFixed(2)}</td></tr></tbody></table>
      <p class="total"><strong>TOTAL: $${e.grandTotal.toFixed(2)}</strong></p>
    `);
  },

  clear() {
    delete App.state.plumbingEstimator;
    App.saveState();
    this.refresh();
    App.toast('Estimator cleared', 'info');
  },

  refresh() {
    const content = document.getElementById('content');
    if (content && window.location.hash === '#estimator') {
      content.innerHTML = this.renderEstimator();
      App.injectPageIcons();
    }
  },
};
