const { initDb, getPool } = require('./_db');
const { setSession, clearSession, session } = require('./_auth');
const { verifyPassword } = require('./_password');
const { getBody } = require('./_body');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (req.method === 'GET') {
      const s = session(req);
      return res.end(JSON.stringify({
        ok: true,
        session: s ? { role: s.role, userId: s.userId, username: s.username } : null,
      }));
    }

    if (req.method === 'DELETE') {
      clearSession(res);
      return res.end(JSON.stringify({ ok: true }));
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      return res.end(JSON.stringify({ ok: false, error: 'Método não permitido.' }));
    }

    const { username = '', password = '' } = getBody(req);
    const u = String(username).trim();
    const p = String(password);
    const adminUser = String(process.env.ADMIN_USERNAME || 'admin').trim();
    const adminPass = String(process.env.ADMIN_PASSWORD || 'admin123');

    // Admin login is checked before touching the database. This means the admin
    // account can still enter the panel when the Neon connection itself needs fixing.
    if (u.toLowerCase() === adminUser.toLowerCase() && p === adminPass) {
      setSession(res, { role: 'admin', username: adminUser, userId: 'admin' });
      return res.end(JSON.stringify({ ok: true, role: 'admin', username: adminUser }));
    }

    await initDb();
    const db = getPool();
    const result = await db.query(
      'SELECT id, username, password_hash, status FROM members WHERE LOWER(username)=LOWER($1) LIMIT 1',
      [u]
    );

    const member = result.rows[0];
    if (!member) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ ok: false, error: 'Usuário ou senha inválidos.' }));
    }
    if (member.status === 'blocked') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ ok: false, error: 'Este acesso está bloqueado pelo administrador.' }));
    }
    if (!verifyPassword(p, member.password_hash)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ ok: false, error: 'Usuário ou senha inválidos.' }));
    }

    setSession(res, { role: 'member', username: member.username, userId: member.id });
    return res.end(JSON.stringify({
      ok: true,
      role: 'member',
      username: member.username,
      userId: member.id,
    }));
  } catch (e) {
    console.error('AUTH ERROR:', e);
    res.statusCode = 500;
    return res.end(JSON.stringify({
      ok: false,
      error: 'Não foi possível conectar ao banco Neon. Confira as variáveis da Vercel e faça Redeploy.',
    }));
  }
};
