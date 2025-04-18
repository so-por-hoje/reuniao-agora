// app.js
import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/+esm';

const TZ_BR = 'America/Sao_Paulo';
const WEEKDAY_NOW = DateTime.now().setZone(TZ_BR).weekday % 7;

function runningNow(meetings) {
  const now = DateTime.now().setZone(TZ_BR);
  const minutesNow = now.hour * 60 + now.minute;
  return meetings.filter(m => {
    if (m.weekday !== WEEKDAY_NOW) return false;
    const [sh, sm] = m.start.slice(0,5).split(':').map(Number);
    const [eh, em] = m.end.slice(0,5).split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em - (endMin < startMin ? -1440 : 0); // spans midnight
    return minutesNow >= startMin && minutesNow < endMin;
  });
}

function render(list) {
  const ul = document.getElementById('list');
  ul.innerHTML = '';
  if (!list.length) {
    ul.innerHTML = '<li>Nenhuma reunião virtual está acontecendo neste momento.</li>';
    return;
  }
  list.forEach(m => {
    const li = document.createElement('li');
    const label = `${m.name} — ${m.platform} (${m.start.slice(0,5)}–${m.end.slice(0,5)})`;
    li.textContent = label;
    if (m.link) li.innerHTML = `<a href="${m.link}" target="_blank" rel="noopener">${label}</a>`;
    ul.appendChild(li);
  });
}

function updateClock() {
  document.getElementById('clock').textContent =
    DateTime.now().setZone(TZ_BR).toFormat('HH:mm');
}

async function load() {
  try {
    const res = await fetch('meetings.json', { cache: 'no-store' });
    const meetings = await res.json();
    render(runningNow(meetings));
  } catch {
    document.getElementById('list').textContent = 'Erro ao carregar dados.';
  }
  updateClock();
}

load();
setInterval(load, 60_000);      // refresh every minute
