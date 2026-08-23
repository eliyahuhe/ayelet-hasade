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

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('username', user);
            // שמירת השם הפרטי שהתקבל מהשרת
            if (data.firstName) {
                localStorage.setItem('name', data.firstName);
            }

            // הפיכת העגלה מ-MongoDB למבנה המקומי והחלפת ה-localStorage
            const dbCart = (data.cart || []).map(item => ({
                id: item.productId,
                quantity: item.quantity
            }));
            localStorage.setItem('products', JSON.stringify(dbCart));

            // בדיקת תפקיד והפנייה בהתאם
            if (data.role === 'admin') {
                window.location.href = '/html/admin.html';
            } else {
                window.location.href = '/html/shop.html';
            }
        } else {
            alert(data.message || 'שם משתמש או סיסמה שגויים');
        }

    } catch (error) {
        console.error('Error during login:', error);
        alert('אירעה שגיאה בתקשורת עם השרת');
    }
}

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

// כניסת אורח - ניקוי עגלה, שם משתמש ועוגיית תפקיד
function guestLogin() {
    console.log("התחברות כאורח");
    localStorage.clear();
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = '/html/shop.html';
}

function togglePass(inputId = 'password', iconId = 'togglePassword') {
    const passInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(iconId);

    if (!passInput || !toggleIcon) return;

    if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleIcon.classList.remove('bi-eye-slash');
        toggleIcon.classList.add('bi-eye');
    } else {
        passInput.type = 'password';
        toggleIcon.classList.remove('bi-eye');
        toggleIcon.classList.add('bi-eye-slash');
    }
}
// ניקוי אוטומטי של כל הטפסים בעמוד כשחוזרים אליו עם כפתור "אחורה"
window.addEventListener('pageshow', function () {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => form.reset());
});