const crypto = require("crypto");

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Список допустимых значений Stability (должен совпадать с index.html)
const STAB = ["Stable", "Underpaid", "Fluctuating", "Manipulated", "Overpaid", "Overpaid For",
  "Slowly dropping", "Unstable", "Dropping", "Unwanted", "Stable/Fluctuating", "Stable/Unwanted"];

// Выполняет список команд Redis одним запросом (Upstash REST pipeline)
async function redis(commands) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("redis_env_missing");
  const r = await fetch(REDIS_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + REDIS_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error("redis_http_" + r.status);
  return r.json();
}

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Проверка пароля администратора + ограничение 10 попыток в минуту с одного IP.
// Возвращает true, если можно продолжать; иначе сама отправляет ответ.
async function requireAdmin(req, res) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) { res.status(503).json({ error: "ADMIN_PASSWORD is not set" }); return false; }
  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const key = "azul:rl:" + ip;
  const out = await redis([["INCR", key], ["EXPIRE", key, 60]]);
  if (Number(out[0].result) > 10) { res.status(429).json({ error: "too many attempts" }); return false; }
  if (!safeEqual(req.headers["x-admin-password"] || "", password)) {
    res.status(401).json({ error: "wrong password" });
    return false;
  }
  return true;
}

// Проверка и очистка данных, которые прислал клиент
function clean(body) {
  if (!body || typeof body !== "object") return null;
  const out = { i: {}, g: {} };
  const bad = new Set(["__proto__", "constructor", "prototype"]);
  const items = body.i && typeof body.i === "object" ? body.i : {};
  const signs = body.g && typeof body.g === "object" ? body.g : {};
  const names = Object.keys(items);
  if (names.length > 400) return null;
  for (const name of names) {
    if (bad.has(name) || name.length > 80) continue;
    const o = items[name];
    if (!o || typeof o !== "object") continue;
    const v = Number(o.v), d = Number(o.d);
    if (!(isFinite(v) && v >= 0 && v <= 1e9)) continue;
    if (!(isFinite(d) && d >= 0 && d <= 10)) continue;
    if (!STAB.includes(o.s)) continue;
    out.i[name] = { v, d, s: o.s };
  }
  for (const id of Object.keys(signs).slice(0, 400)) {
    if (!/^s\d{2,4}$/.test(id)) continue;
    const p = Number(signs[id]);
    if (isFinite(p) && p >= 0 && p <= 10000) out.g[id] = p;
  }
  return out;
}

module.exports = { redis, requireAdmin, clean };
