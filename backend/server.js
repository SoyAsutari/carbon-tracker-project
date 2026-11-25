const express = require("express");
const cors    = require("cors");
const crypto  = require("crypto");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10kb" }));

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});

/* ---------- In-memory "database" ---------- */
// We are simulating the emission_logs table from your Task 1
let logs = [
  {
    log_id: "log-1",
    user_id: 1,
    activity_id: 2,
    value: 15.5,
    emission_estimate: 4.65,
    log_date: "2026-11-25",
    notes: "Drove to campus",
    createdAt: new Date().toISOString(),
  },
];

/* ---------- Validation helpers ---------- */

/**
 * Validates a POST /logs request body based on your Task 1 Data Model.
 */
function validateLogInput(body) {
  const errors = [];
  
  const user_id = parseInt(body.user_id);
  const activity_id = parseInt(body.activity_id);
  const value = parseFloat(body.value);
  const log_date = body.log_date ?? null;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  // --- user_id ---
  if (!user_id || isNaN(user_id)) {
    errors.push({ field: "user_id", message: "Valid User ID is required." });
  }

  // --- activity_id ---
  if (!activity_id || isNaN(activity_id)) {
    errors.push({ field: "activity_id", message: "Valid Activity ID is required." });
  }

  // --- value (e.g., distance in km or hours used) ---
  if (isNaN(value) || value <= 0) {
    errors.push({ field: "value", message: "Value must be a positive number." });
  }

  // --- log_date ---
  if (!log_date) {
    errors.push({ field: "log_date", message: "Log date is required." });
  } else {
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDate.test(log_date)) {
      errors.push({ field: "log_date", message: "Date must be in YYYY-MM-DD format." });
    }
  }

  if (errors.length) return { valid: false, errors };

  // Simulating the emission_estimate calculation (value * emission_factor)
  // Hardcoded factor of 0.3 for demonstration
  const emission_estimate = value * 0.3; 

  return {
    valid: true,
    data: { 
      user_id, 
      activity_id, 
      value, 
      emission_estimate, 
      log_date, 
      notes 
    },
  };
}

/* ---------- Routes ---------- */

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", logs: logs.length });
});

// GET /logs
app.get("/logs", (req, res) => {
  res.status(200).json({
    count: logs.length,
    logs: logs,
  });
});

// POST /logs
app.post("/logs", (req, res) => {
  const { valid, data, errors } = validateLogInput(req.body || {});

  if (!valid) {
    return res.status(400).json({
      error: "Validation failed.",
      details: errors,
    });
  }

  const newLog = {
    log_id: `log-${crypto.randomUUID()}`,
    ...data,
    createdAt: new Date().toISOString(),
  };

  logs.push(newLog);

  res.status(201).location(`/logs/${newLog.log_id}`).json(newLog);
});

// DELETE /logs/:id
app.delete("/logs/:id", (req, res) => {
  const index = logs.findIndex(l => l.log_id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: `Log '${req.params.id}' not found.` });
  }
  logs.splice(index, 1);
  res.status(204).send();
});

// Error handler
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON." });
  }
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});