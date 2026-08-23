/* =========================================
    customersManage.js - ניהול לקוחות והזמנות איילת השדה
========================================= */

let customers = [];
let orders = [];
let currentFilter = 'all';
let currentEditId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // שליפת שם המנהל
    const cookieString = document.cookie.split(';').find(row => row.trim().startsWith('username='));
    const userName = cookieString ? decodeURIComponent(cookieString.split('=')[1]) : "מנהל מערכת";
    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.textContent = "שלום, " + userName;

    // משיכת לקוחות והזמנות מהשרת בטעינה
    await loadCustomers();
    await loadAdminOrders();

    // מאזין לחיפוש לקוחות
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
});

// פונקציית מעבר בין תצוגת לקוחות לתצוגת הזמנות מתוך בר המשנה
function switchView(viewType) {
    const secCust = document.getElementById('viewCustomers');
    const secOrd = document.getElementById('viewOrders');
    const tabCust = document.getElementById('navTabCustomers');
    const tabOrd = document.getElementById('navTabOrders');

    if (viewType === 'customers') {
        secCust.style.display = 'block';
        secOrd.style.display = 'none';
        tabCust.classList.add('active', 'fw-bold', 'text-success');
        tabCust.classList.remove('text-secondary');
        tabOrd.classList.remove('active', 'fw-bold', 'text-success');
        tabOrd.classList.add('text-secondary');
    } else {
        secCust.style.display = 'none';
        secOrd.style.display = 'block';
        tabOrd.classList.add('active', 'fw-bold', 'text-success');
        tabOrd.classList.remove('text-secondary');
        tabCust.classList.remove('active', 'fw-bold', 'text-success');
        tabCust.classList.add('text-secondary');
    }
}

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

// פנייה לשרת למשיכת כל ההזמנות (רשומים + אורחים)
async function loadAdminOrders() {
    try {
        const response = await fetch('/admin/orders');
        if (!response.ok) throw new Error('שגיאה בשליפת ההזמנות');

        orders = await response.json();
        renderAdminOrders(orders);
    } catch (error) {
        console.error('שגיאה בטעינת הזמנות:', error);
    }
}

// פונקציית ציור טבלת הלקוחות
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
        const role = customer.role || 'user';
        const roleBadge = role === 'admin'
            ? '<span class="badge bg-primary text-white">מנהל</span>'
            : '<span class="badge bg-secondary text-white">לקוח רגיל</span>';

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
        </tr>`;
    });
}

// פונקציית ציור טבלת ההזמנות (תומכת באורחים ורשומים)
function renderAdminOrders(ordersToShow) {
    const tbody = document.getElementById('adminOrdersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (ordersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">אין הזמנות במערכת כרגע.</td></tr>';
        return;
    }

    ordersToShow.forEach(order => {
        const row = document.createElement('tr');
        
        const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('he-IL') : 'לא ידוע';

        // הבחנה בין אורח למשתמש רשום
        let customerDisplay = 'לקוח לא ידוע';
        if (order.username === 'אורח' || (order.customerDetails && order.customerDetails.name)) {
            const guestName = order.customerDetails?.name || 'אורח';
            const guestPhone = order.customerDetails?.phone ? ` (${order.customerDetails.phone})` : '';
            customerDisplay = `<span class="badge bg-warning text-dark me-1">אורח</span> ${guestName}${guestPhone}`;
        } else if (order.username) {
            customerDisplay = `<span class="badge bg-success text-white me-1">רשום</span> ${order.username}`;
        }

        const itemsList = (order.items || []).map(item => `${item.name || 'מוצר'} (${item.quantity})`).join(', ');

        row.innerHTML = `
            <td class="fw-bold text-primary">${order.orderId || 'N/A'}</td>
            <td>${customerDisplay}</td>
            <td><small>${order.deliveryType === 'delivery' ? 'משלוח: ' + order.address : 'איסוף עצמי'}</small></td>
            <td><small class="text-muted text-truncate d-inline-block" style="max-width: 200px;" title="${itemsList}">${itemsList}</small></td>
            <td class="fw-bold text-success">₪${order.total || 0}</td>
            <td><small>${dateStr}</small></td>
            <td><span class="badge bg-info text-dark">${order.status || 'pending'}</span></td>
        `;

        tbody.appendChild(row);
    });
}

// סינון לקוחות
function filterCustomers(role) {
    currentFilter = role;
    applyFilters();
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

    document.getElementById('customerName').value = customer.name || customer.username || '';
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerAddress').value = customer.address || customer.defaultAddress || '';
    document.getElementById('customerRole').value = customer.role || 'user';

    const modal = new bootstrap.Modal(document.getElementById('customerModal'));
    modal.show();
}

// שמירת נתונים מול השרת
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
            response = await fetch(`/users/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });
        } else {
            response = await fetch('/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });
        }

        if (!response.ok) throw new Error('שגיאה בשמירת הלקוח בשרת');

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

            await loadCustomers();

        } catch (error) {
            console.error('שגיאה:', error);
            alert('אירעה שגיאה במחיקת הלקוח.');
        }
    }
}