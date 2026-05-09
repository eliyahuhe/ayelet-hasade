let currentZoom = 1;

// function togglePass() {
//     const p = document.getElementById('password');
//     const i = document.getElementById('togglePassword');
//     if (p.type === 'password') {
//         p.type = 'text';
//         i.classList.replace('bi-eye-slash', 'bi-eye');
//     } else {
//         p.type = 'password';
//         i.classList.replace('bi-eye', 'bi-eye-slash');
//     }
// }

function login(event) {
    event.preventDefault();

    const user = document.getElementById('username').value;

    localStorage.setItem('currentUser', user);
    window.location.href = 'shop.html';
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

function toggleAccessibilityMenu() {
    const m = document.getElementById('access-menu');
    m.style.display = (m.style.display === 'flex' ? 'none' : 'flex');
}

function changeFontSize(d) {
    currentZoom += (d * 0.1);
    currentZoom = Math.min(Math.max(currentZoom, 0.8), 1.5);
    document.body.style.zoom = currentZoom;
}

function toggleGrayscale() { document.body.classList.toggle('grayscale'); }
function resetAccess() { currentZoom = 1; document.body.style.zoom = 1; document.body.classList.remove('grayscale'); }

setInterval(updateTime, 1000);
updateTime();
fetchWeather();

