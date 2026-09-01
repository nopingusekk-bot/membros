const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || process.env.STORAGE_POSTGRES_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL/STORAGE_DATABASE_URL não configurada');
const sql = neon(DATABASE_URL);
const COOKIE='caseirinhos_session';
function json(res,status,data){res.status(status).setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
function hashPassword(password){return new Promise((resolve,reject)=>crypto.scrypt(password, process.env.PASSWORD_PEPPER||'caseirinhos-default-pepper', 64, (e,d)=>e?reject(e):resolve(d.toString('hex'))))}
function hashToken(t){return crypto.createHash('sha256').update(t).digest('hex')}
function newToken(){return crypto.randomBytes(32).toString('hex')}
function setCookie(res,token,maxAge=60*60*24*30){res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`)}
function clearCookie(res){res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)}
function getCookie(req){const h=req.headers.cookie||''; const m=h.match(new RegExp('(?:^|; )'+COOKIE+'=([^;]+)')); return m?m[1]:null}
async function auth(req){const t=getCookie(req); if(!t) return null; const rows=await sql`select m.id,m.username,m.status,m.role from sessions s join members m on m.id=s.member_id where s.token_hash=${hashToken(t)} and s.expires_at>now() limit 1`; return rows[0]||null}

async function ensureDatabase(){
  await sql`create extension if not exists pgcrypto`;
  await sql`create table if not exists members (id uuid primary key default gen_random_uuid(), username text not null unique, password_hash text not null, status text not null default 'active' check(status in ('active','blocked')), role text not null default 'member' check(role in ('member','admin')), created_at timestamptz not null default now())`;
  await sql`create table if not exists sessions (id uuid primary key default gen_random_uuid(), member_id uuid not null references members(id) on delete cascade, token_hash text not null unique, expires_at timestamptz not null, created_at timestamptz not null default now())`;
  await sql`create table if not exists progress (member_id uuid not null references members(id) on delete cascade, lesson integer not null, completed boolean not null default false, updated_at timestamptz not null default now(), primary key(member_id,lesson))`;
  await sql`create table if not exists notes (member_id uuid not null references members(id) on delete cascade, lesson integer not null, note text not null default '', updated_at timestamptz not null default now(), primary key(member_id,lesson))`;
  await sql`create table if not exists ratings (member_id uuid not null references members(id) on delete cascade, lesson integer not null, rating integer not null check(rating between 1 and 5), updated_at timestamptz not null default now(), primary key(member_id,lesson))`;
  await sql`create table if not exists comments (id uuid primary key default gen_random_uuid(), member_id uuid not null references members(id) on delete cascade, lesson integer not null, text text not null, status text not null default 'pending' check(status in ('pending','approved','rejected')), created_at timestamptz not null default now())`;
  await sql`create index if not exists sessions_token_idx on sessions(token_hash)`;
  await sql`create index if not exists comments_status_idx on comments(status)`;
  const adminUser=process.env.ADMIN_USERNAME || 'admin';
  const adminPassword=process.env.ADMIN_PASSWORD;
  if(adminPassword){
    const h=await hashPassword(adminPassword);
    await sql`insert into members(username,password_hash,role,status) values(${adminUser},${h},'admin','active') on conflict(username) do update set password_hash=excluded.password_hash, role='admin', status='active'`;
  }
}

async function requireAuth(req,res,role){const u=await auth(req);if(!u){json(res,401,{error:'Não autenticado'});return null}if(u.status!=='active'){json(res,403,{error:'Acesso bloqueado'});return null}if(role&&u.role!==role){json(res,403,{error:'Sem permissão'});return null}return u}
module.exports={sql,json,body,hashPassword,hashToken,newToken,setCookie,clearCookie,getCookie,auth,requireAuth,ensureDatabase};
