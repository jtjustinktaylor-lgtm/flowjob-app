/* ============================================
   EMPLOYEE MANAGEMENT — FlowJob
   Time clock, certifications, scheduling
   ============================================ */
const EmployeeManagement = (() => {
  // Certification types
  const CERT_TYPES = {
    plumbing_license: { name: 'Plumbing License', renewalYears: 3, icon: '🔧' },
    backflow_prevention: { name: 'Backflow Prevention', renewalYears: 3, icon: '🔄' },
    gas_fitting: { name: 'Gas Fitting License', renewalYears: 3, icon: '🔥' },
    master_plumber: { name: 'Master Plumber', renewalYears: 5, icon: '👨‍🔧' },
    osha_10: { name: 'OSHA 10-Hour', renewalYears: 5, icon: '🦺' },
    osha_30: { name: 'OSHA 30-Hour', renewalYears: 5, icon: '🦺' },
    epa_608: { name: 'EPA 608 Certification', renewalYears: 5, icon: '❄️' },
    first_aid: { name: 'First Aid/CPR', renewalYears: 2, icon: '🩹' },
    cdl: { name: 'CDL License', renewalYears: 5, icon: '🚛' },
    hazmat: { name: 'HAZMAT Handling', renewalYears: 3, icon: '☢️' }
  };

  // Clock in
  const clockIn = (techId, jobId = null, location = null) => {
    const tech = App.state.employees?.find(e => e.id === techId);
    if (!tech) {
      showToast('Technician not found', 'error');
      return false;
    }
    // Check if already clocked in
    const activeEntry = (App.state.timeEntries || []).find(e => e.techId === techId && !e.clockOut);
    if (activeEntry) {
      showToast('Already clocked in', 'warning');
      return false;
    }
    if (!App.state.timeEntries) App.state.timeEntries = [];
    App.state.timeEntries.push({
      id: Date.now(),
      techId: techId,
      techName: tech.name,
      jobId: jobId,
      clockIn: new Date().toISOString(),
      clockOut: null,
      location: location,
      breakMinutes: 0,
      notes: ''
    });
    tech.status = 'clocked_in';
    tech.currentJobId = jobId;
    App.saveState();
    showToast(`${tech.name} clocked in`, 'success');
    return true;
  };

  // Clock out
  const clockOut = (techId) => {
    const entry = (App.state.timeEntries || []).find(e => e.techId === techId && !e.clockOut);
    if (!entry) {
      showToast('No active clock-in found', 'warning');
      return false;
    }
    entry.clockOut = new Date().toISOString();
    const clockInTime = new Date(entry.clockIn);
    const clockOutTime = new Date(entry.clockOut);
    entry.totalMinutes = Math.round((clockOutTime - clockInTime) / 60000) - (entry.breakMinutes || 0);
    entry.totalHours = (entry.totalMinutes / 60).toFixed(2);
    const tech = App.state.employees?.find(e => e.id === techId);
    if (tech) {
      tech.status = 'clocked_out';
      tech.currentJobId = null;
    }
    App.saveState();
    showToast(`${tech?.name || 'Technician'} clocked out (${entry.totalHours}h)`, 'success');
    return entry;
  };

  // Get active employees
  const getActive = () => {
    return (App.state.employees || []).filter(e => e.status === 'active' || e.status === 'clocked_in');
  };

  // Get time entries for date range
  const getTimeEntries = (startDate, endDate, techId = null) => {
    return (App.state.timeEntries || []).filter(e => {
      const entryDate = new Date(e.clockIn);
      const matchesDate = entryDate >= new Date(startDate) && entryDate <= new Date(endDate + 'T23:59:59');
      const matchesTech = !techId || e.techId === techId;
      return matchesDate && matchesTech;
    });
  };

  // Calculate hours for period
  const calculateHours = (startDate, endDate, techId = null) => {
    const entries = getTimeEntries(startDate, endDate, techId);
    const byTech = {};
    entries.forEach(e => {
      if (!byTech[e.techId]) {
        byTech[e.techId] = { techName: e.techName, totalMinutes: 0, entries: 0 };
      }
      byTech[e.techId].totalMinutes += e.totalMinutes || 0;
      byTech[e.techId].entries++;
    });
    Object.values(byTech).forEach(t => {
      t.totalHours = (t.totalMinutes / 60).toFixed(2);
      t.regularHours = Math.min(parseFloat(t.totalHours), 40).toFixed(2);
      t.overtimeHours = Math.max(0, parseFloat(t.totalHours) - 40).toFixed(2);
    });
    return byTech;
  };

  // Add certification
  const addCertification = (techId, cert) => {
    const tech = App.state.employees?.find(e => e.id === techId);
    if (!tech) return false;
    if (!tech.certifications) tech.certifications = [];
    tech.certifications.push({
      id: Date.now(),
      type: cert.type,
      number: cert.number,
      issued: cert.issued,
      expires: cert.expires,
      issuer: cert.issuer,
      notes: cert.notes
    });
    App.saveState();
    showToast('Certification added', 'success');
    return true;
  };

  // Get expiring certifications
  const getExpiringCertifications = (daysAhead = 30) => {
    const employees = App.state.employees || [];
    const expiring = [];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    employees.forEach(tech => {
      (tech.certifications || []).forEach(cert => {
        const expires = new Date(cert.expires);
        if (expires <= futureDate) {
          expiring.push({
            techId: tech.id,
            techName: tech.name,
            certType: cert.type,
            certName: CERT_TYPES[cert.type]?.name || cert.type,
            expires: cert.expires,
            daysUntil: Math.ceil((expires - Date.now()) / 86400000)
          });
        }
      });
    });
    return expiring.sort((a,b) => a.daysUntil - b.daysUntil);
  };

  // Add employee
  const addEmployee = (data) => {
    if (!App.state.employees) App.state.employees = [];
    const existing = App.state.employees.find(e => e.name === data.name);
    if (existing) {
      showToast('Employee already exists', 'warning');
      return false;
    }
    App.state.employees.push({
      id: Date.now(),
      name: data.name,
      phone: data.phone,
      email: data.email,
      role: data.role || 'technician',
      status: 'active',
      hourlyRate: data.hourlyRate || 0,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      certifications: [],
      currentJobId: null,
      clockedIn: false
    });
    App.saveState();
    showToast(`${data.name} added to team`, 'success');
    return true;
  };

  // Update employee
  const updateEmployee = (techId, updates) => {
    const tech = App.state.employees?.find(e => e.id === techId);
    if (!tech) return false;
    Object.assign(tech, updates);
    App.saveState();
    return true;
  };

  // Remove employee
  const removeEmployee = (techId) => {
    const index = (App.state.employees || []).findIndex(e => e.id === techId);
    if (index === -1) return false;
    App.state.employees.splice(index, 1);
    App.saveState();
    showToast('Employee removed', 'success');
    return true;
  };

  // Get stats
  const getStats = () => {
    const employees = App.state.employees || [];
    const entries = App.state.timeEntries || [];
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = entries.filter(e => e.clockIn.startsWith(today));
    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.status === 'active').length,
      clockedIn: employees.filter(e => e.status === 'clocked_in').length,
      todayHours: todayEntries.reduce((sum, e) => sum + (e.totalHours ? parseFloat(e.totalHours) : 0), 0).toFixed(1),
      expiringCerts: getExpiringCertifications(30).length
    };
  };

  // Render settings
  const renderSettings = () => {
    const stats = getStats();
    const employees = App.state.employees || [];
    return `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">👷 Employee Management</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-gold-400">${stats.totalEmployees}</p>
            <p class="text-sm text-gray-400">Total Staff</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-green-400">${stats.clockedIn}</p>
            <p class="text-sm text-gray-400">Clocked In</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-blue-400">${stats.todayHours}h</p>
            <p class="text-sm text-gray-400">Today's Hours</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-yellow-400">${stats.expiringCerts}</p>
            <p class="text-sm text-gray-400">Expiring Certs</p>
          </div>
        </div>
        <div class="mb-4">
          <h4 class="font-semibold mb-2">Team Members</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            ${employees.length === 0 ? '<p class="text-sm text-gray-400">No employees added yet</p>' :
              employees.map(e => `
                <div class="flex items-center justify-between p-3 rounded-lg" style="background:rgba(255,255,255,0.05)">
                  <div>
                    <p class="font-semibold">${App.esc(e.name)}</p>
                    <p class="text-xs text-gray-400">${e.role} • ${e.status === 'clocked_in' ? '🟢 Clocked In' : '⚪ Off'}</p>
                  </div>
                  <div class="flex gap-1">
                    ${e.status !== 'clocked_in' ?
                      `<button onclick="EmployeeManagement.clockIn(${e.id})" class="btn btn-primary text-xs px-2 py-1">In</button>` :
                      `<button onclick="EmployeeManagement.clockOut(${e.id})" class="btn btn-secondary text-xs px-2 py-1">Out</button>`
                    }
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
        <button onclick="EmployeeManagement.showAddForm()" class="btn btn-primary w-full py-2">
          ➕ Add Team Member
        </button>
      </div>
    `;
  };

  // Show add form
  const showAddForm = () => {
    let html = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Name *</label>
          <input type="text" id="emp-name" class="form-input" placeholder="Full name">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Phone</label>
          <input type="tel" id="emp-phone" class="form-input" placeholder="Phone number">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <input type="email" id="emp-email" class="form-input" placeholder="Email address">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Role</label>
          <select id="emp-role" class="form-input">
            <option value="technician">Technician</option>
            <option value="lead">Lead Technician</option>
            <option value="foreman">Foreman</option>
            <option value="admin">Admin</option>
            <option value="apprentice">Apprentice</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Hourly Rate ($)</label>
          <input type="number" id="emp-rate" class="form-input" placeholder="0.00" step="0.01">
        </div>
        <button onclick="EmployeeManagement.addFromForm()" class="btn btn-primary w-full py-2">
          Add Employee
        </button>
      </div>`;
    App.showModal('Add Team Member', html);
  };

  // Add from form
  const addFromForm = () => {
    const name = document.getElementById('emp-name')?.value?.trim();
    if (!name) {
      showToast('Name is required', 'warning');
      return;
    }
    addEmployee({
      name: name,
      phone: document.getElementById('emp-phone')?.value?.trim(),
      email: document.getElementById('emp-email')?.value?.trim(),
      role: document.getElementById('emp-role')?.value,
      hourlyRate: parseFloat(document.getElementById('emp-rate')?.value) || 0
    });
    App.closeModal();
  };

  return {
    CERT_TYPES,
    clockIn,
    clockOut,
    getActive,
    getTimeEntries,
    calculateHours,
    addCertification,
    getExpiringCertifications,
    addEmployee,
    updateEmployee,
    removeEmployee,
    getStats,
    renderSettings,
    showAddForm,
    addFromForm
  };
})();
