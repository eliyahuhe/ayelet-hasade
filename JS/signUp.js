async function signUp(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const user = document.getElementById('username').value;
    const phone = document.getElementById('phone').value;
    const pass = document.getElementById('password').value;
    const pass2 = document.getElementById('confirmPassword').value;

    if (pass !== pass2) {
        alert('סיסמה לא תואמת');
        return;
    }

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                username: user,
                phone: phone,
                password: pass
            })
        });

        if (response.ok) {
            alert('ההרשמה הצליחה!');
            localStorage.setItem('username', user);
            localStorage.setItem('products', JSON.stringify([]));
            window.location.href = '/html/shop.html';
        } else {
            const data = await response.json();
            alert(data.error || 'התרחשה שגיאה בהרשמה.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('התרחשה שגיאה בהרשמה.');
    }
}

function togglePass(inputId, iconId) {
    const passInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(iconId);

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
            }
            else {
                el.innerText = '☀️ --°C';
            }
        }
        catch (e) {
            el.innerText = '☀️ --°C';
        }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                getWeather(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
                getWeather(32.0853, 34.7818);
            }
        );
    }
    else {
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