/* ============================================
   PRICE BOOK MANAGER — FlowJob
   Dynamic pricing, materials, labor rates
   ============================================ */
const PriceBookManager = (() => {
  // Default material categories
  const MATERIAL_CATEGORIES = {
    pipe: { name: 'Pipe & Fittings', icon: '🔧' },
    fixture: { name: 'Fixtures', icon: '🚿' },
    water_heater: { name: 'Water Heaters', icon: '🔥' },
    valve: { name: 'Valves', icon: '⚙️' },
    pump: { name: 'Pumps', icon: '💧' },
    sewer: { name: 'Sewer & Drain', icon: '🚽' },
    gas: { name: 'Gas Fittings', icon: '🔥' },
    tools: { name: 'Tools & Supplies', icon: '🔨' },
    chemical: { name: 'Chemicals', icon: '🧪' },
    other: { name: 'Other', icon: '📦' }
  };

  // Labor rate tiers
  const LABOR_TIERS = {
    standard: { name: 'Standard', multiplier: 1.0, description: 'Mon-Fri, 8am-5pm' },
    overtime: { name: 'Overtime', multiplier: 1.5, description: 'Evenings, weekends' },
    emergency: { name: 'Emergency', multiplier: 2.0, description: 'Same-day, after-hours' },
    holiday: { name: 'Holiday', multiplier: 2.5, description: 'Holidays' }
  };

  // Add material
  const addMaterial = (data) => {
    if (!App.state.materials) App.state.materials = [];
    const existing = App.state.materials.find(m => m.sku === data.sku);
    if (existing) {
      showToast('SKU already exists', 'warning');
      return false;
    }
    App.state.materials.push({
      id: Date.now(),
      sku: data.sku || generateSKU(data.name),
      name: data.name,
      category: data.category || 'other',
      unitCost: data.unitCost || 0,
      markup: data.markup || 2.0,
      sellPrice: data.sellPrice || (data.unitCost * (data.markup || 2.0)),
      unit: data.unit || 'ea',
      vendor: data.vendor || '',
      vendorSku: data.vendorSku || '',
      inStock: data.inStock || 0,
      reorderPoint: data.reorderPoint || 5,
      leadTimeDays: data.leadTimeDays || 3,
      lastUpdated: new Date().toISOString()
    });
    App.saveState();
    return true;
  };

  // Update material cost
  const updateMaterialCost = (sku, newCost, vendor = '') => {
    const material = App.state.materials?.find(m => m.sku === sku);
    if (!material) return false;
    const oldCost = material.unitCost;
    material.unitCost = newCost;
    material.sellPrice = newCost * material.markup;
    material.lastUpdated = new Date().toISOString();
    if (vendor) material.vendor = vendor;
    App.saveState();
    if (newCost > oldCost * 1.1) {
      showToast(`Price alert: ${material.name} cost increased ${((newCost/oldCost - 1) * 100).toFixed(0)}%`, 'warning');
    }
    return true;
  };

  // Calculate sell price
  const calculatePrice = (data) => {
    const materialCost = data.materialCost || 0;
    const laborHours = data.laborHours || 0;
    const laborRate = data.laborRate || getDefaultLaborRate();
    const markup = data.markup || 2.0;
    const tier = data.tier || 'standard';
    const tierMultiplier = LABOR_TIERS[tier]?.multiplier || 1.0;
    const laborCost = laborHours * laborRate * tierMultiplier;
    const materialWithMarkup = materialCost * markup;
    return materialWithMarkup + laborCost;
  };

  // Get default labor rate
  const getDefaultLaborRate = () => {
    return App.state.settings?.laborRate || 125;
  };

  // Set seasonal rate
  const setSeasonalRate = (category, multiplier, season) => {
    if (!App.state.seasonalRates) App.state.seasonalRates = {};
    if (!App.state.seasonalRates[category]) App.state.seasonalRates[category] = {};
    App.state.seasonalRates[category][season] = multiplier;
    App.saveState();
  };

  // Get seasonal rate
  const getSeasonalRate = (category) => {
    const month = new Date().getMonth();
    let season = 'spring';
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';
    return App.state.seasonalRates?.[category]?.[season] || 1.0;
  };

  // Generate SKU
  const generateSKU = (name) => {
    return name.replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase().slice(-4);
  };

  // Get stats
  const getStats = () => {
    const materials = App.state.materials || [];
    return {
      totalMaterials: materials.length,
      avgMarkup: materials.length > 0 ?
        (materials.reduce((sum, m) => sum + m.markup, 0) / materials.length).toFixed(2) : 0,
      lowStock: materials.filter(m => m.inStock <= m.reorderPoint).length,
      categories: Object.keys(MATERIAL_CATEGORIES).length
    };
  };

  // Render settings
  const renderSettings = () => {
    const stats = getStats();
    return `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">💰 Price Book Manager</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-gold-400">${stats.totalMaterials}</p>
            <p class="text-sm text-gray-400">Materials</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-blue-400">${stats.avgMarkup}x</p>
            <p class="text-sm text-gray-400">Avg Markup</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-green-400">$${getDefaultLaborRate()}</p>
            <p class="text-sm text-gray-400">Labor Rate/hr</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-yellow-400">${stats.lowStock}</p>
            <p class="text-sm text-gray-400">Low Stock</p>
          </div>
        </div>
        <div class="mb-4">
          <h4 class="font-semibold mb-2">Labor Rate Tiers</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            ${Object.entries(LABOR_TIERS).map(([key, tier]) => `
              <div class="p-3 rounded-lg text-center" style="background:rgba(255,255,255,0.05)">
                <p class="text-xl font-bold text-gold-400">${tier.multiplier}x</p>
                <p class="text-sm font-semibold">${tier.name}</p>
                <p class="text-xs text-gray-400">${tier.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="PriceBookManager.showAddMaterial()" class="btn btn-primary flex-1 py-2">
            ➕ Add Material
          </button>
          <button onclick="PriceBookManager.showCalculator()" class="btn btn-secondary flex-1 py-2">
            🧮 Price Calculator
          </button>
        </div>
      </div>
    `;
  };

  // Show add material form
  const showAddMaterial = () => {
    let html = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Material Name *</label>
          <input type="text" id="mat-name" class="form-input" placeholder="e.g., 1/2" PEX Pipe">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Category</label>
          <select id="mat-category" class="form-input">
            ${Object.entries(MATERIAL_CATEGORIES).map(([k,v]) => `<option value="${k}">${v.icon} ${v.name}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Unit Cost ($)</label>
            <input type="number" id="mat-cost" class="form-input" placeholder="0.00" step="0.01">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Markup (x)</label>
            <input type="number" id="mat-markup" class="form-input" value="2.0" step="0.1">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Unit</label>
            <select id="mat-unit" class="form-input">
              <option value="ea">Each</option>
              <option value="ft">Foot</option>
              <option value="box">Box</option>
              <option value="case">Case</option>
              <option value="roll">Roll</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">In Stock</label>
            <input type="number" id="mat-stock" class="form-input" value="0">
          </div>
        </div>
        <button onclick="PriceBookManager.addMaterialFromForm()" class="btn btn-primary w-full py-2">
          Add Material
        </button>
      </div>`;
    App.showModal('Add Material', html);
  };

  // Add material from form
  const addMaterialFromForm = () => {
    const name = document.getElementById('mat-name')?.value?.trim();
    if (!name) {
      showToast('Material name is required', 'warning');
      return;
    }
    const cost = parseFloat(document.getElementById('mat-cost')?.value) || 0;
    const markup = parseFloat(document.getElementById('mat-markup')?.value) || 2.0;
    addMaterial({
      name: name,
      category: document.getElementById('mat-category')?.value,
      unitCost: cost,
      markup: markup,
      sellPrice: cost * markup,
      unit: document.getElementById('mat-unit')?.value,
      inStock: parseInt(document.getElementById('mat-stock')?.value) || 0
    });
    App.closeModal();
    showToast('Material added', 'success');
  };

  // Show calculator
  const showCalculator = () => {
    let html = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Material Cost ($)</label>
          <input type="number" id="calc-material" class="form-input" placeholder="0.00" step="0.01" oninput="PriceBookManager.updateCalculator()">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Labor Hours</label>
          <input type="number" id="calc-hours" class="form-input" placeholder="0" step="0.5" oninput="PriceBookManager.updateCalculator()">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Labor Tier</label>
          <select id="calc-tier" class="form-input" onchange="PriceBookManager.updateCalculator()">
            ${Object.entries(LABOR_TIERS).map(([k,v]) => `<option value="${k}">${v.name} (${v.multiplier}x)</option>`).join('')}
          </select>
        </div>
        <div class="p-4 rounded-xl text-center" style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3)">
          <p class="text-sm text-gray-400">Estimated Price</p>
          <p id="calc-result" class="text-3xl font-bold text-gold-400">$0.00</p>
        </div>
      </div>`;
    App.showModal('Price Calculator', html);
  };

  // Update calculator
  const updateCalculator = () => {
    const material = parseFloat(document.getElementById('calc-material')?.value) || 0;
    const hours = parseFloat(document.getElementById('calc-hours')?.value) || 0;
    const tier = document.getElementById('calc-tier')?.value || 'standard';
    const price = calculatePrice({
      materialCost: material,
      laborHours: hours,
      tier: tier
    });
    const el = document.getElementById('calc-result');
    if (el) el.textContent = `$${price.toFixed(2)}`;
  };

  return {
    MATERIAL_CATEGORIES,
    LABOR_TIERS,
    addMaterial,
    updateMaterialCost,
    calculatePrice,
    getDefaultLaborRate,
    setSeasonalRate,
    getSeasonalRate,
    getStats,
    renderSettings,
    showAddMaterial,
    addMaterialFromForm,
    showCalculator,
    updateCalculator
  };
})();
