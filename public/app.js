const app = document.getElementById("app");
const EXTENSION_ZIP = "/extension/timeloop-extension-20260603-134239.zip";

const icons = {
  clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 9h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>`,
  grid: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  trend: `<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>`,
  brain: `<svg viewBox="0 0 24 24"><path d="M8 6a3 3 0 0 1 6-1 3 3 0 0 1 4 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-4 3 3 3 0 0 1-6-1 3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z"/><path d="M12 5v14M8 10h4M12 14h4"/></svg>`,
  globe: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`,
  chrome: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="10"/><path d="M21.2 8H12M3.5 7l4.6 8M11.9 22l4.6-8"/></svg>`,
  download: `<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>`,
  copy: `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><rect x="3" y="3" width="12" height="12" rx="2"/></svg>`,
  send: `<svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4Z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  edit: `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 16h10l1-16"/><path d="M10 11v6M14 11v6"/></svg>`,
  signout: `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>`,
  search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
  spark: `<svg viewBox="0 0 24 24"><path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5Z"/><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7Z"/></svg>`
};

const state = {
  config: {},
  user: localStorage.getItem("timeloop:authProvider") === "google" ? JSON.parse(localStorage.getItem("timeloop:user") || "null") : null,
  page: localStorage.getItem("timeloop:page") || "events",
  dashboard: null,
  error: "",
  editingEvent: null,
  tagDraft: "",
  filters: { q: "", start: "", end: "" },
  chat: [
    { role: "assistant", text: "Hi! I'm your AI productivity coach. I can help you understand your productivity patterns, get insights from your tracked events and browser activity, and suggest ways to improve. What would you like to know?" }
  ]
};

let googleButtonRendered = false;

init();

async function init() {
  try {
    state.config = await api("/api/config");
    await completeGoogleRedirect();
    if (state.user) await loadDashboard();
  } catch (error) {
    state.error = error.message;
  }
  render();
  initGoogle();
}

async function completeGoogleRedirect() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const credential = hash.get("id_token");
  if (!credential) return;
  history.replaceState(null, "", location.pathname + location.search);
  const { user } = await api("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
  await setUser(user, "google");
}

async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.user?.id) headers["x-timeloop-user-id"] = state.user.id;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

async function loadDashboard() {
  state.dashboard = await api(`/api/dashboard?userId=${encodeURIComponent(state.user.id)}`);
}

function initGoogle() {
  if (!state.config.googleClientId || state.user) return;
  if (!window.google) {
    setTimeout(initGoogle, 250);
    return;
  }
  google.accounts.id.initialize({
    client_id: state.config.googleClientId,
    callback: async ({ credential }) => {
      try {
        state.error = "";
        const { user } = await api("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
        await setUser(user, "google");
      } catch (error) {
        state.error = `Google sign-in failed: ${error.message}`;
        googleButtonRendered = false;
        render();
      }
    }
  });
  const target = document.getElementById("googleSignIn");
  if (target && !googleButtonRendered) {
    googleButtonRendered = true;
    target.innerHTML = "";
    google.accounts.id.renderButton(target, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      width: 456
    });
  }
}

async function setUser(user, provider = "google") {
  state.user = user;
  localStorage.setItem("timeloop:user", JSON.stringify(user));
  localStorage.setItem("timeloop:authProvider", provider);
  await loadDashboard();
  render();
}

function icon(name) {
  return icons[name] || "";
}

function logo() {
  return `<span class="logo">${icon("clock")}</span>`;
}

function hoursFromSeconds(seconds) {
  return `${(Number(seconds || 0) / 3600).toFixed(2).replace(/\.00$/, "")}h`;
}

function minutes(seconds) {
  const mins = Math.max(1, Math.round(Number(seconds || 0) / 60));
  return `${mins}m`;
}

function dateInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(iso) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function fmtTime(iso) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

function render() {
  app.innerHTML = state.user ? dashboardLayout() : signInPage();
  bind();
  if (state.user) {
    if (state.page === "analytics") drawAnalytics();
    if (state.page === "ai") scrollChat();
  } else {
    initGoogle();
  }
}

