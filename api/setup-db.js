// 한 번만 쓰는 표 만들기 통로 — 표가 생기면 이 파일은 지운다. 데이터는 읽지도 보내지도 않는다.
const { Client } = require('pg');
const SQL = `-- 망년회 응답 표. 클로드가 일회용 /api/setup-db로 실행하고, 막힐 때만 Supabase SQL Editor에 붙여 넣는다.
create table if not exists public.rsvps (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  name text not null,
  name_key text not null unique,          -- 띄어쓰기·대소문자를 뺀 이름. 같은 이름이면 마지막 답으로 바꾼다
  attendance text not null check (attendance in ('참석', '불참', '미정')),
  dates text[] not null default '{}',
  places text[] not null default '{}',
  place_other text not null default '',
  message text not null default '',
  consent boolean not null default false
);
alter table public.rsvps enable row level security;
revoke all on public.rsvps from anon, authenticated;
-- 정책은 만들지 않는다: 브라우저(공개 키)로는 접근 불가, 서버(/api)만 접근`;
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 가능해요' });
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!url) return res.status(500).json({ error: '데이터베이스 연결 정보가 없어요. Vercel Storage에서 Supabase를 연결해 주세요.' });
  const client = new Client({ connectionString: url.replace(/[?&]sslmode=[^&]*/, ''), ssl: { rejectUnauthorized: false } });
  try { await client.connect(); await client.query(SQL); return res.status(200).json({ ok: true }); }
  catch (e) { return res.status(500).json({ error: '표를 만들지 못했어요', detail: String(e.message).slice(0, 200) }); }
  finally { await client.end().catch(() => {}); }
};
