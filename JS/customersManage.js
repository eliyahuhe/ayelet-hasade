/* =========================================
   customersManage.js - ניהול לקוחות איילת השדה
========================================= */

let customers = [];
let currentFilter = 'all';
let currentEditId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // שליפת שם המנהל
    const cookieString = document.cookie.split(';').find(row => row.trim().startsWith('username='));
    const userName = cookieString ? decodeURIComponent(cookieString.split('=')[1]) : "מנהל מערכת";
    document.getElementById("userName").textContent = "שלום, " + userName;

    // משיכת לקוחות מהשרת בטעינה
    await loadCustomers();

    // מאזין לחיפוש
    document.getElementById('searchInput').addEventListener('input', applyFilters);
});

// פנייה לשרת למשיכת הלקוחות ממונגו
async function loadCustomers() {
    try {
        const response = await fetch('/users');
        if (!response.ok) throw new Error('שגיאה בתקשורת עם השרת');

        customers = await response.json();
        renderCustomers(customers);
    } catch (error) {
        console.error('שגיאה:', error);
        alert('לא ניתן היה לטעון את רשימת הלקוחות.');
    }
}

// פונקציית ציור הטבלה
function renderCustomers(customersToShow) {
    const container = document.getElementById("customersContainer");
    if (!container) return;

    container.innerHTML = "";

    if (customersToShow.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">לא נמצאו לקוחות מתאימים.</td></tr>`;
        return;
    }

    customersToShow.forEach(customer => {
        const customerId = customer._id;

        // עיצוב לפי סוג הרשאה (אם אין שדה role, נניח שהוא לקוח רגיל)
        const role = customer.role || 'user';
        const roleBadge = role === 'admin'
            ? '<span class="badge bg-primary text-white">מנהל</span>'
            : '<span class="badge bg-secondary text-white">לקוח רגיל</span>';

        // בתוך הפונקציה renderCustomers:
        container.innerHTML += `
    <tr>
        <td class="fw-semibold text-dark">
            <i class="bi bi-person-circle text-muted me-2"></i>${customer.username || customer.name || 'ללא שם משתמש'}
        </td>
        <td dir="ltr" class="text-end text-muted">${customer.email || 'לא הוזן'}</td>
        <td>${customer.phone || 'לא הוזן'}</td>
        <td class="text-truncate" style="max-width: 200px;">${customer.address || customer.defaultAddress || 'לא הוזן'}</td>
        <td>${roleBadge}</td>
        <td class="text-center">
            <button onclick="openEditModal('${customerId}')" class="btn btn-outline-primary btn-sm rounded-pill px-3">
                <i class="bi bi-pencil me-1"></i> ערוך
            </button>
            <button onclick="deleteCustomer('${customerId}')" class="btn btn-outline-danger btn-sm rounded-pill px-3 ms-1">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    </tr>
`;
    });
}

// סינון לקוחות
function filterCustomers(role) {
    currentFilter = role;
    applyFilters();
}

// עיצוב כפתורי הניווט
function setNavBtn(active) {
    const buttons = document.querySelectorAll(".category-btn");
    buttons.forEach(btn => { btn.classList.remove("active", "fw-bold", "text-success") });
    active.classList.add("active", "fw-bold", "text-success");
}

// חיפוש חכם 
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    let filtered = customers;

    if (currentFilter !== 'all') {
        filtered = filtered.filter(c => (c.role || 'user') === currentFilter);
    }

    if (searchTerm !== "") {
        filtered = filtered.filter(c =>
            (c.username && c.username.toLowerCase().includes(searchTerm)) ||
            (c.name && c.name.toLowerCase().includes(searchTerm)) ||
            (c.email && c.email.toLowerCase().includes(searchTerm)) ||
            (c.phone && c.phone.includes(searchTerm))
        );
    }
    renderCustomers(filtered);
}


// פתיחת חלון ריק (להוספת לקוח ידנית)
function openAddCustomerModal() {
    currentEditId = null;
    document.getElementById('modalTitle').innerText = 'הוסף לקוח חדש';
    document.getElementById('customerForm').reset();

    const modal = new bootstrap.Modal(document.getElementById('customerModal'));
    modal.show();
}

// פתיחת חלון עריכה
function openEditModal(id) {
    const customer = customers.find(c => c._id === id);
    if (!customer) return;

    currentEditId = id;
    document.getElementById('modalTitle').innerText = 'ערוך פרטי לקוח';

    document.getElementById('customerName').value = customer.name || '';
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerAddress').value = customer.address || '';
    document.getElementById('customerRole').value = customer.role || 'user';

    const modal = new bootstrap.Modal(document.getElementById('customerModal'));
    modal.show();
}

// שמירת נתונים מול השרת (POST לחדש, PUT לעדכון)
async function saveCustomer(event) {
    event.preventDefault();

    const customerData = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        address: document.getElementById('customerAddress').value,
        role: document.getElementById('customerRole').value
    };

    try {
        let response;
        if (currentEditId) {
            // עדכון לקוח קיים
            response = await fetch(`/users/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });
        } else {
            // יצירת לקוח חדש
            response = await fetch('/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });
        }

        if (!response.ok) throw new Error('שגיאה בשמירת הלקוח בשרת');

        // סגירת החלון וריענון הטבלה
        const modalEl = document.getElementById('customerModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();

        await loadCustomers();

    } catch (error) {
        console.error('שגיאה:', error);
        alert('אירעה שגיאה בשמירת הלקוח.');
    }
}

// מחיקת לקוח מול השרת
async function deleteCustomer(id) {
    if (confirm('האם אתה בטוח שברצונך למחוק לקוח זה מהמערכת? פעולה זו אינה הפיכה.')) {
        try {
            const response = await fetch(`/users/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('שגיאה במחיקת הלקוח בשרת');

            // ריענון הטבלה לאחר המחיקה
            await loadCustomers();

        } catch (error) {
            console.error('שגיאה:', error);
            alert('אירעה שגיאה במחיקת הלקוח.');
        }
    }
}