function signInPage() {
  return `
    <main class="auth-screen">
      <section class="auth-brand">
        ${logo()}
        <h1>TimeLoop</h1>
        <p>AI-Powered Productivity Tracking</p>
      </section>
      <section class="card auth-card">
        <h2>Welcome back</h2>
        <p class="muted">Sign in to track your productivity journey</p>
        <div id="googleSignIn" class="google-slot"></div>
        ${state.error ? `<div class="notice">${escapeHtml(state.error)}</div>` : ""}
        ${state.config.googleClientId ? "" : `<div class="notice">Google sign-in needs GOOGLE_CLIENT_ID in your Vercel or local environment.</div>`}
        <div class="auth-list">
          <div>${icon("trend")} <span>Track events and activities</span></div>
          <div>${icon("brain")} <span>AI-powered productivity insights</span></div>
          <div>${icon("clock")} <span>Chrome extension for time tracking</span></div>
        </div>
      </section>
      <p class="auth-terms">By signing in, you agree to our Terms of Service and Privacy Policy</p>
    </main>`;
}

function dashboardLayout() {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">${logo()} <span>TimeLoop</span></div>
        <nav class="nav">
          ${navButton("events", "calendar", "Events")}
          ${navButton("setup", "grid", "Extension Setup")}
          ${navButton("activity", "grid", "Browser Activity")}
          ${navButton("analytics", "trend", "Analytics")}
          ${navButton("ai", "brain", "AI Insights")}
        </nav>
        <div class="account">
          <div class="profile">
            <div class="avatar">${escapeHtml((state.user.name || "T")[0])}</div>
            <div><strong>${escapeHtml(state.user.name)}</strong><span>${escapeHtml(state.user.email || state.user.id)}</span></div>
          </div>
          <button class="btn ghost" data-action="sign-out">${icon("signout")} Sign Out</button>
        </div>
      </aside>
      <main class="main">
        ${state.error ? `<div class="page notice">${escapeHtml(state.error)}</div>` : ""}
        ${pageContent()}
      </main>
    </div>
    `;
}

function navButton(page, ico, label) {
  return `<button class="${state.page === page ? "active" : ""}" data-page="${page}">${icon(ico)} ${label}</button>`;
}

function pageContent() {
  if (!state.dashboard) return `<div class="page">Loading...</div>`;
  return {
    events: eventsPage,
    setup: setupPage,
    activity: activityPage,
    analytics: analyticsPage,
    ai: aiPage
  }[state.page]();
}

function eventsPage() {
  const events = filteredEvents();
  const groups = groupEvents(events);
  return `
    <section class="page">
      <div class="page-head">
        <h1 class="title">Events Timeline</h1>
        <button class="btn dark" data-action="new-event">${icon("plus")} Add Event</button>
      </div>
      <div class="timeline-filters">
        <input class="input" data-filter="q" value="${escapeHtml(state.filters.q)}" placeholder="Search events by title, content, or tags..." />
        <input class="input" type="date" data-filter="start" value="${escapeHtml(state.filters.start)}" />
        <input class="input" type="date" data-filter="end" value="${escapeHtml(state.filters.end)}" />
        <button class="btn ghost" data-action="clear-filters">Refresh</button>
      </div>
      ${state.editingEvent ? inlineEventForm() : ""}
      <div class="grid">
        ${groups.length ? groups.map(group => `
          <div class="timeline-day">
            <div class="date-bubble">${new Date(group.date).getDate()}</div>
            <div>
              <h2>${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(group.date))}</h2>
              <p class="muted">${group.items.length} event${group.items.length === 1 ? "" : "s"}</p>
              ${group.items.map(event => eventCard(event)).join("")}
            </div>
          </div>`).join("") : `<div class="card panel"><h3>No events yet</h3><p class="muted">Add an event to start building your timeline.</p></div>`}
      </div>
    </section>`;
}

function inlineEventForm() {
  const e = state.editingEvent;
  const title = e.id ? "Edit Event" : "Add New Event";
  return `
    <form class="card panel event-form" id="eventForm">
      <h3>${title}</h3>
      <label>Title *</label>
      <input class="input" name="title" placeholder="e.g., Team meeting, Coding session" required value="${escapeHtml(e.title || "")}" />
      <label>Description</label>
      <textarea name="content" placeholder="Add details about this event...">${escapeHtml(e.content || "")}</textarea>
      <label>Date & Time *</label>
      <input class="input" name="startedAt" type="datetime-local" value="${dateInputValue(e.startedAt || new Date().toISOString())}" required />
      <label>Duration (hours)</label>
      <input class="input" name="durationHours" type="number" min="0.05" step="0.05" value="${escapeHtml(((e.durationMinutes || 60) / 60).toString())}" />
      <label>Tags</label>
      <div class="tag-entry">
        <input class="input" id="tagDraft" placeholder="Add tag (e.g., coding, meeting)" value="${escapeHtml(state.tagDraft)}" />
        <button class="btn ghost" type="button" data-action="add-tag">${icon("plus")}</button>
      </div>
      <div class="tag-list">${(e.tags || []).map(t => `<button class="badge tag-pill" type="button" data-action="remove-tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)} x</button>`).join("")}</div>
      <div class="event-form-actions">
        <button class="btn dark" type="submit">${e.id ? "Save Event" : "Add Event"}</button>
        <button class="btn ghost" type="button" data-action="close-modal">Cancel</button>
      </div>
    </form>`;
}

function filteredEvents() {
  const q = state.filters.q.toLowerCase();
  return state.dashboard.events.filter(event => {
    const blob = [event.title, event.content, ...(event.tags || [])].join(" ").toLowerCase();
    const date = (event.startedAt || "").slice(0, 10);
    return (!q || blob.includes(q)) && (!state.filters.start || date >= state.filters.start) && (!state.filters.end || date <= state.filters.end);
  });
}

function groupEvents(events) {
  const map = new Map();
  for (const event of events) {
    const key = (event.startedAt || new Date().toISOString()).slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(event);
  }
  return [...map.entries()].map(([date, items]) => ({ date, items })).sort((a, b) => b.date.localeCompare(a.date));
}

function eventCard(event) {
  return `
    <article class="card event-card">
      <div class="page-head">
        <div>
          <h3>${escapeHtml(event.title)}</h3>
          <p class="muted">${icon("clock")} ${fmtDate(event.startedAt)} - ${fmtTime(event.startedAt)} <strong style="color:var(--violet)">${Math.round((event.durationMinutes || 0) / 60) || event.durationMinutes / 60}h</strong></p>
          <p>${escapeHtml(event.content || "")}</p>
          ${(event.tags || []).map(t => `<span class="badge">${escapeHtml(t)}</span>`).join(" ")}
        </div>
        <div class="event-actions">
          <button class="icon-btn" title="Edit" data-action="edit-event" data-id="${event.id}">${icon("edit")}</button>
          <button class="icon-btn danger" title="Delete" data-action="delete-event" data-id="${event.id}">${icon("trash")}</button>
        </div>
      </div>
    </article>`;
}

function setupPage() {
  return `
    <section class="page grid">
      <div class="setup-title">
        <span class="logo">${icon("chrome")}</span>
        <div><h1 class="title">Chrome Extension Setup</h1><p class="muted">Connect your browser tracking to this account</p></div>
      </div>
      <div class="setup-step">
        <div class="step-title"><span class="step-num">1</span> Download Extension</div>
        <p class="muted">Download the TimeLoop Chrome extension to your computer</p>
        <a class="btn primary" href="${EXTENSION_ZIP}" download>${icon("download")} Download Extension</a>
      </div>
      <div class="setup-step green">
        <div class="step-title"><span class="step-num">2</span><span>Your User ID<br><small class="muted">Copy this ID and paste it in the Chrome extension</small></span></div>
        <div class="copy-box">
          <div><span class="muted">Your User ID:</span><div class="user-id">${escapeHtml(state.user.id)}</div></div>
          <button class="btn ghost" data-action="copy-user">${icon("copy")} Copy</button>
        </div>
        <div class="notice"><strong>Important:</strong> This ID connects the extension to YOUR account. Keep it safe and don't share it.</div>
      </div>
      <div class="setup-step purple">
        <div class="step-title"><span class="step-num">3</span> Configure Extension</div>
        <div class="letter-list">
          <div><b>a.</b><span><strong>Install the extension in Chrome</strong><br><span class="muted">Extract ZIP -> chrome://extensions/ -> Load unpacked</span></span></div>
          <div><b>b.</b><span><strong>Click the TimeLoop icon in Chrome toolbar</strong><br><span class="muted">Look for the TimeLoop icon next to your profile picture</span></span></div>
          <div><b>c.</b><span><strong>Paste your User ID</strong><br><span class="muted">Enter it in the "Your User ID" field</span></span></div>
          <div><b>d.</b><span><strong>Click "Save Configuration"</strong><br><span class="muted">You should see "Configured" in the Debug tab</span></span></div>
        </div>
      </div>
      <div class="setup-step">
        <div class="step-title"><span class="step-num">4</span> Test & Verify</div>
        <ol class="letter-list">
          <li>Browse to YouTube or any website for 15 seconds</li>
          <li>Switch to a different tab to trigger a save</li>
          <li>Click extension icon -> check History tab</li>
          <li>Click "Sync Now" button in extension</li>
          <li>Come back here and check Browser Activity tab</li>
        </ol>
      </div>
      <div class="card panel">
        <h3>Quick Access</h3>
        <div class="actions">
          <a class="btn ghost" href="${EXTENSION_ZIP}" download>${icon("download")} Download Extension</a>
          <button class="btn ghost" data-action="copy-user">${icon("copy")} Copy My User ID</button>
        </div>
      </div>
    </section>`;
}

function activityPage() {
  const d = state.dashboard;
  const max = Math.max(...d.sites.map(s => s.totalSeconds), 1);
  const recent = d.browserActivity.slice(0, 10);
  return `
    <section class="page grid">
      <div class="page-head">
        <h1 class="title">Browser Activity</h1>
        <div class="actions">
          <button class="btn ghost" data-action="add-test">Add Test Data</button>
          <button class="btn ghost" data-action="refresh">Refresh</button>
        </div>
      </div>
      <div class="stats">
        ${stat("globe", "", "Websites Visited", d.stats.websitesVisited)}
        ${stat("clock", "green", "Total Hours", hoursFromSeconds(d.stats.totalBrowserSeconds))}
        ${stat("trend", "", "Today's Hours", hoursFromSeconds(d.stats.todayBrowserSeconds))}
      </div>
      <div class="card panel">
        <h3>Websites by Time Spent</h3>
        ${d.sites.length ? d.sites.map(site => `
          <div class="activity-row">
            <div class="iconbox">${icon("globe")}</div>
            <div><strong>${escapeHtml(site.hostname)}</strong><div class="muted">${site.visits} visits</div><div class="bar"><span style="width:${Math.max(4, site.totalSeconds / max * 100)}%"></span></div></div>
            <div style="text-align:right"><strong style="color:var(--violet)">${minutes(site.totalSeconds)}</strong><div class="muted">${Math.round(site.totalSeconds / Math.max(d.stats.totalBrowserSeconds, 1) * 100)}%</div></div>
          </div>`).join("") : `<p class="muted">No extension activity yet. Use Add Test Data or sync the Chrome extension.</p>`}
      </div>
      <div class="card panel">
        <h3>Recent Activity Log</h3>
        ${recent.map(row => `<div class="row-card"><div>${icon("calendar")} <strong>${escapeHtml(row.hostname)}</strong><br><span class="muted">${fmtDate(row.startedAt)} - ${fmtTime(row.startedAt)}</span></div><strong style="color:var(--violet)">${minutes(row.durationSeconds)}</strong></div>`).join("") || `<p class="muted">Nothing synced yet.</p>`}
      </div>
    </section>`;
}

function analyticsPage() {
  const d = state.dashboard;
  return `
    <section class="page grid">
      <div class="page-head">
        <h1 class="title">Analytics</h1>
        <div class="actions"><button class="btn dark">Daily</button><button class="btn ghost">Weekly</button></div>
      </div>
      <div class="stats four">
        ${stat("calendar", "", "Total Events", d.stats.totalEvents, `${d.stats.currentEvents} current, ${d.stats.upcomingEvents} upcoming`)}
        ${stat("clock", "", "Total Hours (Events)", `${d.stats.totalEventHours.toFixed(1).replace(".0", "")}h`)}
        ${stat("trend", "pink", "Browser Time", hoursFromSeconds(d.stats.totalBrowserSeconds))}
        ${stat("calendar", "green", "Upcoming Events", d.stats.upcomingEvents)}
      </div>
      <div class="two-col">
        <div class="card panel chart-wrap"><h3>Time by Activity</h3><canvas id="barChart" width="620" height="360"></canvas></div>
        <div class="card panel chart-wrap"><h3>Top Websites</h3><canvas id="pieChart" width="620" height="360"></canvas></div>
      </div>
    </section>`;
}

function stat(ico, tone, label, number, sub = "") {
  return `<article class="card stat"><div class="iconbox ${tone}">${icon(ico)}</div><div><span class="muted">${label}</span><span class="num">${number}</span>${sub ? `<span class="muted">${sub}</span>` : ""}</div></article>`;
}

function drawAnalytics() {
  const events = state.dashboard.events;
  const total = events.reduce((sum, event) => sum + Number(event.durationMinutes || 0), 0) || 60;
  const bar = document.getElementById("barChart");
  const pie = document.getElementById("pieChart");
  if (bar) {
    const ctx = bar.getContext("2d");
    ctx.clearRect(0, 0, bar.width, bar.height);
    ctx.strokeStyle = "#cbd5e1";
    ctx.fillStyle = "#64748b";
    ctx.font = "18px Inter, sans-serif";
    for (let i = 0; i <= 4; i++) {
      const y = 300 - i * 70;
      ctx.beginPath();
      ctx.moveTo(70, y);
      ctx.lineTo(570, y);
      ctx.stroke();
      ctx.fillText(String(i / 4), 24, y + 6);
    }
    ctx.fillStyle = "#625df5";
    ctx.fillRect(130, Math.max(30, 300 - Math.min(1, total / 60) * 280), 380, Math.min(280, total / 60 * 280));
    ctx.fillStyle = "#64748b";
    ctx.fillText("Uncategorized", 260, 335);
  }
  if (pie) {
    const ctx = pie.getContext("2d");
    ctx.clearRect(0, 0, pie.width, pie.height);
    const sites = state.dashboard.sites.slice(0, 6);
    const sum = sites.reduce((s, x) => s + x.totalSeconds, 0) || 1;
    const colors = ["#625df5", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
    let start = -Math.PI / 2;
    sites.forEach((site, idx) => {
      const slice = (site.totalSeconds / sum) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(310, 190);
      ctx.arc(310, 190, 100, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = colors[idx];
      ctx.fill();
      start += slice;
    });
    ctx.font = "18px Inter, sans-serif";
    sites.forEach((site, idx) => {
      ctx.fillStyle = colors[idx];
      const x = idx < 3 ? 420 : 80;
      const y = 120 + idx * 42;
      ctx.fillText(`${site.hostname} (${Math.round(site.totalSeconds / sum * 100)}%)`, x, y);
    });
  }
}

function aiPage() {
  const prompts = ["How productive was I today?", "What patterns do you see in my work?", "Give me tips to improve focus", "What should I focus on this week?"];
  return `
    <section class="page grid">
      <div class="card panel ai-header">
        <div style="display:flex;gap:16px;align-items:center"><div class="iconbox">${icon("brain")}</div><div><h3 style="margin:0">AI Productivity Coach</h3><p class="muted" style="margin:4px 0 0">Ask me anything about your productivity and tracked activities</p></div></div>
        <div style="color:#b875ff">${icon("spark")}</div>
      </div>
      <div class="card chatbox">
        <div class="panel messages" id="messages">
          ${state.chat.map(msg => `<div class="message ${msg.role === "user" ? "user" : ""}">${msg.role === "user" ? "" : `<div class="iconbox">${icon("calendar")}</div>`}<div class="bubble">${escapeHtml(msg.text)}</div>${msg.role === "user" ? `<div class="avatar">${escapeHtml((state.user.name || "T")[0])}</div>` : ""}</div>`).join("")}
        </div>
      </div>
      <div class="prompts">${prompts.map(p => `<button class="btn ghost prompt" data-ai="${escapeHtml(p)}">${p}</button>`).join("")}</div>
      <div class="card chat-input">
        <input class="input" id="chatInput" placeholder="Ask about your productivity... (e.g., 'How was my week?')" />
        <button class="btn primary" data-action="send-chat">${icon("send")}</button>
        <small class="muted">Tip: Press Enter to send, Shift+Enter for new line</small>
      </div>
    </section>`;
}

function bind() {
  document.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", async () => {
    state.page = btn.dataset.page;
    localStorage.setItem("timeloop:page", state.page);
    await loadDashboard();
    render();
  }));
  document.querySelectorAll("[data-action]").forEach(el => el.addEventListener("click", handleAction));
  document.querySelectorAll("[data-filter]").forEach(el => el.addEventListener("input", () => {
    state.filters[el.dataset.filter] = el.value;
    render();
  }));
  document.querySelectorAll("[data-ai]").forEach(el => el.addEventListener("click", () => sendChat(el.dataset.ai)));
  const chatInput = document.getElementById("chatInput");
  if (chatInput) chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChat(chatInput.value);
    }
  });
  const form = document.getElementById("eventForm");
  if (form) form.addEventListener("submit", saveEvent);
  const tagDraft = document.getElementById("tagDraft");
  if (tagDraft) tagDraft.addEventListener("input", () => {
    state.tagDraft = tagDraft.value;
  });
}

async function handleAction(e) {
  const action = e.currentTarget.dataset.action;
  if (action === "sign-out") {
    localStorage.removeItem("timeloop:user");
    localStorage.removeItem("timeloop:authProvider");
    state.user = null;
    state.dashboard = null;
    state.error = "";
    googleButtonRendered = false;
    render();
  }
  if (action === "copy-user") {
    await navigator.clipboard.writeText(state.user.id);
    e.currentTarget.textContent = "Copied";
  }
  if (action === "new-event") {
    state.tagDraft = "";
    state.editingEvent = { startedAt: new Date().toISOString(), durationMinutes: 60, tags: [] };
    render();
  }
  if (action === "edit-event") {
    state.tagDraft = "";
    state.editingEvent = state.dashboard.events.find(x => x.id === e.currentTarget.dataset.id);
    render();
  }
  if (action === "delete-event") {
    await api(`/api/events/${e.currentTarget.dataset.id}`, { method: "DELETE" });
    await loadDashboard();
    render();
  }
  if (action === "close-modal") {
    state.editingEvent = null;
    state.tagDraft = "";
    render();
  }
  if (action === "add-tag") {
    const value = state.tagDraft.trim();
    if (value && state.editingEvent) {
      state.editingEvent.tags = [...new Set([...(state.editingEvent.tags || []), value])];
      state.tagDraft = "";
      render();
    }
  }
  if (action === "remove-tag") {
    const tag = e.currentTarget.dataset.tag;
    state.editingEvent.tags = (state.editingEvent.tags || []).filter(t => t !== tag);
    render();
  }
  if (action === "refresh") {
    await safeRefresh();
  }
  if (action === "add-test") {
    await api("/api/activity/test", { method: "POST", body: JSON.stringify({ userId: state.user.id }) });
    await safeRefresh();
  }
  if (action === "clear-filters") {
    state.filters = { q: "", start: "", end: "" };
    await safeRefresh();
  }
  if (action === "send-chat") {
    sendChat(document.getElementById("chatInput")?.value || "");
  }
}

async function safeRefresh() {
  try {
    state.error = "";
    await loadDashboard();
  } catch (error) {
    state.error = error.message;
  }
  render();
}

async function saveEvent(e) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const payload = {
    userId: state.user.id,
    title: fd.get("title"),
    content: fd.get("content"),
    tags: state.editingEvent.tags || [],
    startedAt: new Date(fd.get("startedAt")).toISOString(),
    durationMinutes: Math.round(Number(fd.get("durationHours") || 1) * 60)
  };
  if (state.editingEvent.id) {
    await api(`/api/events/${state.editingEvent.id}`, { method: "PUT", body: JSON.stringify(payload) });
  } else {
    await api("/api/events", { method: "POST", body: JSON.stringify(payload) });
  }
  state.editingEvent = null;
  state.tagDraft = "";
  await loadDashboard();
  render();
}

async function sendChat(text) {
  const question = String(text || "").trim();
  if (!question) return;
  state.chat.push({ role: "user", text: question }, { role: "assistant", text: "Thinking..." });
  render();
  const pending = state.chat.length - 1;
  try {
    const { answer, provider } = await api("/api/ai/insights", { method: "POST", body: JSON.stringify({ userId: state.user.id, question }) });
    state.chat[pending].text = provider === "openai" ? answer : `${answer}\n\n(OpenAI is not configured or was unavailable, so I used local analysis.)`;
  } catch (error) {
    state.chat[pending].text = `I hit a snag: ${error.message}`;
  }
  render();
}

function scrollChat() {
  const el = document.getElementById("messages");
  if (el) el.scrollTop = el.scrollHeight;
}
