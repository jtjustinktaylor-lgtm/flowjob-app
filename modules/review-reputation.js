/* ============================================
   REVIEW REPUTATION — FlowJob
   Review solicitation, tracking, response
   ============================================ */
const ReviewReputation = (() => {
  // Review platforms
  const PLATFORMS = {
    google: { name: 'Google', color: '#4285F4', icon: '🔵' },
    yelp: { name: 'Yelp', color: '#D32323', icon: '🔴' },
    facebook: { name: 'Facebook', color: '#1877F2', icon: '🔵' },
    angi: { name: 'Angi', color: '#76B82A', icon: '🟢' },
    thumbtack: { name: 'Thumbtack', color: '#00B8D4', icon: '🔵' }
  };

  // Response templates
  const RESPONSE_TEMPLATES = {
    positive: [
      "Thank you for your kind words! We're glad we could help with your plumbing needs. We look forward to serving you again!",
      "We appreciate your feedback! It was a pleasure working with you. Don't hesitate to reach out if you need anything else.",
      "Thank you for the wonderful review! We're committed to providing top-quality service to all our customers."
    ],
    negative: [
      "We're sorry to hear about your experience. We take all feedback seriously and would like to make this right. Please contact us directly so we can address your concerns.",
      "Thank you for bringing this to our attention. We apologize for any inconvenience and would appreciate the opportunity to discuss this further. Please reach out to us at your convenience.",
      "We're disappointed to hear we didn't meet your expectations. Your feedback helps us improve. Please contact us so we can resolve this matter."
    ],
    neutral: [
      "Thank you for your feedback! We're always working to improve our services. If there's anything we can do better, please let us know.",
      "We appreciate you taking the time to review us. Your input helps us serve our customers better."
    ]
  };

  // Request review via SMS/Email
  const requestReview = async (jobId, method = 'sms') => {
    const job = App.state.jobs?.find(j => j.id === jobId);
    if (!job) {
      showToast('Job not found', 'error');
      return false;
    }
    const customer = App.state.customers?.find(c => c.name === job.customer);
    const contact = method === 'sms' ? customer?.phone : customer?.email;
    if (!contact) {
      showToast(`Customer ${method === 'sms' ? 'phone' : 'email'} not found`, 'error');
      return false;
    }
    const message = generateReviewMessage(job, customer);
    // Track request
    if (!App.state.reviewRequests) App.state.reviewRequests = [];
    App.state.reviewRequests.push({
      id: Date.now(),
      jobId: jobId,
      customerId: customer?.id,
      method: method,
      contact: contact,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });
    App.saveState();
    // In production, this would call Twilio/SendGrid API
    showToast(`Review request sent via ${method.toUpperCase()}`, 'success');
    return true;
  };

  // Generate review message
  const generateReviewMessage = (job, customer) => {
    const businessName = App.state.settings?.businessName || 'FlowJob';
    const reviewLinks = {
      google: App.state.settings?.googleReviewLink || '#',
      yelp: App.state.settings?.yelpReviewLink || '#'
    };
    return `Hi ${customer?.name || 'there'}! Thank you for choosing ${businessName} for your recent ${job.title || 'service'}. We hope you're satisfied with our work! If you have a moment, we'd greatly appreciate a review: ${reviewLinks.google || reviewLinks.yelp}. Your feedback helps us serve you better!`;
  };

  // Track review
  const trackReview = (review) => {
    if (!App.state.reviews) App.state.reviews = [];
    App.state.reviews.push({
      id: Date.now(),
      ...review,
      date: review.date || new Date().toISOString(),
      responded: false
    });
    App.saveState();
    return true;
  };

  // Get average rating
  const getAverageRating = (platform = null) => {
    const reviews = (App.state.reviews || []).filter(r => !platform || r.platform === platform);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  };

  // Get review stats
  const getStats = () => {
    const reviews = App.state.reviews || [];
    const total = reviews.length;
    const byRating = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { if (byRating[r.rating] !== undefined) byRating[r.rating]++; });
    const byPlatform = {};
    Object.keys(PLATFORMS).forEach(p => {
      byPlatform[p] = reviews.filter(r => r.platform === p).length;
    });
    const unresponded = reviews.filter(r => !r.responded && r.rating <= 3).length;
    return { total, byRating, byPlatform, unresponded, average: getAverageRating() };
  };

  // Get response template
  const getResponseTemplate = (rating, customText = '') => {
    let category = 'neutral';
    if (rating >= 4) category = 'positive';
    else if (rating <= 2) category = 'negative';
    const templates = RESPONSE_TEMPLATES[category];
    const template = templates[Math.floor(Math.random() * templates.length)];
    return customText ? `${customText}\n\n${template}` : template;
  };

  // Mark review as responded
  const markResponded = (reviewId) => {
    const review = App.state.reviews?.find(r => r.id === reviewId);
    if (review) {
      review.responded = true;
      review.respondedAt = new Date().toISOString();
      App.saveState();
    }
  };

  // Render review settings
  const renderSettings = () => {
    const stats = getStats();
    return `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">⭐ Review Reputation</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-gold-400">${stats.average}</p>
            <p class="text-sm text-gray-400">Avg Rating</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold">${stats.total}</p>
            <p class="text-sm text-gray-400">Total Reviews</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-yellow-400">${stats.unresponded}</p>
            <p class="text-sm text-gray-400">Need Response</p>
          </div>
          <div class="p-4 rounded-xl text-center" style="background:rgba(255,255,255,0.05)">
            <p class="text-3xl font-bold text-blue-400">${Object.values(stats.byPlatform).reduce((a,b) => a+b, 0)}</p>
            <p class="text-sm text-gray-400">Platforms</p>
          </div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Google Review Link</label>
          <input type="url" id="google_review_link" value="${App.esc(App.state.settings?.googleReviewLink || '')}"
                 class="form-input" placeholder="https://g.page/r/..."
                 onchange="ReviewReputation.saveLink('google', this.value)">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Yelp Review Link</label>
          <input type="url" id="yelp_review_link" value="${App.esc(App.state.settings?.yelpReviewLink || '')}"
                 class="form-input" placeholder="https://yelp.com/biz/..."
                 onchange="ReviewReputation.saveLink('yelp', this.value)">
        </div>
        <div class="flex gap-2">
          <button onclick="ReviewReputation.showRecentReviews()" class="btn btn-secondary text-sm px-4 py-2">
            📋 View Recent Reviews
          </button>
          <button onclick="ReviewReputation.exportReviews()" class="btn btn-secondary text-sm px-4 py-2">
            📥 Export Reviews
          </button>
        </div>
      </div>
    `;
  };

  // Save review link
  const saveLink = (platform, url) => {
    App.state.settings = App.state.settings || {};
    App.state.settings[`${platform}ReviewLink`] = url;
    App.saveState();
    showToast(`${PLATFORMS[platform].name} review link saved`, 'success');
  };

  // Show recent reviews
  const showRecentReviews = () => {
    const reviews = (App.state.reviews || []).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
    if (reviews.length === 0) {
      showToast('No reviews yet', 'info');
      return;
    }
    let html = '<div class="space-y-3 max-h-96 overflow-y-auto">';
    reviews.forEach(r => {
      const platform = PLATFORMS[r.platform] || { name: r.platform, icon: '⭐' };
      const stars = '⭐'.repeat(r.rating || 0);
      html += `
        <div class="p-3 rounded-lg" style="background:rgba(255,255,255,0.05)">
          <div class="flex justify-between items-start">
            <div>
              <span class="font-semibold">${platform.icon} ${platform.name}</span>
              <span class="ml-2">${stars}</span>
            </div>
            <span class="text-xs text-gray-400">${new Date(r.date).toLocaleDateString()}</span>
          </div>
          <p class="text-sm mt-1">${App.esc(r.text || '')}</p>
          ${!r.responded ? `<button onclick="ReviewReputation.markResponded(${r.id})" class="text-xs text-blue-400 mt-1">Mark as Responded</button>` : '<span class="text-xs text-green-400">✓ Responded</span>'}
        </div>`;
    });
    html += '</div>';
    App.showModal('Recent Reviews', html);
  };

  // Export reviews
  const exportReviews = () => {
    const reviews = App.state.reviews || [];
    if (reviews.length === 0) {
      showToast('No reviews to export', 'info');
      return;
    }
    const rows = [['Date', 'Platform', 'Rating', 'Review', 'Customer', 'Responded']];
    reviews.forEach(r => {
      rows.push([
        new Date(r.date).toLocaleDateString(),
        r.platform || '',
        r.rating || '',
        `"${(r.text || '').replace(/"/g, '""')}"`,
        r.customerName || '',
        r.responded ? 'Yes' : 'No'
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    download(csv, `FlowJob_Reviews_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  return {
    requestReview,
    trackReview,
    getAverageRating,
    getStats,
    getResponseTemplate,
    markResponded,
    renderSettings,
    saveLink,
    showRecentReviews,
    exportReviews
  };
})();
