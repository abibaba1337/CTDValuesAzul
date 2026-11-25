// Диагностика: открой /api/status, чтобы проверить настройку. Секреты не показывает.
const { redis } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const status = { adminPasswordSet: !!process.env.ADMIN_PASSWORD, redis: "unknown" };
  try { await redis([["PING"]]); status.redis = "ok"; }
  catch (e) { status.redis = e.message === "redis_env_missing" ? "not connected (no env vars)" : "error"; }
  res.status(200).json(status);
};
