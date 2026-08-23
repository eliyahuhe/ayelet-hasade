/* =========================================
    customersManage.js - ניהול לקוחות והזמנות איילת השדה
========================================= */

let customers = [];
let orders = [];
let currentCustomerFilter = 'all';
let currentOrderUserFilter = 'all';
let currentOrderStatusFilter = 'all';
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

    // מאזין לחיפוש
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
});

// מעבר בין תצוגת לקוחות לתצוגת הזמנות
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

// שליפת לקוחות ממונגו
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

// שליפת כל ההזמנות
async function loadAdminOrders() {
    try {
        const response = await fetch('/admin/orders');
        if (!response.ok) throw new Error('שגיאה בשליפת ההזמנות');

        orders = await response.json();
        applyOrdersFilters();
    } catch (error) {
        console.error('שגיאה בטעינת הזמנות:', error);
    }
}

// ציור טבלת הלקוחות
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

// ציור טבלת ההזמנות (ללא בוטל)
function renderAdminOrders(ordersToShow) {
    const tbody = document.getElementById('adminOrdersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (ordersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4 fw-semibold">אין הזמנות להצגה.</td></tr>';
        return;
    }

    ordersToShow.forEach(order => {
        const row = document.createElement('tr');
        const dbId = order._id?.$oid || order._id || order.orderId;
        const dateStr = order.createdAt ? new Date(order.createdAt.$date || order.createdAt).toLocaleString('he-IL') : 'לא ידוע';

        // זיהוי אורח / רשום
        let customerDisplay = 'לקוח לא ידוע';
        const isGuest = order.username === 'אורח' || (order.customerDetails && order.customerDetails.name);

        if (isGuest) {
            const guestName = order.customerDetails?.name || 'אורח';
            const guestPhone = order.customerDetails?.phone ? `<br><small class="text-muted">(${order.customerDetails.phone})</small>` : '';
            customerDisplay = `<span class="badge bg-warning text-dark mb-1">אורח</span><br><strong>${guestName}</strong>${guestPhone}`;
        } else {
            const registeredName = order.customerDetails?.registeredUsername || order.username || 'רשום';
            customerDisplay = `<span class="badge bg-success text-white mb-1">רשום</span><br><strong>${registeredName}</strong>`;
        }

        const deliveryDisplay = order.deliveryType === 'delivery'
            ? `<span class="badge bg-light text-dark border">משלוח</span><br><small>${order.address || ''}</small>`
            : '<span class="badge bg-light text-dark border">איסוף עצמי</span>';

        const currentStatus = order.status || 'pending';

        row.innerHTML = `
            <td class="fw-bold text-primary">${order.orderId || 'N/A'}</td>
            <td>${customerDisplay}</td>
            <td>${deliveryDisplay}</td>
            <td class="fw-bold text-success fs-6">₪${order.total || 0}</td>
            <td><small class="text-muted">${dateStr}</small></td>
            <td>
                <!-- עריכת סטטוס בלייב (רק בהמתנה והושלם) -->
                <select class="form-select form-select-sm status-select status-${currentStatus}" onchange="updateOrderStatus('${dbId}', this.value)">
                    <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>⏳ בהמתנה</option>
                    <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>✅ הושלם</option>
                </select>
            </td>
            <td>
                <!-- כפתור פרטים -->
                <button class="btn btn-outline-info btn-sm rounded-pill px-3 shadow-sm" onclick="viewOrderDetails('${order.orderId}')">
                    <i class="bi bi-eye-fill me-1"></i> פרטים
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// עדכון סטטוס ההזמנה בשרת
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('שגיאה בעדכון הסטטוס');

        // עדכון מקומי בזיכרון
        const order = orders.find(o => (o._id?.$oid || o._id || o.orderId) === orderId || o._id === orderId);
        if (order) order.status = newStatus;

        applyOrdersFilters();
    } catch (error) {
        console.error('שגיאה:', error);
        alert('אירעה שגיאה בעדכון סטטוס ההזמנה.');
    }
}

// פתיחת מודאל לצפייה בפרטי ההזמנה
function viewOrderDetails(orderId) {
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    const modalContent = document.getElementById('orderDetailsModalContent');
    const isGuest = order.username === 'אורח' || (order.customerDetails && order.customerDetails.name);
    const dateStr = order.createdAt ? new Date(order.createdAt.$date || order.createdAt).toLocaleString('he-IL') : 'לא ידוע';

    let customerInfoHTML = '';
    if (isGuest) {
        customerInfoHTML = `
            <p class="mb-1"><strong>סוג לקוח:</strong> <span class="badge bg-warning text-dark">אורח</span></p>
            <p class="mb-1"><strong>שם מלא:</strong> ${order.customerDetails?.name || 'אורח'}</p>
            <p class="mb-1"><strong>טלפון:</strong> ${order.customerDetails?.phone || 'לא הוזן'}</p>
        `;
    } else {
        customerInfoHTML = `
            <p class="mb-1"><strong>סוג לקוח:</strong> <span class="badge bg-success text-white">משתמש רשום</span></p>
            <p class="mb-1"><strong>שם משתמש:</strong> ${order.username}</p>
        `;
    }

    const itemsHTML = (order.items || []).map(item => `
        <tr>
            <td class="text-start fw-semibold">${item.name || 'מוצר (ID: ' + (item.id || item.productId) + ')'}</td>
            <td class="text-center fw-bold text-success">${item.quantity}</td>
        </tr>
    `).join('');

    modalContent.innerHTML = `
        <div class="row g-3 mb-4">
            <div class="col-md-6 border-end">
                <h6 class="fw-bold text-success border-bottom pb-2 mb-3">פרטי ההזמנה</h6>
                <p class="mb-1"><strong>מספר הזמנה:</strong> <span class="text-primary fw-bold">${order.orderId}</span></p>
                <p class="mb-1"><strong>תאריך:</strong> ${dateStr}</p>
                <p class="mb-1"><strong>סוג משלוח:</strong> ${order.deliveryType === 'delivery' ? 'משלוח' : 'איסוף עצמי'}</p>
                <p class="mb-1"><strong>כתובת:</strong> ${order.address || 'לא צוינה'}</p>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold text-success border-bottom pb-2 mb-3">פרטי הלקוח</h6>
                ${customerInfoHTML}
            </div>
        </div>

        <h6 class="fw-bold text-dark text-center mb-3">פריטים בהזמנה</h6>
        
        <!-- טבלה ממורכזת בגודל קומפקטי -->
        <div class="modal-order-table shadow-sm">
            <table class="table align-middle">
                <thead>
                    <tr>
                        <th class="text-start">שם המוצר</th>
                        <th class="text-center" style="width: 130px;">כמות</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>

        <div class="text-end fw-bold fs-5 text-success mt-4 pt-3 border-top">
            סה"כ לתשלום: ₪${order.total || 0}
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modal.show();
}

// סינון לפי אורח/רשום
function filterOrdersUserType(filterType) {
    currentOrderUserFilter = filterType;

    document.getElementById('btnFilterAllOrders').classList.toggle('active', filterType === 'all');
    document.getElementById('btnFilterRegisteredOrders').classList.toggle('active', filterType === 'registered');
    document.getElementById('btnFilterGuestOrders').classList.toggle('active', filterType === 'guest');

    applyOrdersFilters();
}

// סינון לפי סטטוס הזמנה (בהמתנה / הושלם)
function filterOrdersStatus(statusType) {
    currentOrderStatusFilter = statusType;

    document.getElementById('btnStatusAll').classList.toggle('active', statusType === 'all');
    document.getElementById('btnStatusPending').classList.toggle('active', statusType === 'pending');
    document.getElementById('btnStatusCompleted').classList.toggle('active', statusType === 'completed');

    applyOrdersFilters();
}

// הפעלת המסננים המשולבים
function applyOrdersFilters() {
    let filtered = orders;

    // סינון לפי סוג לקוח
    if (currentOrderUserFilter === 'registered') {
        filtered = filtered.filter(o => o.username !== 'אורח' && (!o.customerDetails || !o.customerDetails.name));
    } else if (currentOrderUserFilter === 'guest') {
        filtered = filtered.filter(o => o.username === 'אורח' || (o.customerDetails && o.customerDetails.name));
    }

    // סינון לפי סטטוס
    if (currentOrderStatusFilter !== 'all') {
        filtered = filtered.filter(o => (o.status || 'pending') === currentOrderStatusFilter);
    }

    // סינון לפי חיפוש
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm !== "") {
        filtered = filtered.filter(o =>
            (o.orderId && o.orderId.toLowerCase().includes(searchTerm)) ||
            (o.username && o.username.toLowerCase().includes(searchTerm)) ||
            (o.customerDetails?.name && o.customerDetails.name.toLowerCase().includes(searchTerm)) ||
            (o.customerDetails?.phone && o.customerDetails.phone.includes(searchTerm))
        );
    }

    renderAdminOrders(filtered);
}

// סינון לקוחות
function filterCustomers(role) {
    currentCustomerFilter = role;
    applyFilters();
}

// חיפוש חכם
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    // חיפוש בטבלת לקוחות
    let filteredCust = customers;
    if (currentCustomerFilter !== 'all') {
        filteredCust = filteredCust.filter(c => (c.role || 'user') === currentCustomerFilter);
    }
    if (searchTerm !== "") {
        filteredCust = filteredCust.filter(c =>
            (c.username && c.username.toLowerCase().includes(searchTerm)) ||
            (c.name && c.name.toLowerCase().includes(searchTerm)) ||
            (c.email && c.email.toLowerCase().includes(searchTerm)) ||
            (c.phone && c.phone.includes(searchTerm))
        );
    }
    renderCustomers(filteredCust);

    // חיפוש בטבלת הזמנות
    applyOrdersFilters();
}

// פתיחת חלון להוספת לקוח
function openAddCustomerModal() {
    currentEditId = null;
    document.getElementById('modalTitle').innerText = 'הוסף לקוח חדש';
    document.getElementById('customerForm').reset();

    const modal = new bootstrap.Modal(document.getElementById('customerModal'));
    modal.show();
}

// פתיחת חלון לעריכת לקוח
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

// שמירת לקוח בשרת
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