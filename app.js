// app.js

const currentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 8);
};

const currentWeekday = () => {
    const nowInBrazil = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        weekday: "short"
    }).format(new Date());

    const map = {
        dom: 0,
        seg: 1,
        ter: 2,
        qua: 3,
        qui: 4,
        sex: 5,
        sáb: 6,
        sab: 6
    };

    return map[nowInBrazil.toLowerCase()] ?? new Date().getDay(); // fallback if unknown
};

const isHappeningNow = (meeting) => {
    const now = currentTime();
    return (
        meeting.weekday === currentWeekday() &&
        meeting.start <= now &&
        meeting.end > now
    );
};

const renderMeeting = (meeting) => {
    const container = document.getElementById('meetings-container');

    const div = document.createElement('div');
    div.classList.add('meeting');

    const name = document.createElement('h2');
    const nameLink = document.createElement('a');
    nameLink.href = meeting.link;
    nameLink.target = "_blank";
    nameLink.rel = "noopener noreferrer";
    nameLink.textContent = meeting.name.replace(/^Reunião\s+/i, '').trim();
    nameLink.style.textDecoration = "none";
    nameLink.style.color = "#000";
    name.appendChild(nameLink);

    const time = document.createElement('p');
    time.textContent = `Das ${meeting.start} às ${meeting.end}`;

    div.appendChild(name);
    div.appendChild(time);

    container.appendChild(div);
};


const loadMeetings = async () => {
    try {
        const response = await fetch('meetings.json');
        console.log("meetings.json loaded");
        const data = await response.json();

        const now = currentTime();
        const weekday = currentWeekday();

        const currentMeetings = data.filter(meeting => {
            return (
                meeting.weekday === weekday &&
                meeting.start <= now &&
                meeting.end > now
            );
        });

        // Sort descending by start time, with random shuffle tie-breaker
        currentMeetings.sort((a, b) => {
            if (a.start !== b.start) return b.start.localeCompare(a.start);
            if (a.end !== b.end) return b.end.localeCompare(a.end);
            return Math.random() - 0.5; // shuffle if same start + end
        });

        if (currentMeetings.length === 0) {
            document.getElementById('meetings-container').textContent =
                'Nenhuma reunião agora.';
            return;
        }

        currentMeetings.forEach(renderMeeting);
    } catch (error) {
        console.error('❌ Failed to fetch or parse meetings.json:', error);
    }
};


function schedulePageRefresh() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const msUntilNextRefresh =
        ((30 - (minutes % 30)) * 60 - seconds) * 1000;

    console.log(`🔄 Next refresh in ${msUntilNextRefresh / 1000 / 60} minutes`);
    console.log("22:48");

    setTimeout(() => {
        console.log("🔄 Refreshing page...");
        location.reload();
    }, msUntilNextRefresh);
}

schedulePageRefresh();

document.addEventListener('DOMContentLoaded', loadMeetings);
