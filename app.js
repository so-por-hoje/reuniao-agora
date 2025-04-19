/* ------------------------------------------------------------------
   app.js  ·  Virtual NA Meetings (Brazil)
   ------------------------------------------------------------------
   • Shows only meetings happening *right now* in the Brazil time‑zone
     (America/Sao_Paulo), even if the visitor is in another zone.
   • Works for meetings that cross midnight (e.g. 22:00 → 00:30).
   • Sorts by start‑time DESC; when two meetings start+end the same,
     their order is randomised on every load.
   • Strips the word “Reunião ” from the visible title.
   • Refreshes the whole page exactly on the hour and on the half‑hour.
------------------------------------------------------------------- */

/* ---------- Helpers for Brazil time ---------------------------- */
const brNow = () =>
  new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

const currentTimeStr   = () => brNow().toTimeString().slice(0, 8); // "HH:MM:SS"
const currentWeekday   = () => brNow().getDay();                   // 0 = Sun … 6 = Sat

/* ---------- Live clock on the page ----------------------------- */
function tickClock() {
  const dias = [
    'Domingo', 'Segunda-feira', 'Terça-feira',
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  const now = brNow();
  const pad = (n) => String(n).padStart(2, '0');
  const texto = `Hoje é ${dias[now.getDay()]}, `
              + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById('current-time').textContent = texto;
}
setInterval(tickClock, 1000);
tickClock();

/* ---------- Time helpers --------------------------------------- */
const toMinutes = (t) => {
  const [h, m, s] = t.split(':').map(Number);
  return h * 60 + m + s / 60;
};

const happensNow = (m) => {
  if (m.weekday !== currentWeekday()) return false;

  const now   = toMinutes(currentTimeStr());
  const start = toMinutes(m.start);
  const end   = toMinutes(m.end);

  // Normal slot
  if (start < end) return start <= now && now < end;

  // Cross‑midnight slot  (e.g. 23:00–01:00)
  return now >= start || now < end;
};

/* ---------- DOM render ----------------------------------------- */
const renderMeeting = (m) => {
  const cont = document.getElementById('meetings-container');

  const div = document.createElement('div');
  div.classList.add('meeting');

  const h2 = document.createElement('h2');
  const a  = document.createElement('a');
  a.href   = m.link;
  a.target = '_blank';
  a.rel    = 'noopener noreferrer';
  a.textContent = m.name.replace(/^Reunião\s+/i, '').trim();
  a.style.textDecoration = 'none';
  a.style.color = '#000';
  h2.appendChild(a);

  const pTime = document.createElement('p');
  pTime.textContent = `Das ${m.start} às ${m.end}`;

  div.appendChild(h2);
  div.appendChild(pTime);
  cont.appendChild(div);
};

/* ---------- Main loader ---------------------------------------- */
const loadMeetings = async () => {
  try {
    const res  = await fetch('meetings.json', { cache: 'no-store' });
    const data = await res.json();

    const meetingsNow = data
      .filter(happensNow)
      .sort((a, b) => {
        // DESC by start
        if (a.start !== b.start) return b.start.localeCompare(a.start);
        // Then DESC by end
        if (a.end !== b.end)     return b.end.localeCompare(a.end);
        // Same slot → shuffle
        return Math.random() - 0.5;
      });

    const cont = document.getElementById('meetings-container');
    cont.innerHTML = '';

    if (!meetingsNow.length) {
      cont.textContent = 'Nenhuma reunião agora.';
      return;
    }

    meetingsNow.forEach(renderMeeting);
  } catch (err) {
    console.error('❌ Erro ao carregar meetings.json:', err);
    document.getElementById('meetings-container')
            .textContent = 'Erro ao carregar dados.';
  }
};

/* ---------- Auto‑refresh at HH:00 and HH:30 -------------------- */
const scheduleRefresh = () => {
  const now = brNow();
  const mins = now.getMinutes();
  const secs = now.getSeconds();
  const ms   = now.getMilliseconds();

  // Minutes until next 0 or 30
  const minsToNext = (30 - (mins % 30)) % 30;
  const delay =
    (minsToNext * 60 * 1000) - (secs * 1000) - ms || 30 * 60 * 1000;

  console.log(`🔄 Próximo reload em ${(delay / 60000).toFixed(1)} min`);
  setTimeout(() => location.reload(), delay);
};

/* ---------- Boot ------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  loadMeetings();
  scheduleRefresh();
});
