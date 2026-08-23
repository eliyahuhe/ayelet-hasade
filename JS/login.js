// משיכת מזג אוויר מזיהוי מיקום מדויק בעזרת Open-Meteo API
async function fetchWeather() {
    const el = document.getElementById('weather-info');
    if (!el) return;

    async function getWeather(lat, lon) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
            const res = await fetch(url);
            const data = await res.json();

            if (data && data.current_weather) {
                const temp = Math.round(data.current_weather.temperature);
                el.innerText = `☀️ ${temp}°C`;
            } else {
                el.innerText = '☀️ --°C';
            }
        } catch (e) {
            console.error('שגיאה במשיכת מזג אוויר:', e);
            el.innerText = '☀️ --°C';
        }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                // המשתמש אישר מיקום - מביא מעלות לפי נ"צ מדויק
                getWeather(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
                // המשתמש סירב למיקום - מביא מעלות של ישראל (מרכז) כברירת מחדל
                getWeather(32.0853, 34.7818);
            }
        );
    } else {
        getWeather(32.0853, 34.7818);
    }
}

function updateTime() {
    const el = document.getElementById('current-time');
    if (el) {
        const n = new Date();
        el.innerText = n.getHours().toString().padStart(2, '0') + ":" + n.getMinutes().toString().padStart(2, '0');
    }
}

setInterval(updateTime, 1000);
updateTime();
fetchWeather();

function guestLogin() {
    console.log("התחברות כאורח");
    localStorage.clear();
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = '/html/shop.html';
}
