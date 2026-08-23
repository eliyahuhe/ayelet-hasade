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

async function fetchWeather() {
    const el = document.getElementById('weather-info');
    if (!el) return;
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