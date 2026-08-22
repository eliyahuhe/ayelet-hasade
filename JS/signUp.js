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