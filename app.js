// app.js

const currentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 8);
};

const currentWeekday = () => {
    // Sunday = 0, Monday = 1, ..., Saturday = 6
    return new Date().getDay();
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
        const data = await response.json();
        console.log('✅ JSON fetched successfully');
        console.log(`📦 Loaded array with ${data.length} items`);
        console.log('📰 First item in dataset:', data[0]);

        const now = currentTime();
        const weekday = currentWeekday();

        console.log(`🕒 Current time: ${now}`);
        console.log(`📅 Current weekday: ${weekday}`);

        const currentMeetings = data
            .filter(meeting => {
                const match = (
                    meeting.weekday === weekday &&
                    meeting.start <= now &&
                    meeting.end > now
                );
                console.log(`➡️ Checking: ${meeting.name}`);
                console.log(`   • start: ${meeting.start} | end: ${meeting.end}`);
                console.log(`   • match: ${match}`);
                return match;
            })
            .sort((a, b) => b.start.localeCompare(a.start));  // Descending order

        console.log(`🔍 Meetings happening now: ${currentMeetings.length}`);

        const container = document.getElementById('meetings-container');
        container.innerHTML = "";

        if (currentMeetings.length === 0) {
            container.textContent = 'Nenhuma reunião agora.';
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

    setTimeout(() => {
        console.log("🔄 Refreshing page...");
        location.reload();
    }, msUntilNextRefresh);
}

schedulePageRefresh();

document.addEventListener('DOMContentLoaded', loadMeetings);
