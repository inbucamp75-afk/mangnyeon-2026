// GET: 후보별 인원 수(숫자만) · POST: 참석 여부 남기기(같은 이름이면 마지막 답으로 바꾼다)
const { SB_URL, SB_KEY, ATTENDANCE, DATES, PLACES, DEADLINE, clip, nameKey, sbHeaders, readBody, tally } = require('./_shared.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase 연결 정보가 없어요. Vercel Storage 연결 후 다시 배포해 주세요.' });
  const closed = Date.now() >= DEADLINE;

  if (req.method === 'GET') {
    const r = await fetch(`${SB_URL}/rest/v1/rsvps?select=attendance,dates,places`, { headers: sbHeaders() });
    if (!r.ok) return res.status(500).json({ error: '인원 수를 불러오지 못했어요.' });
    return res.status(200).json({ ...tally(await r.json()), closed });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET, POST만 가능해요' });
  if (closed) return res.status(403).json({ error: '투표가 마감됐어요. 바뀐 게 있으면 간사(000-1234)에게 연락해 주세요.' });

  const b = readBody(req);
  if (b.website) return res.status(200).json({ ok: true }); // 스팸 함정 칸(사람에게는 안 보임)
  const pick = (list, allowed) => [...new Set(Array.isArray(list) ? list : [])].filter((v) => v in allowed);
  const row = {
    name: clip(b.name, 30),
    attendance: b.attendance,
    dates: pick(b.dates, DATES),
    places: pick(b.places, PLACES),
    place_other: '',
    message: clip(b.message, 300),
    consent: b.consent === true,
    updated_at: new Date().toISOString(),
  };
  if (!row.name) return res.status(400).json({ error: '이름을 적어 주세요.' });
  if (!ATTENDANCE.includes(row.attendance)) return res.status(400).json({ error: '참석, 불참, 미정 중 하나를 골라 주세요.' });
  if (row.attendance === '불참') { row.dates = []; row.places = []; }
  if (row.attendance === '참석' && !row.dates.length) return res.status(400).json({ error: '참석이면 가능한 날짜를 하나 이상 골라 주세요.' });
  if (row.places.includes('other')) {
    row.place_other = clip(b.place_other, 40);
    if (!row.place_other) return res.status(400).json({ error: '기타 장소 이름을 적어 주세요.' });
  }
  if (!row.consent) return res.status(400).json({ error: '개인정보 수집·이용에 동의해 주세요.' });
  row.name_key = nameKey(row.name);

  const r = await fetch(`${SB_URL}/rest/v1/rsvps?on_conflict=name_key`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
  if (!r.ok) return res.status(500).json({ error: '저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.' });
  return res.status(200).json({ ok: true });
};
