const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindTabs();
  $("#save").addEventListener("click", save);
  $("#sync").addEventListener("click", sync);
  await refresh();
}

function bindTabs() {
  $$("nav button").forEach(button => {
    button.addEventListener("click", () => {
      $$("nav button").forEach(b => b.classList.toggle("active", b === button));
      $$(".tab").forEach(tab => tab.classList.toggle("hidden", tab.id !== button.dataset.tab));
    });
  });
}

async function refresh() {
  const state = await chrome.runtime.sendMessage({ type: "get-state" });
  $("#apiBase").value = state.apiBase || "http://localhost:3000";
  $("#userId").value = state.userId || "";
  $("#status").textContent = state.userId ? "Configured" : "Not configured";
  $("#summary").innerHTML = `<p><strong>${state.pending.length}</strong> unsynced records</p>${state.lastSync ? `<p class="muted">Last sync: ${new Date(state.lastSync).toLocaleString()}</p>` : ""}`;
  $("#historyList").innerHTML = (state.history || []).map(row => `
    <div class="row">
      <strong>${escapeHtml(row.hostname)}</strong>
      <span class="muted">${Math.max(1, Math.round(row.durationSeconds / 60))}m • ${new Date(row.startedAt).toLocaleString()}</span>
    </div>`).join("") || `<p class="muted">No tracked history yet. Browse a site for at least 5 seconds, then switch tabs.</p>`;
  $("#debug").textContent = JSON.stringify(state, null, 2);
}

async function save() {
  const apiBase = $("#apiBase").value.trim().replace(/\/$/, "") || "http://localhost:3000";
  const userId = $("#userId").value.trim();
  if (!userId) {
    showMessage("Paste your User ID first.");
    return;
  }
  await chrome.storage.local.set({
    apiBase,
    userId
  });
  try {
    const response = await fetch(`${apiBase}/api/extension/ping`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    showMessage("Configuration saved and TimeLoop API reached.");
  } catch (error) {
    showMessage(`Saved, but API check failed: ${error.message}`);
  }
  await refresh();
}

async function sync() {
  $("#sync").textContent = "Syncing...";
  const result = await chrome.runtime.sendMessage({ type: "sync-now" });
  $("#sync").textContent = result.ok ? "Synced" : "Sync Failed";
  showMessage(result.message || (result.ok ? "Synced." : "Sync failed."));
  setTimeout(() => { $("#sync").textContent = "Sync Now"; }, 1400);
  await refresh();
}

function showMessage(text) {
  $("#message").textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}
