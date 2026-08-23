document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  loadUserOrders();
});

// 1. טעינת פרטי המשתמש מה-DB
async function loadUserProfile() {
  try {
    const res = await fetch('/api/user/profile');
    if (!res.ok) {
      if (res.status === 401) window.location.href = '/';
      return;
    }
    const data = await res.json();

    // הצגת שם משתמש בבר העליון
    document.getElementById('userName').innerText = `שלום, ${data.username}`;

    // הצגת אימייל
    const emailVal = data.email || 'לא הוגדר';
    document.getElementById('emailDisplay').innerText = emailVal;
    document.getElementById('emailInput').value = emailVal;

    // הצגת טלפון
    document.getElementById('phoneDisplay').innerText = data.phone;
    document.getElementById('phoneInput').value = data.phone;

    // הצגת כתובת ברירת מחדל
    const addrVal = data.defaultAddress || 'לא הוגדרה כתובת';
    document.getElementById('addressDisplay').innerText = addrVal;
    document.getElementById('addressDisplay').title = addrVal;
    document.getElementById('addressInput').value = data.defaultAddress || '';

    // חישוב וותק
    if (data.createdAt) {
      const year = new Date(data.createdAt).getFullYear();
      document.getElementById('profileMemberSince').innerText = `לקוח מ-${year}`;
    } else {
      document.getElementById('profileMemberSince').innerText = 'לקוח רשום';
    }
  } catch (err) {
    console.error('שגיאה בטעינת פרטי פרופיל:', err);
  }
}

// 2. שמירת אימייל מעודכן ב-DB
async function saveEmail() {
  const newEmail = document.getElementById('emailInput').value.trim();
  if (!newEmail || !newEmail.includes('@')) return alert('נא להזין כתובת אימייל תקינה');

  try {
    const res = await fetch('/api/user/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail })
    });

    const data = await res.json();
    if (res.ok) {
      document.getElementById('emailDisplay').innerText = newEmail;
      toggleEditEmail();
    } else {
      alert(data.error || 'שגיאה בעדכון האימייל');
    }
  } catch (err) {
    console.error('שגיאה בעדכון אימייל:', err);
  }
}

function toggleEditEmail() {
  document.getElementById('emailEditBox').classList.toggle('d-none');
}

// 3. שמירת טלפון מעודכן ב-DB
async function savePhone() {
  const newPhone = document.getElementById('phoneInput').value.trim();
  if (!newPhone) return alert('נא להזין מספר טלפון תקין');

  try {
    const res = await fetch('/api/user/phone', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: newPhone })
    });

    const data = await res.json();
    if (res.ok) {
      document.getElementById('phoneDisplay').innerText = newPhone;
      toggleEditPhone();
    } else {
      alert(data.error || 'שגיאה בעדכון הטלפון');
    }
  } catch (err) {
    console.error('שגיאה בעדכון טלפון:', err);
  }
}

function toggleEditPhone() {
  document.getElementById('phoneEditBox').classList.toggle('d-none');
}

// 4. שמירת כתובת ברירת מחדל ב-DB
async function saveAddress() {
  const newAddress = document.getElementById('addressInput').value.trim();

  try {
    const res = await fetch('/api/user/address', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: newAddress })
    });

    const data = await res.json();
    if (res.ok) {
      document.getElementById('addressDisplay').innerText = newAddress || 'לא הוגדרה כתובת';
      document.getElementById('addressDisplay').title = newAddress;
      toggleEditAddress();
    } else {
      alert(data.error || 'שגיאה בעדכון הכתובת');
    }
  } catch (err) {
    console.error('שגיאה בעדכון כתובת:', err);
  }
}

function toggleEditAddress() {
  document.getElementById('addressEditBox').classList.toggle('d-none');
}

// 5. טעינת היסטוריית ההזמנות מה-DB (מתוקן)
async function loadUserOrders() {
  const accordion = document.getElementById('ordersAccordion');
  const noOrdersAlert = document.getElementById('noOrdersAlert');

  try {
    const res = await fetch('/api/user/orders');
    if (!res.ok) return;

    const orders = await res.json();

    if (!orders || orders.length === 0) {
      accordion.innerHTML = '';
      noOrdersAlert.classList.remove('d-none');
      return;
    }

    noOrdersAlert.classList.add('d-none');
    accordion.innerHTML = orders.map((order, index) => {
      const orderDate = new Date(order.createdAt).toLocaleDateString('he-IL');
      const collapseId = `orderCollapse_${index}`;

      const itemsRows = (order.items || []).map(item => {
        const itemPrice = Number(item.price || 0);
        const itemQty = Number(item.quantity || 0);
        const itemTotal = itemPrice * itemQty;

        return `
          <tr>
            <td class="text-start fw-semibold">${item.name || 'מוצר'}</td>
            <td class="text-center">${itemQty} ק״ג</td>
            <td class="text-center">₪${itemPrice.toFixed(2)}</td>
            <td class="text-start fw-bold" style="color: rgb(0, 83, 80);">₪${itemTotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      let deliveryDetails = order.deliveryType === 'delivery'
        ? `משלוח עד הבית (${typeof order.address === 'object' ? Object.values(order.address).filter(Boolean).join(', ') : order.address})`
        : 'איסוף עצמי (משק 46, ברכיה)';

      return `
        <div class="accordion-item mb-3 border rounded-3 overflow-hidden shadow-sm">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed py-3" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
              <div class="d-flex justify-content-between align-items-center w-100 me-3">
                <div>
                  <strong>הזמנה #${order.orderId || (index + 1)}</strong>
                  <small class="text-muted ms-2">(${orderDate})</small>
                </div>
                <div class="fw-bold text-success me-3">₪${Number(order.total || 0).toFixed(2)}</div>
              </div>
            </button>
          </h2>
          <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#ordersAccordion">
            <div class="accordion-body bg-light-subtle">
              <p class="mb-2"><strong>סוג קבלה:</strong> ${deliveryDetails}</p>
              
              <div class="table-responsive">
                <table class="table table-sm align-middle mt-2 bg-white rounded shadow-sm">
                  <thead class="table-light">
                    <tr>
                      <th class="text-start">מוצר</th>
                      <th class="text-center">כמות</th>
                      <th class="text-center">מחיר לק״ג</th>
                      <th class="text-start">סה״כ</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsRows}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('שגיאה בטעינת ההזמנות:', err);
  }
}