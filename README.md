# caseirinhos.com — Área de Membros (Vercel + Neon)

Pacote completo para colocar no GitHub. A estrutura deve ficar exatamente assim na raiz do repositório:

- `index.html`
- `caseirinhos_area_membros_admin_com_ingredientes.html`
- `schema.sql`
- `package.json`
- `vercel.json`
- `.gitignore`
- `.env.example`
- `api/`
  - `_auth.js`
  - `_body.js`
  - `_db.js`
  - `_password.js`
  - `auth.js`
  - `data.js`
  - `health.js`
  - `members.js`

## 1. Vercel + GitHub

Conecte o projeto da Vercel ao repositório GitHub e faça push destes arquivos para a branch `main`.

Não coloque os arquivos dentro de uma pasta extra. `index.html` e `api/` precisam estar na raiz.

## 2. Neon

A integração Neon/Vercel deve criar uma variável de conexão PostgreSQL. O código aceita automaticamente:

`DATABASE_URL`, `POSTGRES_URL`, `STORAGE_DATABASE_URL`, `STORAGE_POSTGRES_URL`, `STORAGE_POSTGRES_PRISMA_URL`, `STORAGE_DATABASE_URL_UNPOOLED`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` ou `NEON_DATABASE_URL`.

As tabelas são criadas automaticamente na primeira chamada à API. `schema.sql` também está incluído caso você queira executar o SQL manualmente no Neon.

## 3. Variáveis obrigatórias da aplicação

Na Vercel, em Project Settings > Environment Variables, configure:

- `ADMIN_USERNAME` — por exemplo `admin`
- `ADMIN_PASSWORD` — sua senha de administrador
- `PASSWORD_PEPPER` — frase aleatória longa
- `SESSION_SECRET` — outra frase aleatória longa

Use Production e, se quiser testar previews, também Preview.

Depois de alterar variáveis, faça Redeploy.

## 4. Teste

Abra:

`https://SEU-DOMINIO/api/health`

O retorno esperado começa com `{"ok":true,...}`.

Depois faça login normalmente. O login de administrador entra no painel e os membros são gravados no Neon, então o mesmo usuário funciona no celular e no PC.

## Importante ao substituir um repositório antigo

Remova a pasta `api` antiga antes de enviar esta versão. Não deixe junto as pastas antigas
`api/admin`, `api/auth` e `api/member`, porque elas criam funções adicionais no Vercel.

A estrutura correta da nova `api/` é exatamente:
- `_auth.js`
- `_body.js`
- `_db.js`
- `_password.js`
- `auth.js`
- `data.js`
- `health.js`
- `members.js`

Os quatro arquivos públicos são `auth.js`, `data.js`, `health.js` e `members.js`.
