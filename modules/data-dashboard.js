/* ============================================
   DATA DASHBOARD — FlowJob
   Charts, analytics, KPIs, forecasting
   ============================================ */
const DataDashboard = (() => {
  // Chart colors
  const COLORS = {
    gold: '#FFD700',
    blue: '#3B82F6',
    green: '#22C55E',
    red: '#EF4444',
    purple: '#A855F7',
    cyan: '#06B6D4',
    orange: '#F97316',
    pink: '#EC4899'
  };

  // Calculate revenue data
  const getRevenueData = (period = '30d') => {
    const jobs = App.state.jobs || [];
    const invoices = App.state.invoices || [];
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d': startDate = new Date(now - 7 * 86400000); break;
      case '30d': startDate = new Date(now - 30 * 86400000); break;
      case '90d': startDate = new Date(now - 90 * 86400000); break;
      case '1y': startDate = new Date(now - 365 * 86400000); break;
      default: startDate = new Date(now - 30 * 86400000);
    }
    const filteredInvoices = invoices.filter(inv => new Date(inv.date) >= startDate);
    const filteredJobs = jobs.filter(j => new Date(j.date) >= startDate);
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalCosts = filteredJobs.reduce((sum, j) => sum + (j.materialCost || 0) + (j.laborCost || 0), 0);
    const profit = totalRevenue - totalCosts;
    const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;
    return { totalRevenue, totalCosts, profit, margin, invoiceCount: filteredInvoices.length, jobCount: filteredJobs.length };
  };

  // Get job type breakdown
  const getJobTypeBreakdown = () => {
    const jobs = App.state.jobs || [];
    const breakdown = {};
    jobs.forEach(j => {
      const type = j.title || 'Other';
      if (!breakdown[type]) breakdown[type] = { count: 0, revenue: 0 };
      breakdown[type].count++;
      breakdown[type].revenue += j.total || 0;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));
  };

  // Get customer stats
  const getCustomerStats = () => {
    const customers = App.state.customers || [];
    const jobs = App.state.jobs || [];
    const totalCustomers = customers.length;
    const newCustomers = customers.filter(c => {
      const created = new Date(c.createdAt || c.date);
      return (Date.now() - created) / 86400000 <= 30;
    }).length;
    const topCustomers = customers.map(c => {
      const customerJobs = jobs.filter(j => j.customer === c.name);
      return {
        name: c.name,
        jobs: customerJobs.length,
        totalSpent: customerJobs.reduce((sum, j) => sum + (j.total || 0), 0)
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
    return { totalCustomers, newCustomers, topCustomers };
  };

  // Get technician performance
  const getTechnicianPerformance = () => {
    const employees = App.state.employees || [];
    const jobs = App.state.jobs || [];
    const timeEntries = App.state.timeEntries || [];
    return employees.map(tech => {
      const techJobs = jobs.filter(j => j.assignedTo === tech.name || j.techId === tech.id);
      const techEntries = timeEntries.filter(e => e.techId === tech.id && e.totalHours);
      const totalHours = techEntries.reduce((sum, e) => sum + parseFloat(e.totalHours || 0), 0);
      const revenue = techJobs.reduce((sum, j) => sum + (j.total || 0), 0);
      return {
        name: tech.name,
        jobsCompleted: techJobs.length,
        totalHours: totalHours.toFixed(1),
        revenue: revenue,
        avgJobValue: techJobs.length > 0 ? (revenue / techJobs.length).toFixed(2) : 0
      };
    }).sort((a, b) => b.revenue - a.revenue);
  };

  // Forecast revenue
  const forecastRevenue = (months = 3) => {
    const invoices = App.state.invoices || [];
    const monthlyRevenue = {};
    invoices.forEach(inv => {
      const date = new Date(inv.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (inv.total || 0);
    });
    const values = Object.values(monthlyRevenue);
    if (values.length < 2) return null;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / (values.length - 1) : 0;
    const forecast = [];
    for (let i = 1; i <= months; i++) {
      forecast.push({
        month: i,
        predicted: Math.max(0, avg + (trend * (values.length + i))),
        confidence: Math.max(50, 95 - (i * 10))
      });
    }
    return forecast;
  };

  // Render full dashboard
  const renderDashboard = () => {
    const revenue = getRevenueData('30d');
    const jobTypes = getJobTypeBreakdown();
    const customerStats = getCustomerStats();
    const techPerformance = getTechnicianPerformance();
    const forecast = forecastRevenue(3);
    return `
      <div class="space-y-6">
        <!-- Revenue Overview -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-bold text-gold-400 mb-4">📊 Revenue Overview (30 Days)</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
              <p class="text-3xl font-bold text-gold-400">$${revenue.totalRevenue.toFixed(0)}</p>
              <p class="text-sm text-gray-400">Revenue</p>
            </div>
            <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
              <p class="text-3xl font-bold text-blue-400">$${revenue.totalCosts.toFixed(0)}</p>
              <p class="text-sm text-gray-400">Costs</p>
            </div>
            <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
              <p class="text-3xl font-bold ${revenue.profit >= 0 ? 'text-green-400' : 'text-red-400'}">$${revenue.profit.toFixed(0)}</p>
              <p class="text-sm text-gray-400">Profit</p>
            </div>
            <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
              <p class="text-3xl font-bold text-purple-400">${revenue.margin}%</p>
              <p class="text-sm text-gray-400">Margin</p>
            </div>
          </div>
        </div>
        <!-- Job Types -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-bold text-gold-400 mb-4">🔧 Top Job Types</h3>
          ${jobTypes.length > 0 ? `
            <div class="space-y-2">
              ${jobTypes.map((jt, i) => `
                <div class="flex items-center gap-3 p-3 rounded-lg" style="background:rgba(255,255,255,0.05)">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style="background:${Object.values(COLORS)[i % 8]}30;color:${Object.values(COLORS)[i % 8]}">
                    ${i + 1}
                  </div>
                  <div class="flex-1">
                    <p class="font-semibold">${App.esc(jt.name)}</p>
                    <p class="text-xs text-gray-400">${jt.count} jobs</p>
                  </div>
                  <p class="font-bold text-gold-400">$${jt.revenue.toFixed(0)}</p>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-gray-400">No job data yet</p>'}
        </div>
        <!-- Top Customers -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-bold text-gold-400 mb-4">👥 Top Customers</h3>
          ${customerStats.topCustomers.length > 0 ? `
            <div class="space-y-2">
              ${customerStats.topCustomers.slice(0, 5).map((c, i) => `
                <div class="flex items-center gap-3 p-3 rounded-lg" style="background:rgba(255,255,255,0.05)">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style="background:${COLORS.gold}30;color:${COLORS.gold}">
                    ${i + 1}
                  </div>
                  <div class="flex-1">
                    <p class="font-semibold">${App.esc(c.name)}</p>
                    <p class="text-xs text-gray-400">${c.jobs} jobs</p>
                  </div>
                  <p class="font-bold text-gold-400">$${c.totalSpent.toFixed(0)}</p>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-gray-400">No customer data yet</p>'}
        </div>
        <!-- Technician Performance -->
        ${techPerformance.length > 0 ? `
          <div class="glass-card p-6">
            <h3 class="text-lg font-bold text-gold-400 mb-4">👷 Technician Performance</h3>
            <div class="space-y-2">
              ${techPerformance.map((t, i) => `
                <div class="flex items-center gap-3 p-3 rounded-lg" style="background:rgba(255,255,255,0.05)">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style="background:${COLORS.blue}30;color:${COLORS.blue}">
                    ${i + 1}
                  </div>
                  <div class="flex-1">
                    <p class="font-semibold">${App.esc(t.name)}</p>
                    <p class="text-xs text-gray-400">${t.jobsCompleted} jobs • ${t.totalHours}h</p>
                  </div>
                  <p class="font-bold text-gold-400">$${t.revenue.toFixed(0)}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <!-- Forecast -->
        ${forecast ? `
          <div class="glass-card p-6">
            <h3 class="text-lg font-bold text-gold-400 mb-4">📈 Revenue Forecast</h3>
            <div class="grid grid-cols-3 gap-4">
              ${forecast.map(f => `
                <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
                  <p class="text-sm text-gray-400">Month +${f.month}</p>
                  <p class="text-2xl font-bold text-green-400">$${f.predicted.toFixed(0)}</p>
                  <p class="text-xs text-gray-400">${f.confidence}% confidence</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  };

  // Export report
  const exportReport = (type = 'revenue') => {
    const data = type === 'revenue' ? getRevenueData('30d') :
                 type === 'customers' ? getCustomerStats() :
                 type === 'techs' ? getTechnicianPerformance() : getRevenueData('30d');
    const rows = [];
    if (type === 'revenue') {
      rows.push(['Metric', 'Value']);
      rows.push(['Total Revenue', `$${data.totalRevenue.toFixed(2)}`]);
      rows.push(['Total Costs', `$${data.totalCosts.toFixed(2)}`]);
      rows.push(['Profit', `$${data.profit.toFixed(2)}`]);
      rows.push(['Margin', `${data.margin}%`]);
      rows.push(['Invoices', data.invoiceCount]);
      rows.push(['Jobs', data.jobCount]);
    } else if (type === 'customers') {
      rows.push(['Customer', 'Jobs', 'Total Spent']);
      data.topCustomers.forEach(c => rows.push([c.name, c.jobs, `$${c.totalSpent.toFixed(2)}`]));
    } else if (type === 'techs') {
      rows.push(['Technician', 'Jobs', 'Hours', 'Revenue']);
      data.forEach(t => rows.push([t.name, t.jobsCompleted, t.totalHours, `$${t.revenue.toFixed(2)}`]));
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    download(csv, `FlowJob_${type}_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  return {
    COLORS,
    getRevenueData,
    getJobTypeBreakdown,
    getCustomerStats,
    getTechnicianPerformance,
    forecastRevenue,
    renderDashboard,
    exportReport
  };
})();
