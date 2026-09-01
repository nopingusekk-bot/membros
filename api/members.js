const { initDb, getPool } = require('./_db');
const { requireSession } = require('./_auth');
const { hashPassword } = require('./_password');
const { getBody } = require('./_body');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const s = requireSession(req, res, 'admin');
    if (!s) return;
    await initDb();
    const db = getPool();

    if (req.method === 'GET') {
      const r = await db.query(`
        SELECT m.id,m.username,m.status,m.created_at,
               COALESCE(p.cnt,0)::int AS completed
        FROM members m
        LEFT JOIN (
          SELECT member_id,COUNT(*) cnt FROM progress GROUP BY member_id
        ) p ON p.member_id=m.id
        ORDER BY m.created_at DESC
      `);
      return res.end(JSON.stringify({ ok: true, members: r.rows }));
    }

    const body = getBody(req);

    if (req.method === 'POST') {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (!username || username.length > 80 || password.length < 4 || password.length > 200) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ ok: false, error: 'Informe usuário e senha. A senha deve ter de 4 a 200 caracteres.' }));
      }
      if (username.toLowerCase() === String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase()) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ ok: false, error: 'Esse nome é reservado para o administrador.' }));
      }
      try {
        const r = await db.query(
          'INSERT INTO members(username,password_hash) VALUES($1,$2) RETURNING id,username,status,created_at',
          [username, hashPassword(password)]
        );
        return res.end(JSON.stringify({ ok: true, member: r.rows[0] }));
      } catch (e) {
        if (e.code === '23505') {
          res.statusCode = 409;
          return res.end(JSON.stringify({ ok: false, error: 'Esse usuário já existe.' }));
        }
        throw e;
      }
    }

    if (req.method === 'PATCH') {
      const id = String(body.id || '');
      const action = body.action;
      if (action === 'toggle') {
        const r = await db.query(
          `UPDATE members SET status=CASE WHEN status='active' THEN 'blocked' ELSE 'active' END WHERE id=$1 RETURNING id,username,status`,
          [id]
        );
        return res.end(JSON.stringify({ ok: true, member: r.rows[0] }));
      }
      if (action === 'password') {
        const pw = String(body.password || '');
        if (pw.length < 4 || pw.length > 200) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ ok: false, error: 'A senha precisa ter de 4 a 200 caracteres.' }));
        }
        await db.query('UPDATE members SET password_hash=$1 WHERE id=$2', [hashPassword(pw), id]);
        return res.end(JSON.stringify({ ok: true }));
      }
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'Ação inválida.' }));
    }

    if (req.method === 'DELETE') {
      const id = String(body.id || '');
      await db.query('DELETE FROM members WHERE id=$1', [id]);
      return res.end(JSON.stringify({ ok: true }));
    }

    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Método não permitido.' }));
  } catch (e) {
    console.error('MEMBERS ERROR:', e);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'Erro no banco de dados Neon.' }));
  }
};
