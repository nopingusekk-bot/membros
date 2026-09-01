const crypto = require('crypto');

function secret() {
  const value = process.env.SESSION_SECRET || process.env.PASSWORD_PEPPER || process.env.SETUP_KEY;
  return value || 'caseirinhos-change-this-secret-before-production';
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token) {
  if (!token) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function setSession(res, payload) {
  const token = sign({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
  res.setHeader(
    'Set-Cookie',
    `caseirinhos_session=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=604800`
  );
}

function clearSession(res) {
  res.setHeader(
    'Set-Cookie',
    'caseirinhos_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0'
  );
}

function cookies(req) {
  const raw = req.headers?.cookie || '';
  const out = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    out[key] = value;
  }
  return out;
}

function session(req) {
  return verify(cookies(req).caseirinhos_session);
}

function requireSession(req, res, role) {
  const s = session(req);
  if (!s || (role && s.role !== role)) {
    res.statusCode = 401;
    res.end(JSON.stringify({ ok: false, error: 'Não autorizado.' }));
    return null;
  }
  return s;
}

module.exports = { setSession, clearSession, session, requireSession };
