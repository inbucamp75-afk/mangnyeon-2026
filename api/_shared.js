// 여러 /api 함수가 같이 쓰는 값. 파일 이름이 _로 시작하면 Vercel은 주소로 열지 않는다.
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

// docs/PRD.md 8번의 후보 그대로. 바꾸면 index.html의 같은 목록도 바꾼다.
const ATTENDANCE = ['참석', '불참', '미정'];
const DATES = { d1218: '12/18(금) 저녁', d1222: '12/22(화) 저녁' };
const PLACES = { wolfgang: '울프강스테이크하우스', jojoen: '조조엔', other: '기타' };
const DEADLINE = Date.parse('2026-12-11T16:00:00+09:00'); // 투표 마감 12/11(금) 오후 4시

const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const nameKey = (s) => String(s).replace(/\s+/g, '').toLowerCase();
const sbHeaders = () => ({
  apikey: SB_KEY,
  ...(String(SB_KEY).startsWith('eyJ') ? { Authorization: `Bearer ${SB_KEY}` } : {}),
  'Content-Type': 'application/json',
});
const readBody = (req) => {
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  return b;
};

// 답 목록에서 숫자만 센다. 불참한 사람은 날짜·장소 인원에 넣지 않는다.
const tally = (rows) => {
  const t = {
    total: rows.length,
    attendance: Object.fromEntries(ATTENDANCE.map((a) => [a, 0])),
    dates: Object.fromEntries(Object.keys(DATES).map((k) => [k, 0])),
    places: Object.fromEntries(Object.keys(PLACES).map((k) => [k, 0])),
  };
  for (const r of rows) {
    if (r.attendance in t.attendance) t.attendance[r.attendance]++;
    if (r.attendance === '불참') continue;
    for (const d of r.dates || []) if (d in t.dates) t.dates[d]++;
    for (const p of r.places || []) if (p in t.places) t.places[p]++;
  }
  return t;
};

module.exports = { SB_URL, SB_KEY, ATTENDANCE, DATES, PLACES, DEADLINE, clip, nameKey, sbHeaders, readBody, tally };
