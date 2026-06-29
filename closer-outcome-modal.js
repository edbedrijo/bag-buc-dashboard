<script>
(function () {
  // ─── CONFIG ───────────────────────────────────────────────────────────────
  const LOCATION_ID    = "SwbNBq7ED4YQbSmTeva8";
  const DASHBOARD_URL  = "https://bag-buc-dashboard.vercel.app";
  const DEBUG          = true;

  // Calendars that show the Log Outcome button
  const TARGET_CALENDARS = [
    "strategy call with arthur & team",
    "strategy follow up"
  ];

  // Closer keyword → display name (used to detect logged-in user)
  const CLOSER_TAB_MAP = {
    "tim":   "Tim's Team",
    "mark":  "Mark's Team",
    "mikey": "Mikey's Team",
    "ilya":  "Ilya's Team",
    "joey":  "Joey's Team"
  };

  function log(...args) { if (DEBUG) console.log('[OutcomeModal]', ...args); }

  // ─── LOCATION GUARD ───────────────────────────────────────────────────────
  const pathMatch = window.location.pathname.match(/location\/([^\/]+)/)?.[1];
  const urlParam  = new URLSearchParams(window.location.search).get('location_id');
  const currentLocation = pathMatch || urlParam;

  if (currentLocation !== LOCATION_ID) { log('Location mismatch, exiting.'); return; }
  if (window.__outcomeModalInitBUC) { log('Already initialized, skipping.'); return; }
  window.__outcomeModalInitBUC = true;
  log('Script initialized.');

  // ─── INTERCEPT XHR + FETCH — CAPTURE APPOINTMENT IDs FROM RESPONSES ──────
  let currentAppointmentId = null;

  // Map of appointmentId → { title, calendarId, startTime, ... }
  const apptRegistry = {};

  function cleanApptId(rawId) {
    if (!rawId) return null;
    return rawId.split('_')[0];
  }

  function storeApptData(data) {
    const items = Array.isArray(data) ? data
      : data?.appointments || data?.data || data?.events || [];
    items.forEach(item => {
      if (item?.id && item.id.length > 10) {
        const cleanId = cleanApptId(item.id);
        apptRegistry[cleanId] = { ...item, _cleanId: cleanId };
        log('Registered appointment:', cleanId, item.title || '', '| startTime:', item.startTime || item.start || '');
      }
    });
  }

  function extractApptIdFromUrl(url) {
    const match = String(url).match(/appointments\/([a-zA-Z0-9]{15,})/);
    if (match) { currentAppointmentId = match[1]; log('Captured appointment ID from URL:', currentAppointmentId); }
  }

  // Intercept XHR
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    extractApptIdFromUrl(url);
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', function () {
      try {
        if (this._url && this._url.includes('appointment')) {
          const data = JSON.parse(this.responseText);
          storeApptData(data);
        }
      } catch (e) {}
    });
    return origSend.apply(this, arguments);
  };

  // Intercept fetch
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    extractApptIdFromUrl(url);
    const result = origFetch.apply(this, arguments);
    if (url.includes('appointment')) {
      result.then(res => {
        res.clone().json().then(data => storeApptData(data)).catch(() => {});
      }).catch(() => {});
    }
    return result;
  };

  // ─── GET LOGGED-IN CLOSER NAME ────────────────────────────────────────────
  function getLoggedInCloserTab() {
    const selectors = [
      '[data-testid="user-name"]',
      '.user-name',
      '.navbar-user-name',
      '[class*="userName"]',
      '[class*="user-name"]'
    ];
    let name = null;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) { name = el.textContent.trim().toLowerCase(); break; }
    }
    if (!name) {
      try {
        const userData = localStorage.getItem('user') || localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          name = (parsed.name || parsed.firstName || '').toLowerCase();
        }
      } catch (e) {}
    }
    log('Detected user name:', name);
    if (!name) return null;
    for (const [key, tab] of Object.entries(CLOSER_TAB_MAP)) {
      if (name.includes(key)) return tab;
    }
    return null;
  }

  // ─── FETCH ROW FROM SUPABASE (via dashboard API) ──────────────────────────
  async function fetchRowFromSupabase(appointmentId, contactId, callDate) {
    const params = new URLSearchParams({ appointmentId });
    if (contactId) params.set('contactId', contactId);
    if (callDate)  params.set('callDate', callDate);
    const res = await fetch(`${DASHBOARD_URL}/api/call-outcome?${params}`);
    if (!res.ok) throw new Error('Supabase fetch failed: ' + res.status);
    return res.json(); // { found, record }
  }

  // ─── STYLES ───────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #buc-outcome-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: bucFadeIn 0.18s ease;
    }
    @keyframes bucFadeIn { from { opacity:0 } to { opacity:1 } }
    #buc-outcome-modal {
      background: #fff; border-radius: 12px; width: 600px; max-width: 95vw;
      max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      animation: bucSlideUp 0.2s ease;
    }
    @keyframes bucSlideUp { from { transform: translateY(16px); opacity:0 } to { transform: translateY(0); opacity:1 } }
    #buc-outcome-modal .om-header {
      padding: 20px 24px 14px; border-bottom: 1px solid #f0f0f0;
      display: flex; align-items: flex-start; gap: 12px;
    }
    #buc-outcome-modal .om-close {
      margin-left: auto; background: none; border: none; cursor: pointer;
      color: #9ca3af; padding: 4px; border-radius: 5px; font-size: 20px;
      transition: color 0.15s, background 0.15s; flex-shrink: 0;
    }
    #buc-outcome-modal .om-close:hover { color: #374151; background: #f3f4f6; }
    #buc-outcome-modal .om-icon {
      width: 36px; height: 36px; border-radius: 8px; background: #f0fdfa;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
    }
    #buc-outcome-modal .om-icon svg { width:18px; height:18px; }
    #buc-outcome-modal .om-header h2 { margin: 0; font-size: 16px; font-weight: 600; color: #111827; }
    #buc-outcome-modal .om-appt-name { margin: 3px 0 0; font-size: 13px; color: #0d9488; font-weight: 500; }
    #buc-outcome-modal .om-appt-time { margin: 1px 0 0; font-size: 12px; color: #9ca3af; }
    #buc-outcome-modal .om-body { padding: 20px 24px; }
    #buc-outcome-modal .om-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    #buc-outcome-modal .om-field { display: flex; flex-direction: column; gap: 5px; }
    #buc-outcome-modal .om-field.full { grid-column: 1 / -1 !important; }
    #buc-outcome-modal .om-section {
      grid-column: 1 / -1 !important; font-size: 11px; font-weight: 700; color: #9ca3af;
      text-transform: uppercase; letter-spacing: 0.06em; padding-top: 6px;
      border-top: 1px solid #f0f0f0; margin-top: 2px; width: 100%;
    }
    #buc-outcome-modal .om-field label {
      font-size: 13px; font-weight: 500; color: #374151;
    }
    #buc-outcome-modal .om-field select,
    #buc-outcome-modal .om-field input,
    #buc-outcome-modal .om-field textarea {
      padding: 8px 11px; border: 1.5px solid #e5e7eb; border-radius: 7px;
      font-size: 14px; color: #111827; background: #fff; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit; width: 100%; box-sizing: border-box;
    }
    #buc-outcome-modal .om-field select:focus,
    #buc-outcome-modal .om-field input:focus,
    #buc-outcome-modal .om-field textarea:focus {
      border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.12);
    }
    #buc-outcome-modal .om-field input[readonly] {
      background: #f9fafb; color: #6b7280; cursor: default;
    }
    #buc-outcome-modal .om-field textarea { resize: vertical; min-height: 80px; }
    #buc-outcome-modal .om-footer {
      padding: 16px 24px; border-top: 1px solid #f0f0f0;
      display: flex; justify-content: flex-end; gap: 10px;
    }
    #buc-outcome-modal .om-btn {
      padding: 9px 22px; border-radius: 7px; font-size: 14px; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.15s; font-family: inherit;
    }
    #buc-outcome-modal .om-btn-primary { background: #0d9488; color: #fff; }
    #buc-outcome-modal .om-btn-primary:hover { background: #0f766e; }
    #buc-outcome-modal .om-btn-primary:disabled { background: #5eead4; cursor: not-allowed; }
    #buc-outcome-modal .om-btn-cancel { background: none; color: #374151; border: 1.5px solid #e5e7eb; }
    #buc-outcome-modal .om-btn-cancel:hover { background: #f9fafb; }
    #buc-outcome-modal .om-loading {
      padding: 10px 14px; background: #f0fdfa; border: 1px solid #99f6e4;
      border-radius: 7px; color: #0f766e; font-size: 13px; font-weight: 500;
      margin-bottom: 16px;
    }
    #buc-outcome-modal .om-success {
      padding: 10px 14px; background: #ecfdf5; border: 1px solid #86efac;
      border-radius: 7px; color: #166534; font-size: 13px; font-weight: 500;
      margin-bottom: 14px; display: none;
    }
    #buc-outcome-modal .om-error {
      padding: 10px 14px; background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 7px; color: #991b1b; font-size: 13px; font-weight: 500;
      margin-bottom: 14px; display: none;
    }
    .buc-log-btn {
      width: 100%; margin-top: 10px; padding: 7px 0;
      background: #f0fdfa; border: none; border-radius: 7px;
      font-size: 13px; font-weight: 600; color: #0f766e;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: background 0.15s;
    }
    .buc-log-btn:hover { background: #ccfbf1; }
  `;
  document.head.appendChild(style);

  function formatApptDateTime(isoString) {
    if (!isoString) return '';
    const [datePart, timePart] = isoString.split('T');
    if (!datePart) return '';
    const [y, m, d] = datePart.split('-');
    if (!timePart) return `${m}/${d}/${y}`;
    const [hStr, minStr] = timePart.split(':');
    const h    = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = ((h % 12) || 12);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y} · ${h12}:${minStr} ${ampm}`;
  }

  // Returns call date as ISO string for use as the composite key
  function getCallDateISO(isoString) {
    if (!isoString) return '';
    return isoString; // already ISO — pass directly to API
  }

  // ─── BUILD MODAL HTML ─────────────────────────────────────────────────────
  function buildModal(apptName, apptDateTime, prefill = {}) {
    const o = (options, val) => {
      const list = val && !options.includes(val) ? [...options, val] : options;
      return list.map(opt => `<option${opt === val ? ' selected' : ''}>${opt}</option>`).join('');
    };

    const closerOptions = ['Tim Coulter','Mark Gillard','Michael Ryan','Ilya Yablonsky','Joey Milewski'];
    const setterOptions = ['Gabe Malang','Ilya Yablonsky','Tim Coulter','Mark Gillard','Michael Ryan','Joey Milewski'];

    const overlay = document.createElement('div');
    overlay.id = 'buc-outcome-overlay';
    overlay.innerHTML = `
      <div id="buc-outcome-modal">
        <div class="om-header">
          <div class="om-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <div>
            <h2>Log Call Outcome</h2>
            ${apptName    ? `<p class="om-appt-name">${apptName}</p>` : ''}
            ${apptDateTime ? `<p class="om-appt-time">${apptDateTime}</p>` : ''}
          </div>
          <button class="om-close" id="buc-close-btn">&#x2715;</button>
        </div>
        <div class="om-body">
          ${prefill._loading ? `<div class="om-loading" id="buc-loading-msg">Fetching existing data...</div>` : ''}
          <div class="om-success" id="buc-success-msg">Outcome saved successfully.</div>
          <div class="om-error" id="buc-error-msg">Failed to save. Please try again.</div>
          <div class="om-grid">

            <div class="om-section">Call</div>
            <div class="om-field">
              <label>Call Status</label>
              <select id="buc-call-status">
                <option value="">— Select —</option>
                ${o(['Scheduled','Show','No Show','Rescheduled','Canceled'], prefill.callStatus)}
              </select>
            </div>
            <div class="om-field">
              <label>Call Outcome</label>
              <select id="buc-call-outcome">
                <option value="">— Select —</option>
                ${o(['PIF','Payment Plan','Deposit Made','Follow Up Scheduled','Not Sold','Not Qualified','Not Interested'], prefill.callOutcome)}
              </select>
            </div>

            <div class="om-section">Closers</div>
            <div class="om-field">
              <label>Closer</label>
              <select id="buc-closer">
                <option value="">— Select —</option>
                ${o(closerOptions, prefill.closer)}
              </select>
            </div>
            <div class="om-field">
              <label>Setter</label>
              <select id="buc-setter">
                <option value="">— Select —</option>
                ${o(setterOptions, prefill.setter)}
              </select>
            </div>

            <div class="om-section">Payment</div>
            <div class="om-field">
              <label>Cash Collected</label>
              <input type="number" id="buc-cash-collected" placeholder="0.00" min="0" step="0.01" value="${prefill.cashCollected || ''}" />
            </div>
            <div class="om-field">
              <label>Total Value</label>
              <input type="number" id="buc-total-value" placeholder="0.00" min="0" step="0.01" value="${prefill.totalValue || ''}" />
            </div>

            <div class="om-section">Quality</div>
            <div class="om-field">
              <label>Lead Quality</label>
              <select id="buc-lead-quality">
                <option value="">— Select —</option>
                ${o(['💎 High Value','🟢 Qualified','🟡 So-So','🟠 Low Quality','🔴 Bad Lead'], prefill.leadQuality)}
              </select>
            </div>
            <div class="om-field">
              <label>Call Quality</label>
              <select id="buc-call-quality">
                <option value="">— Select —</option>
                ${o(['💎 Excellent Call','🟢 Good Call','🟡 Average Call','🟠 Weak Call','🔴 Bad Call'], prefill.callQuality)}
              </select>
            </div>

            <div class="om-section">Recording & Notes</div>
            <div class="om-field full">
              <label>Recording URL</label>
              <input type="url" id="buc-recording" placeholder="https://..." value="${prefill.recording || ''}" />
            </div>
            <div class="om-field full">
              <label>Notes</label>
              <textarea id="buc-notes" placeholder="Any notes...">${prefill.notes || ''}</textarea>
            </div>

            <div class="om-section">Jerry Review</div>
            <div class="om-field">
              <label>Jerry Grade</label>
              <select id="buc-jerry-grade">
                <option value="">— Select —</option>
                ${o(['A','B','C','D'], prefill.jerryGrade)}
              </select>
            </div>
            <div class="om-field full">
              <label>Jerry Coaching Note</label>
              <textarea id="buc-jerry-note" placeholder="Coaching notes...">${prefill.jerryCoachNote || ''}</textarea>
            </div>

          </div>
        </div>
        <div class="om-footer">
          <button class="om-btn om-btn-cancel" id="buc-skip-btn">Skip for now</button>
          <button class="om-btn om-btn-primary" id="buc-submit-btn">Save Outcome</button>
        </div>
      </div>
    `;
    return overlay;
  }

  // ─── PREFILL MODAL FROM SUPABASE ROW ──────────────────────────────────────
  function applyPrefill(record) {
    if (!record) return;
    const fields = {
      'buc-call-status':    record.call_status || 'Scheduled',
      'buc-call-outcome':   record.call_outcome,
      'buc-cash-collected': record.cash_collected != null ? String(record.cash_collected) : '',
      'buc-total-value':    record.total_value    != null ? String(record.total_value)    : '',
      'buc-lead-quality':   record.lead_quality,
      'buc-call-quality':   record.call_quality,
      'buc-recording':      record.recording,
      'buc-notes':          record.notes,
      'buc-jerry-grade':    record.jerry_grade,
      'buc-jerry-note':     record.jerry_coaching_note,
      'buc-closer':         record.closer,
      'buc-setter':         record.setter_last,
    };
    for (const [id, val] of Object.entries(fields)) {
      if (!val) continue;
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.tagName === 'SELECT') {
        const strVal = String(val);
        let found = false;
        for (const opt of el.options) {
          if (opt.text === strVal || opt.value === strVal) { opt.selected = true; found = true; break; }
        }
        if (!found) {
          const opt = document.createElement('option');
          opt.text = strVal; opt.value = strVal; opt.selected = true;
          el.appendChild(opt);
        }
      } else {
        el.value = val;
      }
    }
    log('Pre-filled from Supabase.');
  }

  // ─── SHOW MODAL ───────────────────────────────────────────────────────────
  async function showModal(contactId, appointmentId, subtitle, statusOverride) {
    if (document.getElementById('buc-outcome-overlay')) return;
    log('Showing modal | contactId:', contactId, '| appointmentId:', appointmentId);

    const apptData     = apptRegistry[appointmentId] || {};
    const apptName     = subtitle || apptData.title || '';
    const apptDateTime = formatApptDateTime(apptData.startTime || apptData.start || '');
    const callDateISO  = getCallDateISO(apptData.startTime || apptData.start || '');

    // Detect closer from logged-in user
    const closerTab   = getLoggedInCloserTab();
    const closerNames = {
      "Tim's Team": 'Tim Coulter', "Mark's Team": 'Mark Gillard',
      "Mikey's Team": 'Michael Ryan', "Ilya's Team": 'Ilya Yablonsky',
      "Joey's Team": 'Joey Milewski'
    };
    const detectedCloser = closerTab ? (closerNames[closerTab] || '') : '';

    const overlay = buildModal(apptName, apptDateTime, { _loading: !!appointmentId, closer: detectedCloser });
    document.body.appendChild(overlay);

    const submitBtn  = document.getElementById('buc-submit-btn');
    const successMsg = document.getElementById('buc-success-msg');
    const errorMsg   = document.getElementById('buc-error-msg');
    const loadingMsg = document.getElementById('buc-loading-msg');

    document.getElementById('buc-close-btn').addEventListener('click', () => overlay.remove());
    document.getElementById('buc-skip-btn').addEventListener('click',  () => overlay.remove());

    // Pre-fill from Supabase
    if (appointmentId) {
      fetchRowFromSupabase(appointmentId, contactId, callDateISO)
        .then(({ record }) => {
          if (loadingMsg) loadingMsg.remove();
          applyPrefill(record);
          if (statusOverride) {
            const el = document.getElementById('buc-call-status');
            if (el) for (const opt of el.options) {
              if (opt.text.toLowerCase() === statusOverride.toLowerCase()) { opt.selected = true; break; }
            }
          }
        })
        .catch(err => {
          log('Pre-fill error:', err);
          if (loadingMsg) loadingMsg.remove();
        });
    }

    // Submit
    submitBtn.addEventListener('click', async () => {
      const payload = {
        appointmentId:    appointmentId || null,
        contactId,
        callDate:         callDateISO   || null,
        locationId:       LOCATION_ID,
        triggeredAt:      new Date().toISOString(),
        callStatus:       document.getElementById('buc-call-status').value,
        callOutcome:      document.getElementById('buc-call-outcome').value,
        closer:           document.getElementById('buc-closer').value,
        setter:           document.getElementById('buc-setter').value,
        cashCollected:    document.getElementById('buc-cash-collected').value,
        totalValue:       document.getElementById('buc-total-value').value,
        leadQuality:      document.getElementById('buc-lead-quality').value,
        callQuality:      document.getElementById('buc-call-quality').value,
        recording:        document.getElementById('buc-recording').value,
        notes:            document.getElementById('buc-notes').value,
        jerryGrade:       document.getElementById('buc-jerry-grade').value,
        jerryCoachingNote: document.getElementById('buc-jerry-note').value,
      };

      log('Sending payload:', payload);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
      successMsg.style.display = 'none';
      errorMsg.style.display   = 'none';

      try {
        const res = await fetch(`${DASHBOARD_URL}/api/log-outcome`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        if (res.ok) {
          successMsg.style.display = 'block';
          submitBtn.textContent = 'Saved';
          setTimeout(() => overlay.remove(), 1800);
        } else {
          throw new Error('Non-OK: ' + res.status);
        }
      } catch (err) {
        log('Submit error:', err);
        errorMsg.style.display = 'block';
        submitBtn.disabled     = false;
        submitBtn.textContent  = 'Save Outcome';
      }
    });
  }

  // ─── STATUS CHANGE DETECTION ──────────────────────────────────────────────
  let pendingStatus = null;
  let pendingStatusTime = 0;

  function setPending(status) { pendingStatus = status; pendingStatusTime = Date.now(); log('Pending status:', status); }
  function consumePending() {
    if (!pendingStatus) return null;
    if (Date.now() - pendingStatusTime > 60000) { pendingStatus = null; return null; }
    const s = pendingStatus; pendingStatus = null; return s;
  }

  const STATUS_VALUES = ['show', 'showed', 'no show', 'no-show', 'rescheduled', 'canceled', 'cancelled'];

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.tagName !== 'SELECT') return;
    const v = (el.value || '').toLowerCase().trim();
    if (STATUS_VALUES.some(s => v.includes(s))) setPending(el.value);
  }, true);

  document.addEventListener('click', (e) => {
    const text = e.target.textContent?.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    if (STATUS_VALUES.some(s => lower.includes(s))) {
      const isOption = e.target.closest('ul, [role="listbox"], [class*="dropdown"], [class*="select-option"], [class*="list-item"]');
      if (isOption) setPending(text);
    }
  }, true);

  function getContactId() { return window.location.pathname.split('/').pop(); }

  // ─── SAVE BUTTON DETECTION ────────────────────────────────────────────────
  const listenedButtons = new WeakSet();

  function attachSaveListeners() {
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent.trim();
      if ((text === 'Save' || text === 'Save Changes') && !listenedButtons.has(btn)) {
        listenedButtons.add(btn);
        btn.addEventListener('click', () => {
          const status = consumePending();
          if (status) {
            const contactId     = getContactId();
            const appointmentId = currentAppointmentId;
            log('Status-change trigger | status:', status);
            const apptData = apptRegistry[appointmentId] || {};
            const apptSubtitle = apptData.title || apptData.calendarName || 'Appointment status updated';
            setTimeout(() => showModal(contactId, appointmentId, apptSubtitle, status), 700);
          }
        }, true);
      }
    });
  }

  // ─── LOG OUTCOME BUTTON INJECTION ─────────────────────────────────────────
  const injectedCards = new WeakSet();

  function isTargetCalendar(cardEl) {
    const text = cardEl.textContent?.toLowerCase() || '';
    return TARGET_CALENDARS.some(cal => text.includes(cal));
  }

  function injectLogButtons() {
    const cards = document.querySelectorAll(
      '[class*="appointment-card"], [class*="appointmentCard"], [class*="appointment-item"], [class*="appointmentItem"]'
    );
    cards.forEach(card => {
      if (injectedCards.has(card)) return;
      if (!isTargetCalendar(card)) return;
      injectedCards.add(card);

      const btn = document.createElement('button');
      btn.className = 'buc-log-btn';
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        Log Outcome
      `;

      function resolveApptId() {
        if (card.dataset.bucApptId) return card.dataset.bucApptId;
        const cardText = card.textContent;
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        for (const [id, appt] of Object.entries(apptRegistry)) {
          const start = appt.startTime || appt.start || '';
          if (!start) continue;
          const [datePart, timePart] = start.split('T');
          const [, month, day] = datePart.split('-');
          const monthStr = MONTHS[parseInt(month, 10) - 1];
          const dayStr   = String(parseInt(day, 10));
          const dateLabel = `${monthStr} ${dayStr}`; // e.g. "Jul 22"
          const [hourStr, minStr] = timePart.split(':');
          const hour = parseInt(hourStr, 10);
          const min  = minStr || '00';
          const h12  = ((hour % 12) || 12);
          const timeStr = `${h12}:${min}`;
          if (cardText.includes(dateLabel) && cardText.includes(timeStr)) {
            log('Matched registry by date+time:', id, dateLabel, timeStr);
            card.dataset.bucApptId = id;
            return id;
          }
        }
        return currentAppointmentId;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const apptId   = resolveApptId();
        const subtitle = card.querySelector('[class*="title"], [class*="name"]')?.textContent?.trim() || 'Strategy Call';
        log('Log Outcome button clicked | apptId:', apptId);
        showModal(getContactId(), apptId, subtitle, null);
      });
      card.appendChild(btn);
      log('Injected Log Outcome button into card.');
    });
  }

  // ─── OBSERVE DOM ──────────────────────────────────────────────────────────
  const observer = new MutationObserver(() => {
    attachSaveListeners();
    injectLogButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  attachSaveListeners();
  injectLogButtons();

})();
</script>
