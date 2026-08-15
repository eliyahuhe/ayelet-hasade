async function singin(event) {
    event.preventDefault();
    const user = document.getElementById('username').value;
    const phone = document.getElementById('phone').value;
    const pass = document.getElementById('password').value;
    const pass2 = document.getElementById('confirmPassword').value;
    if (pass !== pass2) {
        alert('סיסמה לא תואמת');
        return;
    }
    else {
        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: user, phone: phone, password: pass })
            });
            if (response.ok) {
                alert('ההרשמה הצליחה!');
            } else {
                alert('התרחשה שגיאה בהרשמה.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('התרחשה שגיאה בהרשמה.');
        }
    }

};

