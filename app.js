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

    const name = document.createElement('h2');
    name.textContent = meeting.name;

    const platform = document.createElement('p');
    platform.textContent = `Plataforma: ${meeting.platform}`;

    const time = document.createElement('p');
    time.textContent = `Das ${meeting.start} às ${meeting.end}`;

    div.appendChild(name);
    div.appendChild(platform);
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

        const currentMeetings = data.filter(isHappeningNow);
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
