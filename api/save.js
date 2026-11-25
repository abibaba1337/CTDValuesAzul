// Сохранение правок. Работает только с правильным паролем администратора.
const { redis, requireAdmin, clean } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    if (!(await requireAdmin(req, res))) return;
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
    const data = clean(body);
    if (!data) return res.status(400).json({ error: "bad data" });
    await redis([["SET", "azul:data", JSON.stringify(data)]]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "server error" });
  }
};
