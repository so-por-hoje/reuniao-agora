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
    nameLink.textContent = meeting.name;
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

        const currentMeetings = data.filter(meeting => {
            const match = (
                meeting.weekday === weekday &&
                meeting.start <= now &&
                meeting.end > now
            );

            console.log(`➡️ Checking: ${meeting.name}`);
            console.log(`   • start: ${meeting.start} | end: ${meeting.end}`);
            console.log(`   • match: ${match}`);
            return match;
        });

        console.log(`🔍 Meetings happening now: ${currentMeetings.length}`);

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

document.addEventListener('DOMContentLoaded', loadMeetings);
