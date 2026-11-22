// Netlify Function: /.netlify/functions/gojobot
// Needs ONE environment variable in Netlify: GEMINI_API_KEY
// Optional: GEMINI_MODEL (default gemini-2.5-flash)

const FIREBASE_API_KEY = "AIzaSyCogkwPWSc9oVV7vqEjlrD9bbxHIbNlqQU"; // public web key from index.html
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const GENERAL_PROMPT =
  "You are Gojobot, the friendly assistant for M.TECH, a technology company offering 3D and 2D animation, " +
  "software development, web design and device manufacturing. Answer questions about M.TECH's services, " +
  "ordering and projects clearly and briefly. If you don't know a company detail (prices, deadlines), say so " +
  "and suggest the person uses the contact form on the site. Never invent prices or promises.";

const CODING_PROMPT =
  "You are Gojobot in CODING MODE, a patient programming helper (especially Java and IntelliJ IDEA). " +
  "Explain errors in plain language, give the cause first, then a short fix with a code block, then one tip. " +
  "Keep answers focused and correct.";

function looksLikeCoding(t) {
  return /(```|exception|stack ?trace|compile|syntax|\berror\b|\bbug\b|java|intellij|javascript|python|html|css|\bcode\b|function|class |public static|npm|git |sql|null ?pointer|import )/i.test(t);
}

// Very simple per-user rate limit (resets when the function instance restarts)
const hits = new Map();
function tooFast(uid) {
  const now = Date.now(), windowMs = 5 * 60 * 1000, max = 30;
  const arr = (hits.get(uid) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(uid, arr);
  return arr.length > max;
}

const json = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

async function verifyUser(token) {
  const r = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: token }) }
  );
  if (!r.ok) return null;
  const data = await r.json();
  const u = data.users && data.users[0];
  if (!u || !u.emailVerified) return null;
  return u.localId;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "ai_failed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: "not_configured" });

  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json(401, { error: "sign_in" });

  let uid;
  try { uid = await verifyUser(token); } catch (e) { uid = null; }
  if (!uid) return json(401, { error: "sign_in" });
  if (tooFast(uid)) return json(429, { error: "slow_down" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { body = {}; }
  const message = String(body.message || "").trim().slice(0, 4000);
  if (!message) return json(400, { error: "empty" });

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const coding = looksLikeCoding(message);

  const contents = history
    .filter(h => h && typeof h.text === "string" && h.text)
    .map(h => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.text.slice(0, 4000) }] }));
  contents.push({ role: "user", parts: [{ text: message }] });

  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: coding ? CODING_PROMPT : GENERAL_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 1500, temperature: coding ? 0.3 : 0.7 },
        }),
      }
    );
    if (r.status === 429 || r.status === 503) return json(503, { error: "busy" });
    if (!r.ok) return json(502, { error: "ai_failed" });
    const data = await r.json();
    const reply = (((data.candidates || [])[0] || {}).content || {}).parts;
    const text = reply ? reply.map(p => p.text || "").join("").trim() : "";
    if (!text) return json(502, { error: "ai_failed" });
    return json(200, { reply: text, mode: coding ? "coding" : "general" });
  } catch (e) {
    return json(502, { error: "ai_failed" });
  }
};
