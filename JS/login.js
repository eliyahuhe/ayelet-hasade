async function login(event) {
    event.preventDefault();

    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: user, password: pass })
        });

        // 3. פענוח ה-JSON שהשרת החזיר
        const data = await response.json();

        // 4. בדיקה האם השרת החזיר סטטוס הצלחה (200-299)
        if (response.ok) {
            localStorage.setItem('username', user);
            window.location.href = 'html/shop.html';
        } else {
            alert(data.message || 'שם משתמש או סיסמה שגויים');
        }

    } catch (error) {
        // שגיאת תקשורת/רשת (למשל: השרת למטה)
        console.error('Error during login:', error);
        alert('אירעה שגיאה בתקשורת עם השרת');
    }
}

async function fetchWeather() {
    const el = document.getElementById('weather-info');
    try {
        const res = await fetch('https://wttr.in/Israel?format=3');
        const text = await res.text();
        if (text.length > 50 || text.includes('{')) throw new Error();
        el.innerText = text.split(':')[1]?.trim().replace('+', '') || text;
    } catch (e) {
        el.innerText = (new Date().getHours() > 18 ? "🌙 16°C" : "☀️ 22°C");
    }
}

function updateTime() {
    const n = new Date();
    document.getElementById('current-time').innerText = n.getHours().toString().padStart(2, '0') + ":" + n.getMinutes().toString().padStart(2, '0');
}


setInterval(updateTime, 1000);
updateTime();
fetchWeather();

// כניסת אורח
function guestLogin() {
    console.log("התחברות כאורח");
    localStorage.clear();
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = '/html/shop.html';
}