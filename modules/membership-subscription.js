/* ============================================
   MEMBERSHIP & SUBSCRIPTION — FlowJob
   Maintenance plans, recurring billing
   ============================================ */
const MembershipSubscription = (() => {
  // Plan tiers
  const PLAN_TIERS = {
    basic: {
      name: 'Basic Care',
      color: '#6B7280',
      icon: '🔧',
      features: ['Annual inspection', '10% off repairs', 'Priority scheduling']
    },
    premium: {
      name: 'Premium Care',
      color: '#3B82F6',
      icon: '⭐',
      features: ['Bi-annual inspection', '15% off repairs', 'Priority scheduling', 'Free emergency call', 'Water heater flush']
    },
    vip: {
      name: 'VIP Care',
      color: '#FFD700',
      icon: '👑',
      features: ['Quarterly inspection', '20% off repairs', 'Same-day scheduling', '2 free emergency calls', 'Water heater flush', 'Drain cleaning', 'Dedicated technician']
    }
  };

  // Create plan
  const createPlan = (data) => {
    if (!App.state.membershipPlans) App.state.membershipPlans = [];
    const plan = {
      id: Date.now(),
      name: data.name,
      tier: data.tier || 'basic',
      price: data.price || 0,
      interval: data.interval || 'monthly',
      annualPrice: data.annualPrice || (data.price * 12 * 0.9),
      services: data.services || [],
      features: data.features || PLAN_TIERS[data.tier]?.features || [],
      discount: data.discount || (data.tier === 'vip' ? 20 : data.tier === 'premium' ? 15 : 10),
      maxEmergencyCalls: data.maxEmergencyCalls || (data.tier === 'vip' ? 2 : data.tier === 'premium' ? 1 : 0),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    App.state.membershipPlans.push(plan);
    App.saveState();
    showToast('Plan created', 'success');
    return plan;
  };

  // Enroll customer
  const enroll = (customerId, planId, paymentMethod = 'invoice') => {
    const customer = App.state.customers?.find(c => c.id === customerId);
    const plan = App.state.membershipPlans?.find(p => p.id === planId);
    if (!customer || !plan) {
      showToast('Customer or plan not found', 'error');
      return false;
    }
    if (!App.state.memberships) App.state.memberships = [];
    // Check if already enrolled
    const existing = App.state.memberships.find(m => m.customerId === customerId && m.status === 'active');
    if (existing) {
      showToast('Customer already has an active membership', 'warning');
      return false;
    }
    const membership = {
      id: Date.now(),
      customerId: customerId,
      customerName: customer.name,
      planId: planId,
      planName: plan.name,
      tier: plan.tier,
      price: plan.interval === 'annual' ? plan.annualPrice : plan.price,
      interval: plan.interval,
      paymentMethod: paymentMethod,
      startDate: new Date().toISOString(),
      nextBillingDate: calculateNextBilling(plan.interval),
      status: 'active',
      servicesUsed: 0,
      emergencyCallsUsed: 0,
      billingHistory: []
    };
    membership.billingHistory.push({
      date: new Date().toISOString(),
      amount: membership.price,
      status: 'pending',
      method: paymentMethod
    });
    App.state.memberships.push(membership);
    App.saveState();
    showToast(`${customer.name} enrolled in ${plan.name}`, 'success');
    return membership;
  };

  // Cancel membership
  const cancel = (membershipId) => {
    const membership = App.state.memberships?.find(m => m.id === membershipId);
    if (!membership) return false;
    membership.status = 'cancelled';
    membership.cancelledAt = new Date().toISOString();
    App.saveState();
    showToast('Membership cancelled', 'success');
    return true;
  };

  // Process billing (run monthly)
  const processBilling = () => {
    const memberships = App.state.memberships || [];
    const today = new Date();
    let billed = 0;
    memberships.forEach(m => {
      if (m.status !== 'active') return;
      const nextBilling = new Date(m.nextBillingDate);
      if (today >= nextBilling) {
        m.billingHistory.push({
          date: today.toISOString(),
          amount: m.price,
          status: 'pending',
          method: m.paymentMethod
        });
        m.nextBillingDate = calculateNextBilling(m.interval, today);
        billed++;
      }
    });
    if (billed > 0) {
      App.saveState();
      showToast(`${billed} memberships billed`, 'success');
    }
    return billed;
  };

  // Calculate next billing date
  const calculateNextBilling = (interval, fromDate = new Date()) => {
    const date = new Date(fromDate);
    if (interval === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (interval === 'quarterly') {
      date.setMonth(date.getMonth() + 3);
    } else if (interval === 'annual') {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString();
  };

  // Get membership stats
  const getStats = () => {
    const memberships = App.state.memberships || [];
    const active = memberships.filter(m => m.status === 'active');
    const mrr = active.reduce((sum, m) => {
      if (m.interval === 'monthly') return sum + m.price;
      if (m.interval === 'quarterly') return sum + (m.price / 3);
      if (m.interval === 'annual') return sum + (m.price / 12);
      return sum;
    }, 0);
    const arr = mrr * 12;
    const tierBreakdown = { basic: 0, premium: 0, vip: 0 };
    active.forEach(m => { if (tierBreakdown[m.tier] !== undefined) tierBreakdown[m.tier]++; });
    return {
      totalMembers: memberships.length,
      activeMembers: active.length,
      mrr: mrr,
      arr: arr,
      tierBreakdown: tierBreakdown,
      churnRate: memberships.length > 0 ?
        ((memberships.filter(m => m.status === 'cancelled').length / memberships.length) * 100).toFixed(1) : 0
    };
  };

  // Render settings
  const renderSettings = () => {
    const stats = getStats();
    const plans = App.state.membershipPlans || [];
    const memberships = App.state.memberships || [];
    return `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">💳 Membership & Subscription</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-gold-400">${stats.activeMembers}</p>
            <p class="text-sm text-gray-400">Active Members</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-green-400">$${stats.mrr.toFixed(0)}</p>
            <p class="text-sm text-gray-400">MRR</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-blue-400">$${stats.arr.toFixed(0)}</p>
            <p class="text-sm text-gray-400">ARR</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-purple-400">${plans.length}</p>
            <p class="text-sm text-gray-400">Plans</p>
          </div>
        </div>
        <div class="mb-4">
          <h4 class="font-semibold mb-2">Available Plans</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${plans.length === 0 ?
              Object.entries(PLAN_TIERS).map(([key, tier]) => `
                <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05);border:1px solid ${tier.color}30">
                  <p class="text-2xl mb-1">${tier.icon}</p>
                  <p class="font-semibold">${tier.name}</p>
                  <p class="text-xs text-gray-400 mt-1">${tier.features.length} features</p>
                </div>
              `).join('') :
              plans.map(p => `
                <div class="p-4 rounded-xl" style="background:rgba(255,255,255,0.05);border:1px solid ${PLAN_TIERS[p.tier]?.color || '#666'}30">
                  <p class="font-semibold">${PLAN_TIERS[p.tier]?.icon || '🔧'} ${App.esc(p.name)}</p>
                  <p class="text-lg font-bold text-gold-400">$${p.price}/${p.interval === 'annual' ? 'yr' : 'mo'}</p>
                  <p class="text-xs text-gray-400">${p.features.length} features</p>
                </div>
              `).join('')}
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="MembershipSubscription.showCreatePlan()" class="btn btn-primary flex-1 py-2">
            ➕ Create Plan
          </button>
          <button onclick="MembershipSubscription.showEnrollForm()" class="btn btn-secondary flex-1 py-2">
            📝 Enroll Customer
          </button>
        </div>
      </div>
    `;
  };

  // Show create plan form
  const showCreatePlan = () => {
    let html = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Plan Name *</label>
          <input type="text" id="plan-name" class="form-input" placeholder="e.g., Premium Care">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Tier</label>
          <select id="plan-tier" class="form-input">
            ${Object.entries(PLAN_TIERS).map(([k,v]) => `<option value="${k}">${v.icon} ${v.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Price ($)</label>
          <input type="number" id="plan-price" class="form-input" placeholder="29.99" step="0.01">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Billing Interval</label>
          <select id="plan-interval" class="form-input">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <button onclick="MembershipSubscription.createPlanFromForm()" class="btn btn-primary w-full py-2">
          Create Plan
        </button>
      </div>`;
    App.showModal('Create Membership Plan', html);
  };

  // Create plan from form
  const createPlanFromForm = () => {
    const name = document.getElementById('plan-name')?.value?.trim();
    if (!name) {
      showToast('Plan name is required', 'warning');
      return;
    }
    createPlan({
      name: name,
      tier: document.getElementById('plan-tier')?.value,
      price: parseFloat(document.getElementById('plan-price')?.value) || 0,
      interval: document.getElementById('plan-interval')?.value
    });
    App.closeModal();
  };

  // Show enroll form
  const showEnrollForm = () => {
    const customers = App.state.customers || [];
    const plans = App.state.membershipPlans || [];
    if (plans.length === 0) {
      showToast('Create a plan first', 'warning');
      return;
    }
    let html = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Customer *</label>
          <select id="enroll-customer" class="form-input">
            <option value="">Select customer...</option>
            ${customers.map(c => `<option value="${c.id}">${App.esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Plan *</label>
          <select id="enroll-plan" class="form-input">
            ${plans.map(p => `<option value="${p.id}">${App.esc(p.name)} - $${p.price}/${p.interval === 'annual' ? 'yr' : 'mo'}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Payment Method</label>
          <select id="enroll-payment" class="form-input">
            <option value="invoice">Invoice</option>
            <option value="card">Credit Card</option>
            <option value="ach">ACH/Bank</option>
          </select>
        </div>
        <button onclick="MembershipSubscription.enrollFromForm()" class="btn btn-primary w-full py-2">
          Enroll Customer
        </button>
      </div>`;
    App.showModal('Enroll Customer', html);
  };

  // Enroll from form
  const enrollFromForm = () => {
    const customerId = parseInt(document.getElementById('enroll-customer')?.value);
    const planId = parseInt(document.getElementById('enroll-plan')?.value);
    const payment = document.getElementById('enroll-payment')?.value;
    if (!customerId || !planId) {
      showToast('Please select customer and plan', 'warning');
      return;
    }
    enroll(customerId, planId, payment);
    App.closeModal();
  };

  return {
    PLAN_TIERS,
    createPlan,
    enroll,
    cancel,
    processBilling,
    getStats,
    renderSettings,
    showCreatePlan,
    createPlanFromForm,
    showEnrollForm,
    enrollFromForm
  };
})();
