/* ============================================
   EMAIL MARKETING — FlowJob
   Campaigns, drip sequences, newsletters
   ============================================ */
const EmailMarketing = (() => {
  // Campaign templates
  const TEMPLATES = {
    winterize: {
      name: 'Winterize Your Pipes',
      subject: '❄️ Don\'t Let Frozen Pipes Ruin Your Winter!',
      body: `Hi {{name}},\n\nWinter is coming! Protect your home from frozen pipes with our Winterization Service.\n\n✅ Pipe insulation inspection\n✅ Outdoor faucet shutoff\n✅ Water heater check\n✅ Emergency preparedness tips\n\nBook now and get 10% off winterization services!\n\nCall us: {{phone}}\nBook online: {{website}}\n\nStay warm,\n{{businessName}}`
    },
    spring_maintenance: {
      name: 'Spring Plumbing Check',
      subject: '🌸 Spring Maintenance — Keep Your Plumbing Flowing!',
      body: `Hi {{name}},\n\nSpring is here! Time for your annual plumbing check-up.\n\n✅ Water heater flush\n✅ Faucet & toilet inspection\n✅ Drain cleaning\n✅ Sewer line camera inspection\n\nSchedule your spring maintenance today!\n\nCall us: {{phone}}\nBook online: {{website}}\n\nBest,\n{{businessName}}`
    },
    reminder_6month: {
      name: '6-Month Service Reminder',
      subject: '🔧 It\'s Been 6 Months — Time for a Check-Up!',
      body: `Hi {{name}},\n\nIt's been 6 months since your last service with us. Regular maintenance prevents costly repairs!\n\nYour last service: {{lastService}}\nRecommended: Annual inspection\n\nSchedule your check-up today and we'll include a FREE water quality test!\n\nCall us: {{phone}}\n\nBest,\n{{businessName}}`
    },
    review_request: {
      name: 'Review Request',
      subject: '⭐ How Did We Do? We\'d Love Your Feedback!',
      body: `Hi {{name}},\n\nThank you for choosing {{businessName}} for your recent {{service}}!\n\nWe hope everything is working perfectly. If you have a moment, we'd greatly appreciate a review:\n\n{{reviewLink}}\n\nYour feedback helps us serve you and your neighbors better!\n\nThank you,\n{{businessName}}`
    },
    new_customer: {
      name: 'Welcome New Customer',
      subject: '👋 Welcome to {{businessName}}!',
      body: `Hi {{name}},\n\nWelcome to the {{businessName}} family! We're thrilled to have you as a customer.\n\nHere's what you can expect from us:\n✅ Fast, reliable service\n✅ Transparent pricing\n✅ 1-year warranty on all work\n✅ 24/7 emergency support\n\nSave our number: {{phone}}\n\nWe look forward to keeping your plumbing in top shape!\n\nBest,\n{{businessName}}`
    },
    emergency_followup: {
      name: 'Emergency Service Follow-Up',
      subject: '🔧 How\'s Everything After Your Emergency Service?',
      body: `Hi {{name}},\n\nWe hope everything is working well after your recent emergency service on {{serviceDate}}.\n\nIf you notice any issues, don't hesitate to reach out — we stand behind our work with a full warranty.\n\nAlso, consider scheduling a preventive maintenance check to avoid future emergencies!\n\nCall us: {{phone}}\n\nBest,\n{{businessName}}`
    }
  };

  // Drip sequences
  const DRIP_SEQUENCES = {
    new_customer: {
      name: 'New Customer Welcome',
      emails: [
        { delay: 0, template: 'new_customer' },
        { delay: 7, template: 'review_request' },
        { delay: 90, template: 'reminder_6month' }
      ]
    },
    post_service: {
      name: 'Post-Service Follow-Up',
      emails: [
        { delay: 1, template: 'review_request' },
        { delay: 180, template: 'reminder_6month' }
      ]
    },
    emergency: {
      name: 'Emergency Follow-Up',
      emails: [
        { delay: 1, template: 'emergency_followup' },
        { delay: 30, template: 'review_request' }
      ]
    }
  };

  // Send email (mock - would use SendGrid/Mailchimp in production)
  const sendEmail = async (to, subject, body) => {
    // In production, this would call SendGrid/Mailchimp API
    console.log('Sending email:', { to, subject, body });
    if (!App.state.emailLog) App.state.emailLog = [];
    App.state.emailLog.push({
      id: Date.now(),
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });
    App.saveState();
    return true;
  };

  // Send campaign
  const sendCampaign = async (templateKey, segment = 'all') => {
    const template = TEMPLATES[templateKey];
    if (!template) {
      showToast('Template not found', 'error');
      return false;
    }
    const customers = getSegment(segment);
    if (customers.length === 0) {
      showToast('No customers in segment', 'warning');
      return false;
    }
    let sent = 0;
    for (const customer of customers) {
      const subject = fillTemplate(template.subject, customer);
      const body = fillTemplate(template.body, customer);
      await sendEmail(customer.email, subject, body);
      sent++;
    }
    showToast(`Campaign sent to ${sent} customers`, 'success');
    return true;
  };

  // Start drip sequence
  const startDrip = (customerId, sequenceKey) => {
    const sequence = DRIP_SEQUENCES[sequenceKey];
    if (!sequence) return false;
    if (!App.state.dripSequences) App.state.dripSequences = [];
    App.state.dripSequences.push({
      id: Date.now(),
      customerId,
      sequenceKey,
      startDate: new Date().toISOString(),
      status: 'active',
      emailsSent: 0
    });
    App.saveState();
    return true;
  };

  // Process drip sequences (run daily)
  const processDrips = () => {
    const drips = App.state.dripSequences || [];
    const today = new Date();
    drips.forEach(drip => {
      if (drip.status !== 'active') return;
      const sequence = DRIP_SEQUENCES[drip.sequenceKey];
      if (!sequence) return;
      const customer = App.state.customers?.find(c => c.id === drip.customerId);
      if (!customer) return;
      const startDate = new Date(drip.startDate);
      sequence.emails.forEach((email, index) => {
        if (index <= drip.emailsSent) return;
        const sendDate = new Date(startDate);
        sendDate.setDate(sendDate.getDate() + email.delay);
        if (today >= sendDate) {
          const template = TEMPLATES[email.template];
          if (template && customer.email) {
            const subject = fillTemplate(template.subject, customer);
            const body = fillTemplate(template.body, customer);
            sendEmail(customer.email, subject, body);
            drip.emailsSent = index + 1;
          }
        }
      });
      if (drip.emailsSent >= sequence.emails.length) {
        drip.status = 'completed';
      }
    });
    App.saveState();
  };

  // Get customer segment
  const getSegment = (segment) => {
    const customers = App.state.customers || [];
    const jobs = App.state.jobs || [];
    switch (segment) {
      case 'residential':
        return customers.filter(c => c.type === 'residential' || !c.type);
      case 'commercial':
        return customers.filter(c => c.type === 'commercial');
      case 'vip':
        return customers.filter(c => {
          const total = jobs.filter(j => j.customer === c.name).reduce((sum, j) => sum + (j.total || 0), 0);
          return total >= 2000;
        });
      case 'inactive':
        return customers.filter(c => {
          const lastJob = jobs.filter(j => j.customer === c.name).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
          if (!lastJob) return true;
          const daysSince = (Date.now() - new Date(lastJob.date)) / 86400000;
          return daysSince > 180;
        });
      case 'recent':
        return customers.filter(c => {
          const lastJob = jobs.filter(j => j.customer === c.name).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
          if (!lastJob) return false;
          const daysSince = (Date.now() - new Date(lastJob.date)) / 86400000;
          return daysSince <= 30;
        });
      default:
        return customers.filter(c => c.email);
    }
  };

  // Fill template variables
  const fillTemplate = (text, customer) => {
    const settings = App.state.settings || {};
    return text
      .replace(/\{\{name\}\}/g, customer.name || 'Customer')
      .replace(/\{\{phone\}\}/g, settings.phone || '')
      .replace(/\{\{website\}\}/g, settings.website || '')
      .replace(/\{\{businessName\}\}/g, settings.businessName || 'FlowJob')
      .replace(/\{\{reviewLink\}\}/g, settings.googleReviewLink || '#')
      .replace(/\{\{lastService\}\}/g, getLastServiceDate(customer.name))
      .replace(/\{\{service\}\}/g, 'plumbing service')
      .replace(/\{\{serviceDate\}\}/g, new Date().toLocaleDateString());
  };

  // Get last service date
  const getLastServiceDate = (customerName) => {
    const jobs = (App.state.jobs || [])
      .filter(j => j.customer === customerName)
      .sort((a,b) => new Date(b.date) - new Date(a.date));
    return jobs.length > 0 ? new Date(jobs[0].date).toLocaleDateString() : 'N/A';
  };

  // Get stats
  const getStats = () => {
    const log = App.state.emailLog || [];
    const drips = App.state.dripSequences || [];
    return {
      totalSent: log.length,
      activeDrips: drips.filter(d => d.status === 'active').length,
      completedDrips: drips.filter(d => d.status === 'completed').length,
      lastSent: log.length > 0 ? new Date(log[log.length - 1].sentAt).toLocaleDateString() : 'Never'
    };
  };

  // Render settings
  const renderSettings = () => {
    const stats = getStats();
    return `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">📧 Email Marketing</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-gold-400">${stats.totalSent}</p>
            <p class="text-sm text-gray-400">Emails Sent</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-blue-400">${stats.activeDrips}</p>
            <p class="text-sm text-gray-400">Active Drips</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-green-400">${stats.completedDrips}</p>
            <p class="text-sm text-gray-400">Completed</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-purple-400">${Object.keys(TEMPLATES).length}</p>
            <p class="text-sm text-gray-400">Templates</p>
          </div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">SendGrid API Key</label>
          <input type="password" id="sendgrid_key" value="${App.esc(App.state.settings?.sendgridKey || '')}"
                 class="form-input" placeholder="Enter SendGrid API Key"
                 onchange="EmailMarketing.saveAPIKey(this.value)">
        </div>
        <div class="flex flex-wrap gap-2">
          ${Object.entries(TEMPLATES).map(([key, t]) => `
            <button onclick="EmailMarketing.sendCampaign('${key}', 'all')" class="btn btn-secondary text-sm px-3 py-2">
              📨 ${t.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  };

  // Save API key
  const saveAPIKey = (key) => {
    App.state.settings = App.state.settings || {};
    App.state.settings.sendgridKey = key;
    App.saveState();
    showToast('API key saved', 'success');
  };

  return {
    TEMPLATES,
    DRIP_SEQUENCES,
    sendEmail,
    sendCampaign,
    startDrip,
    processDrips,
    getSegment,
    getStats,
    renderSettings,
    saveAPIKey
  };
})();
