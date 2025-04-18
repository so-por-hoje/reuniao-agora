// app.js
// ===========================================
//  Mostra reuniões Zoom que estão acontecendo
//  agora, respeitando o fuso America/Sao_Paulo
// ===========================================

// ───────── helpers de data/hora (fuso BR) ─────────
const TZ = 'America/Sao_Paulo';

const nowInBR = () => {
  const iso = new Date().toLocaleString('en-US', { timeZone: TZ });
  return new Date(iso);
};

const currentTime = () => nowInBR().toTimeString().slice(0, 8);     // hh:mm:ss
const currentWeekday = () => nowInBR().getDay();                     // 0‑Dom … 6‑Sáb

// ───────── relógio vivo no cabeçalho ─────────
const diasSemana = [
  'Domingo', 'Segunda-feira', 'Terça-feira',
  'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
];

const updateClock = () => {
  const agora = nowInBR();
  const h = String(agora.getHours()).padStart(2, '0');
  const m = String(agora.getMinutes()).padStart(2, '0');
  const s = String(agora.getSeconds()).padStart(2, '0');
  document.getElementById('current-time').textContent =
    `Hoje é ${diasSemana[agora.getDay()]}, ${h}:${m}:${s}`;
};

updateClock();
setInterval(updateClock, 1_000);

// ───────── utilidades ─────────
const cleanName = (name) => name.replace(/^Reunião\s+/i, '').trim();

const isHappeningNow = (meeting, now, weekday) =>
  meeting.weekday === weekday &&
  meeting.start <= now &&
  meeting.end   >  now;

// ───────── renderização ─────────
const renderMeeting = (meeting) => {
  const container = document.getElementById('meetings-container');

  const card   = document.createElement('div');
  card.className = 'meeting';

  const linkEl = document.createElement('a');
  linkEl.href      = meeting.link;
  linkEl.target    = '_blank';
  linkEl.rel       = 'noopener noreferrer';

  const title  = document.createElement('h2');
  title.textContent = cleanName(meeting.name);
  linkEl.appendChild(title);

  const timeEl = document.createElement('p');
  timeEl.textContent = `Das ${meeting.start} às ${meeting.end}`;

  card.appendChild(linkEl);
  card.appendChild(timeEl);

  container.appendChild(card);
};

// ───────── carga de dados ─────────
const loadMeetings = async () => {
  try {
    const resp = await fetch('meetings.json');
    const data = await resp.json();

    const nowStr  = currentTime();
    const weekday = currentWeekday();

    let currentMeetings = data.filter(m => isHappeningNow(m, nowStr, weekday));

    // Ordena por hora inicial descrescente; empate → ordem aleatória
    currentMeetings.sort((a, b) => {
      if (a.start === b.start && a.end === b.end) return Math.random() - 0.5;
      return b.start.localeCompare(a.start);
    });

    const container = document.getElementById('meetings-container');
    container.innerHTML = '';

    if (!currentMeetings.length) {
      container.textContent = 'Nenhuma reunião agora.';
      return;
    }

    currentMeetings.forEach(renderMeeting);
  } catch (err) {
    console.error('❌ Erro ao carregar meetings.json:', err);
  }
};

// ───────── recarregar a cada meia‑hora exata ─────────
const scheduleReload = () => {
  const agora = nowInBR();
  const ms =
    ((30 - (agora.getMinutes() % 30)) * 60 * 1000) -
    (agora.getSeconds() * 1000 + agora.getMilliseconds());
  setTimeout(() => location.reload(), ms);
};

// ───────── bootstrap ─────────
document.addEventListener('DOMContentLoaded', () => {
  loadMeetings();
  scheduleReload();
});
