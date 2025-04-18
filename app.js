/* app.js ─ versão 2024‑04‑19 */

/* ───────── helpers ────────────────────────────────────────── */
const pad     = n => String(n).padStart(2, "0");
const now     = () => new Date();              // usa hora do navegador
const weekday = () => now().getDay();          // 0‑6   (dom=0)

// "HH:MM:SS" → minutos desde 00:00
const toMin = hms => {
  const [h, m, s] = hms.split(":").map(Number);
  return h * 60 + m + s / 60;
};

/* ───────── relógio no topo ───────────────────────────────── */
const $clock = document.getElementById("current-time");
const dias   = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira",
                "Quinta-feira","Sexta-feira","Sábado"];

function tick() {
  const d = now();
  $clock.textContent =
    `Hoje é ${dias[d.getDay()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
tick();
setInterval(tick, 1_000);

/* ───────── renderizador de reuniões ──────────────────────── */
const $list = document.getElementById("meetings-container");

function renderMeetings(meetings) {
  $list.innerHTML = "";

  if (!meetings.length) {
    $list.textContent = "Nenhuma reunião agora.";
    return;
  }

  meetings.forEach(m => {
    const card = document.createElement("div");
    card.className = "meeting";

    // título sem “Reunião ”
    const a = document.createElement("a");
    a.href   = m.link;
    a.target = "_blank";
    a.rel    = "noopener noreferrer";
    a.textContent = m.name.replace(/^Reunião\s+/i, "").trim();
    a.style.fontSize   = "1.8rem";
    a.style.fontWeight = "bold";

    const span = document.createElement("span");
    span.style.marginLeft = "2rem";
    span.textContent = `Das ${m.start} às ${m.end}`;

    card.appendChild(a);
    card.appendChild(span);
    $list.appendChild(card);
  });
}

/* ───────── lógica principal ──────────────────────────────── */
async function loadMeetings() {
  try {
    const resp = await fetch("meetings.json");
    const data = await resp.json();

    const nowMin = toMin(now().toTimeString().slice(0, 8));

    // 1. filtra pelo dia e horário atuais + só com link Zoom
    const happening = data.filter(m =>
      m.link &&
      m.weekday === weekday() &&
      toMin(m.start) <= nowMin &&
      toMin(m.end)   >  nowMin
    );

    // 2. agrupa por intervalo igual e escolhe um randômico de cada grupo
    const byRange = {};
    happening.forEach(m => {
      const key = `${m.start}-${m.end}`;
      (byRange[key] ||= []).push(m);
    });

    const chosen = Object.values(byRange).map(arr =>
      arr[Math.floor(Math.random() * arr.length)]
    );

    // 3. ordena por horário de início decrescente
    chosen.sort((a, b) => toMin(b.start) - toMin(a.start));

    renderMeetings(chosen);
  } catch (err) {
    console.error("Erro ao carregar meetings.json", err);
    $list.textContent = "Falha ao carregar dados.";
  }
}
console.log("surf?");
loadMeetings();

/* ───────── auto‑reload a cada :00 e :30 ──────────────────── */
setInterval(() => {
  const m = now().getMinutes();
  if (m === 0 || m === 30) location.reload();
}, 20_000);   // verifica a cada 20 s
