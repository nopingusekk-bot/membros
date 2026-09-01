const { initDb, getPool } = require('./_db');
const { requireSession } = require('./_auth');
const { getBody } = require('./_body');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const s = requireSession(req, res);
    if (!s) return;
    await initDb();
    const db = getPool();

    if (req.method === 'GET') {
      if (s.role === 'member') {
        const [p, n, r, c] = await Promise.all([
          db.query('SELECT lesson FROM progress WHERE member_id=$1', [s.userId]),
          db.query('SELECT lesson,note FROM notes WHERE member_id=$1', [s.userId]),
          db.query('SELECT lesson,rating FROM ratings WHERE member_id=$1', [s.userId]),
          db.query('SELECT id,lesson,text,status,created_at FROM comments WHERE member_id=$1 ORDER BY created_at DESC', [s.userId]),
        ]);
        return res.end(JSON.stringify({
          ok: true,
          progress: p.rows.map(x => x.lesson),
          notes: Object.fromEntries(n.rows.map(x => [x.lesson, x.note])),
          ratings: Object.fromEntries(r.rows.map(x => [x.lesson, x.rating])),
          comments: c.rows,
        }));
      }
      const c = await db.query(`
        SELECT c.id,c.lesson,c.text,c.status,c.created_at,m.username member_name
        FROM comments c JOIN members m ON m.id=c.member_id
        ORDER BY c.created_at DESC
      `);
      return res.end(JSON.stringify({ ok: true, comments: c.rows }));
    }

    const b = getBody(req);
    if (s.role === 'member') {
      if (req.method === 'POST' && b.type === 'progress') {
        const lesson = Number(b.lesson);
        if (!Number.isInteger(lesson) || lesson < 1 || lesson > 1000) throw new Error('Aula inválida.');
        if (b.done) await db.query('INSERT INTO progress(member_id,lesson) VALUES($1,$2) ON CONFLICT DO NOTHING', [s.userId, lesson]);
        else await db.query('DELETE FROM progress WHERE member_id=$1 AND lesson=$2', [s.userId, lesson]);
        return res.end(JSON.stringify({ ok: true }));
      }
      if (req.method === 'POST' && b.type === 'note') {
        const lesson = Number(b.lesson);
        await db.query(
          'INSERT INTO notes(member_id,lesson,note) VALUES($1,$2,$3) ON CONFLICT(member_id,lesson) DO UPDATE SET note=EXCLUDED.note',
          [s.userId, lesson, String(b.note || '').slice(0, 10000)]
        );
        return res.end(JSON.stringify({ ok: true }));
      }
      if (req.method === 'POST' && b.type === 'rating') {
        const lesson = Number(b.lesson);
        const rating = Number(b.rating);
        if (rating === 0) await db.query('DELETE FROM ratings WHERE member_id=$1 AND lesson=$2', [s.userId, lesson]);
        else {
          if (![1, 2, 3, 4, 5].includes(rating)) throw new Error('Avaliação inválida.');
          await db.query(
            'INSERT INTO ratings(member_id,lesson,rating) VALUES($1,$2,$3) ON CONFLICT(member_id,lesson) DO UPDATE SET rating=EXCLUDED.rating',
            [s.userId, lesson, rating]
          );
        }
        return res.end(JSON.stringify({ ok: true }));
      }
      if (req.method === 'POST' && b.type === 'comment') {
        const text = String(b.text || '').trim().slice(0, 5000);
        if (!text) throw new Error('Comentário vazio.');
        const r = await db.query(
          'INSERT INTO comments(member_id,lesson,text) VALUES($1,$2,$3) RETURNING id,created_at',
          [s.userId, Number(b.lesson), text]
        );
        return res.end(JSON.stringify({ ok: true, comment: r.rows[0] }));
      }
    }

    if (s.role === 'admin' && req.method === 'PATCH' && b.type === 'comment') {
      if (!['approved', 'rejected', 'pending'].includes(b.status)) throw new Error('Status de comentário inválido.');
      await db.query('UPDATE comments SET status=$1 WHERE id=$2', [b.status, b.id]);
      return res.end(JSON.stringify({ ok: true }));
    }

    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'Requisição inválida.' }));
  } catch (e) {
    console.error('DATA ERROR:', e);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: e.message || 'Erro no banco de dados Neon.' }));
  }
};
