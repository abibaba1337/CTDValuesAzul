// Проверка пароля администратора (чтобы показать кнопку «Править»)
const { requireAdmin } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    if (!(await requireAdmin(req, res))) return;
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "server error" });
  }
};
