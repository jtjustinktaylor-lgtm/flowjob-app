/* ============================================
   CALENDAR INTEGRATION — FlowJob
   Google Calendar, Outlook, iCal sync
   ============================================ */
const CalendarIntegration = (() => {
  // Google Calendar OAuth2 config
  const GOOGLE_CONFIG = {
    clientId: localStorage.getItem('flowjob_google_client_id') || '',
    apiKey: localStorage.getItem('flowjob_google_api_key') || '',
    scopes: 'https://www.googleapis.com/auth/calendar.events',
    discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
  };

  let googleToken = null;
  let syncEnabled = false;

  // Initialize
  const init = () => {
    syncEnabled = App.state.settings?.calendarSync || false;
    if (syncEnabled && GOOGLE_CONFIG.clientId) {
      loadGoogleAPI();
    }
  };

  // Load Google API
  const loadGoogleAPI = () => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      gapi.load('client:auth2', () => {
        gapi.client.init({
          apiKey: GOOGLE_CONFIG.apiKey,
          clientId: GOOGLE_CONFIG.clientId,
          discoveryDocs: [GOOGLE_CONFIG.discoveryDoc],
          scope: GOOGLE_CONFIG.scopes
        }).then(() => {
          googleToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse();
        });
      });
    };
    document.head.appendChild(script);
  };

  // Connect Google Calendar
  const connectGoogle = async () => {
    if (!gapi?.auth2) {
      showToast('Google API not loaded. Please configure API key.', 'error');
      return false;
    }
    try {
      const auth = gapi.auth2.getAuthInstance();
      if (!auth.isSignedIn.get()) {
        await auth.signIn();
      }
      googleToken = auth.currentUser.get().getAuthResponse();
      syncEnabled = true;
      App.state.settings = App.state.settings || {};
      App.state.settings.calendarSync = true;
      App.saveState();
      showToast('Google Calendar connected!', 'success');
      return true;
    } catch (err) {
      showToast('Failed to connect Google Calendar: ' + err.message, 'error');
      return false;
    }
  };

  // Disconnect Google Calendar
  const disconnectGoogle = () => {
    if (gapi?.auth2) {
      const auth = gapi.auth2.getAuthInstance();
      auth.signOut();
    }
    googleToken = null;
    syncEnabled = false;
    App.state.settings.calendarSync = false;
    App.saveState();
    showToast('Google Calendar disconnected', 'info');
  };

  // Create Google Calendar event
  const createGoogleEvent = async (job) => {
    if (!googleToken || !syncEnabled) return null;
    try {
      const event = {
        summary: `${job.title} - ${job.customer || 'Customer'}`,
        location: job.address || '',
        description: `Job #${job.id}\n${job.notes || ''}\n\nCreated by FlowJob`,
        start: {
          dateTime: new Date(job.date + 'T' + (job.time || '09:00')).toISOString(),
          timeZone: App.state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(job.date + 'T' + addHours(job.time || '09:00', job.duration || 2)).toISOString(),
          timeZone: App.state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'email', minutes: 60 }
          ]
        }
      };
      const response = await gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });
      return response.result.id;
    } catch (err) {
      console.error('Google Calendar sync error:', err);
      return null;
    }
  };

  // Update Google Calendar event
  const updateGoogleEvent = async (eventId, job) => {
    if (!googleToken || !eventId) return false;
    try {
      const event = {
        summary: `${job.title} - ${job.customer || 'Customer'}`,
        location: job.address || '',
        description: `Job #${job.id}\n${job.notes || ''}\n\nUpdated by FlowJob`
      };
      await gapi.client.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        resource: event
      });
      return true;
    } catch (err) {
      console.error('Google Calendar update error:', err);
      return false;
    }
  };

  // Delete Google Calendar event
  const deleteGoogleEvent = async (eventId) => {
    if (!googleToken || !eventId) return false;
    try {
      await gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });
      return true;
    } catch (err) {
      console.error('Google Calendar delete error:', err);
      return false;
    }
  };

  // Export as .ics file (iCal format)
  const exportICS = (jobs) => {
    const events = Array.isArray(jobs) ? jobs : [jobs];
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//FlowJob//Plumbing Business Manager//EN\r\n';
    events.forEach(job => {
      const startDate = formatDateForICS(job.date, job.time || '09:00');
      const endDate = formatDateForICS(job.date, addHours(job.time || '09:00', job.duration || 2));
      ics += `BEGIN:VEVENT\r\n`;
      ics += `DTSTART:${startDate}\r\n`;
      ics += `DTEND:${endDate}\r\n`;
      ics += `SUMMARY:${escapeICS(job.title)} - ${escapeICS(job.customer || 'Customer')}\r\n`;
      ics += `LOCATION:${escapeICS(job.address || '')}\r\n`;
      ics += `DESCRIPTION:${escapeICS('Job #' + job.id + '\n' + (job.notes || ''))}\r\n`;
      ics += `UID:flowjob-${job.id}@flowjob.app\r\n`;
      ics += `END:VEVENT\r\n`;
    });
    ics += 'END:VCALENDAR';
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlowJob_Calendar_${new Date().toISOString().split('T')[0]}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format date for ICS
  const formatDateForICS = (date, time) => {
    const [hours, minutes] = (time || '09:00').split(':');
    const d = new Date(date);
    d.setHours(parseInt(hours), parseInt(minutes), 0);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  // Escape ICS text
  const escapeICS = (text) => {
    return (text || '').replace(/[\\;,\n]/g, (match) => {
      if (match === '\n') return '\\n';
      return '\\' + match;
    });
  };

  // Add hours to time string
  const addHours = (timeStr, hours) => {
    const [h, m] = timeStr.split(':').map(Number);
    const newH = (h + hours) % 24;
    return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Sync all jobs to calendar
  const syncAllJobs = async () => {
    if (!syncEnabled || !googleToken) {
      showToast('Calendar sync not enabled', 'warning');
      return;
    }
    const jobs = App.state.jobs || [];
    let synced = 0;
    for (const job of jobs) {
      if (job.calendarEventId) {
        await updateGoogleEvent(job.calendarEventId, job);
      } else {
        const eventId = await createGoogleEvent(job);
        if (eventId) {
          job.calendarEventId = eventId;
          synced++;
        }
      }
    }
    App.saveState();
    showToast(`Synced ${synced} jobs to Google Calendar`, 'success');
  };

  // Render calendar settings
  const renderSettings = () => {
    const connected = !!googleToken;
    return `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-bold text-gold-400 mb-4">📅 Calendar Integration</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-xl" style="background:rgba(255,255,255,0.05)">
            <div>
              <p class="font-semibold">Google Calendar</p>
              <p class="text-sm text-gray-400">${connected ? 'Connected' : 'Not connected'}</p>
            </div>
            <button onclick="CalendarIntegration.${connected ? 'disconnectGoogle' : 'connectGoogle'}()"
                    class="btn ${connected ? 'btn-secondary' : 'btn-primary'} text-sm px-4 py-2">
              ${connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Google API Key</label>
            <input type="password" id="google_api_key" value="${App.esc(GOOGLE_CONFIG.apiKey)}"
                   class="form-input" placeholder="Enter Google API Key"
                   onchange="CalendarIntegration.saveAPIKey(this.value)">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Google Client ID</label>
            <input type="password" id="google_client_id" value="${App.esc(GOOGLE_CONFIG.clientId)}"
                   class="form-input" placeholder="Enter Google Client ID"
                   onchange="CalendarIntegration.saveClientId(this.value)">
          </div>
          <div class="flex gap-2">
            <button onclick="CalendarIntegration.syncAllJobs()" class="btn btn-primary text-sm px-4 py-2">
              🔄 Sync All Jobs
            </button>
            <button onclick="CalendarIntegration.exportICS(App.state.jobs || [])" class="btn btn-secondary text-sm px-4 py-2">
              📥 Export .ics File
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // Save API key
  const saveAPIKey = (key) => {
    localStorage.setItem('flowjob_google_api_key', key);
    GOOGLE_CONFIG.apiKey = key;
    showToast('API key saved', 'success');
  };

  // Save Client ID
  const saveClientId = (id) => {
    localStorage.setItem('flowjob_google_client_id', id);
    GOOGLE_CONFIG.clientId = id;
    showToast('Client ID saved', 'success');
  };

  return {
    init,
    connectGoogle,
    disconnectGoogle,
    createGoogleEvent,
    updateGoogleEvent,
    deleteGoogleEvent,
    exportICS,
    syncAllJobs,
    renderSettings,
    saveAPIKey,
    saveClientId
  };
})();
