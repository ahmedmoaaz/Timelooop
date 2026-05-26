const DEFAULT_API = "http://localhost:3000";
let active = null;
let idleState = "active";

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["apiBase", "pending"]);
  if (!stored.apiBase) await chrome.storage.local.set({ apiBase: DEFAULT_API });
  chrome.alarms.create("timeloop-sync", { periodInMinutes: 3 });
  captureActiveTab();
});

chrome.tabs.onActivated.addListener(() => switchTab());
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id === tabId) switchTab();
    });
  }
});
chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) finishActive();
  else captureActiveTab();
});
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(state => {
  idleState = state;
  if (state === "active") captureActiveTab();
  else finishActive();
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "timeloop-sync") syncPending();
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "sync-now") {
    syncPending().then(result => sendResponse(result));
    return true;
  }
  if (message.type === "get-state") {
    getState().then(sendResponse);
    return true;
  }
});

function switchTab() {
  finishActive().finally(captureActiveTab);
}

async function captureActiveTab() {
  if (idleState !== "active") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !isTrackable(tab.url)) {
    active = null;
    return;
  }
  active = {
    url: tab.url,
    title: tab.title || "",
    hostname: new URL(tab.url).hostname,
    startedAt: new Date().toISOString(),
    startedMs: Date.now()
  };
}

async function finishActive() {
  if (!active) return;
  const durationSeconds = Math.round((Date.now() - active.startedMs) / 1000);
  if (durationSeconds >= 5) {
    const record = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      url: active.url,
      title: active.title,
      hostname: active.hostname,
      startedAt: active.startedAt,
      endedAt: new Date().toISOString(),
      durationSeconds,
      visits: 1
    };
    const { pending = [], history = [] } = await chrome.storage.local.get(["pending", "history"]);
    pending.push(record);
    history.unshift(record);
    await chrome.storage.local.set({ pending: pending.slice(-200), history: history.slice(0, 50) });
  }
  active = null;
}

async function syncPending() {
  await finishActive();
  const { apiBase = DEFAULT_API, userId, pending = [] } = await chrome.storage.local.get(["apiBase", "userId", "pending"]);
  if (!userId) return { ok: false, message: "Missing User ID" };
  if (!pending.length) return { ok: true, message: "Nothing to sync", saved: 0 };
  try {
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/extension/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-timeloop-user-id": userId
      },
      body: JSON.stringify({ userId, records: pending })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    await chrome.storage.local.set({ pending: [], lastSync: new Date().toISOString() });
    captureActiveTab();
    return { ok: true, message: `Synced ${json.saved || pending.length} records`, saved: json.saved || pending.length };
  } catch (error) {
    captureActiveTab();
    return { ok: false, message: error.message };
  }
}

async function getState() {
  await finishActive();
  const data = await chrome.storage.local.get(["apiBase", "userId", "pending", "history", "lastSync"]);
  captureActiveTab();
  return {
    apiBase: data.apiBase || DEFAULT_API,
    userId: data.userId || "",
    pending: data.pending || [],
    history: data.history || [],
    lastSync: data.lastSync || ""
  };
}

function isTrackable(url) {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}
