/**
 * slack-notify.js — Forward important notifications to Slack
 * 
 * Configurable via SLACK_WEBHOOK_URL env var.
 * Anti-spam: max 1 message per type+ticket per 10 minutes.
 */

const recentSlack = new Map(); // key -> timestamp
const COOLDOWN_MS = 10 * 60 * 1000; // 10 min

const FORWARD_TYPES = ["READY_FOR_QA", "QA_PASS", "QA_FAIL", "BLOCKED", "ERROR"];

const TYPE_EMOJI = {
  READY_FOR_QA: "📋",
  QA_PASS: "✅",
  QA_FAIL: "❌",
  BLOCKED: "🚫",
  ERROR: "⚠️",
};

/**
 * Forward a notification to Slack if configured and not spam.
 * @param {{ type: string, message: string, agent?: string, ticketId?: number, identifier?: string }} notif
 */
async function forwardToSlack(notif) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return; // Not configured — skip silently

  if (!FORWARD_TYPES.includes(notif.type)) return;

  // Anti-spam check
  const key = `${notif.type}:${notif.ticketId || notif.identifier || "?"}`;
  const lastSent = recentSlack.get(key) || 0;
  if (Date.now() - lastSent < COOLDOWN_MS) return;

  const emoji = TYPE_EMOJI[notif.type] || "📌";
  const text = `${emoji} *[${notif.type}]* ${notif.message}${notif.agent ? ` — _${notif.agent}_` : ""}`;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    recentSlack.set(key, Date.now());
  } catch (err) {
    console.error("[slack-notify] Failed to send:", err.message);
  }

  // Cleanup old entries (>1h)
  const cutoff = Date.now() - 3600000;
  for (const [k, t] of recentSlack) {
    if (t < cutoff) recentSlack.delete(k);
  }
}

module.exports = { forwardToSlack };
