const API_BASE = "http://localhost:3000";

const form       = document.getElementById("log-form");
const feedback   = document.getElementById("feedback");
const submitBtn  = document.getElementById("submit-btn");
const refreshBtn = document.getElementById("refresh-btn");
const loading    = document.getElementById("loading");
const emptyState = document.getElementById("empty-state");
const table      = document.getElementById("task-table"); // Keeping ID same to avoid CSS changes
const tbody      = document.getElementById("task-body");

function showFeedback(message, type = "success") {
  feedback.textContent = message;
  feedback.className = `feedback show ${type}`;
  if (type === "success") {
    setTimeout(() => feedback.classList.remove("show"), 3000);
  }
}

function clearErrors() {
  document.querySelectorAll(".error").forEach(el => (el.textContent = ""));
  document.querySelectorAll(".field input, .field select")
          .forEach(el => el.classList.remove("invalid"));
}

function setFieldError(name, message) {
  const el = document.querySelector(`.error[data-for="${name}"]`);
  const input = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
  if (el) el.textContent = message;
  if (input) input.classList.add("invalid");
}

function validateForm() {
  clearErrors();
  const activity_id = document.getElementById("activity").value;
  const value       = document.getElementById("value").value;
  const log_date    = document.getElementById("log_date").value;
  const notes       = document.getElementById("notes").value;
  const user_id     = 1; // Hardcoded for now

  let ok = true;

  if (!activity_id) { setFieldError("activity_id", "Please select an activity."); ok = false; }
  if (!value || value <= 0) { setFieldError("value", "Please enter a valid amount greater than 0."); ok = false; }
  if (!log_date) { setFieldError("log_date", "Date is required."); ok = false; }

  return ok ? { user_id, activity_id, value, log_date, notes } : null;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function renderLogs(logs) {
  tbody.innerHTML = "";

  if (!logs.length) {
    table.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  table.classList.remove("hidden");

  for (const l of logs) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Date">${escapeHtml(l.log_date)}</td>
      <td data-label="Activity ID">${l.activity_id}</td>
      <td data-label="Amount">${l.value}</td>
      <td data-label="Emissions"><strong>${l.emission_estimate.toFixed(2)} kg</strong></td>
      <td data-label="Notes">${escapeHtml(l.notes) || "—"}</td>
      <td data-label="Action">
        <button class="btn btn-danger" data-id="${l.log_id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".btn-danger").forEach(btn => {
    btn.addEventListener("click", () => deleteLog(btn.dataset.id, btn));
  });
}

async function loadLogs() {
  loading.classList.remove("hidden");
  table.classList.add("hidden");
  emptyState.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/logs`); // Changed to /logs
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    renderLogs(data.logs || []);
  } catch (err) {
    console.error(err);
    showFeedback("Could not load logs. Please check your connection.", "error");
    emptyState.textContent = "Unable to load logs.";
    emptyState.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
}

async function createLog(payload) {
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    const res = await fetch(`${API_BASE}/logs`, { // Changed to /logs
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let serverMsg = `Could not log activity (HTTP ${res.status}).`;
      try {
        const errBody = await res.json();
        if (errBody && errBody.error) serverMsg = errBody.error;
      } catch { }
      throw new Error(serverMsg);
    }

    showFeedback("Activity logged successfully!", "success");
    form.reset();
    await loadLogs();
  } catch (err) {
    showFeedback(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Log Activity";
  }
}

async function deleteLog(id, btn) {
  if (!confirm("Delete this log entry?")) return;
  btn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/logs/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status}).`);
    showFeedback("Log deleted.", "success");
    await loadLogs();
  } catch (err) {
    showFeedback(err.message, "error");
    btn.disabled = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = validateForm();
  if (!payload) {
    showFeedback("Please fix the highlighted fields.", "error");
    return;
  }
  createLog(payload);
});

refreshBtn.addEventListener("click", loadLogs);
document.addEventListener("DOMContentLoaded", loadLogs);