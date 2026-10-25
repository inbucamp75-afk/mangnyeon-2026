// 간사용: 비밀번호 확인 후 이름별 답 전체를 돌려준다. 데이터는 바꾸거나 지우지 않는다.
const crypto = require('node:crypto');
const { SB_URL, SB_KEY, sbHeaders, tally } = require('./_shared.js');

const same = (a, b) => {
  const h = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return res.status(500).json({ error: 'Vercel 환경변수에 ADMIN_PASSWORD를 넣고 Redeploy 해 주세요.' });
  if (!same(req.headers['x-admin-password'] || '', pass)) return res.status(401).json({ error: '비밀번호가 맞지 않아요.' });
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase 연결 정보가 없어요.' });
  if (req.method !== 'GET') return res.status(405).json({ error: '지원하지 않는 요청이에요.' });

  const r = await fetch(`${SB_URL}/rest/v1/rsvps?select=name,attendance,dates,places,place_other,message,created_at,updated_at&order=updated_at.desc&limit=1000`, { headers: sbHeaders() });
  if (!r.ok) return res.status(500).json({ error: '불러오지 못했어요.' });
  const rows = await r.json();
  return res.status(200).json({ rows, totals: tally(rows) });
};
