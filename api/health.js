const { initDb, getDatabaseUrl } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    await initDb();
    res.end(JSON.stringify({ ok: true, database: !!getDatabaseUrl(), message: 'Neon conectado e tabelas prontas.' }));
  } catch (e) {
    console.error('HEALTH ERROR:', e);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, database: !!getDatabaseUrl(), error: e.message }));
  }
};
