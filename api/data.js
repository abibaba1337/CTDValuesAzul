// Публичный: отдаёт сохранённые правки всем посетителям сайта
const { redis } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const out = await redis([["GET", "azul:data"]]);
    let data = {};
    try { data = JSON.parse(out[0].result || "{}"); } catch (e) {}
    res.status(200).json(data);
  } catch (e) {
    // Если база не подключена, сайт всё равно работает на стандартных значениях
    res.status(200).json({});
  }
};
