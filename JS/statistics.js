document.addEventListener("DOMContentLoaded", () => {
    fetchStatistics(); 
});

let revenueChartInst = null;
let productsPieInst = null;
let productsBarInst = null;

async function fetchStatistics() {
    const period = document.getElementById('timeFilter').value; 
    
    try {
        const response = await fetch(`/api/admin/statistics?period=${period}`);
        if (!response.ok) throw new Error("שגיאה במשיכת הנתונים מהשרת");
        
        const data = await response.json();
        
        // 1. עדכון כרטיסיות נתוני העל
        document.getElementById('totalRevenueBox').innerText = `₪${(data.totalRevenue || 0).toLocaleString()}`;
        document.getElementById('totalOrdersBox').innerText = (data.totalOrders || 0).toLocaleString();
        document.getElementById('avgOrderBox').innerText = `₪${(data.avgOrder || 0).toLocaleString()}`;
        document.getElementById('totalUsersBox').innerText = (data.totalUsers || 0).toLocaleString();

        // 2. עיבוד נתוני הגרף היומי (מכירות)
        const revenueLabels = data.revenueByDay.map(item => item._id);
        const revenueValues = data.revenueByDay.map(item => item.totalAmount);
        
        if (revenueLabels.length === 0) {
            revenueLabels.push("אין נתונים");
            revenueValues.push(0);
        }
        drawRevenueChart(revenueLabels, revenueValues);

        // 3. חילוץ נתוני המוצרים לגרפים (5 המובילים בלבד)
        const allProducts = data.productStats || [];
        const top5 = allProducts.slice(0, 5); // חותך רק את ה-5 הראשונים
        
        const prodLabels = top5.map(item => item._id);
        const prodValues = top5.map(item => item.totalSold);
        
        if (prodLabels.length === 0) {
            prodLabels.push("אין נתונים");
            prodValues.push(0);
        }
        
        drawTopProductsPie(prodLabels, prodValues);
        drawTopProductsBar(prodLabels, prodValues);

        // 4. בניית טבלת הפירוט המלאה לכל המוצרים
        renderProductsTable(allProducts);

    } catch (error) {
        console.error("שגיאה בהבאת נתונים סטטיסטיים:", error);
    }
}

// פונקציה לבניית שורות הטבלה למכירות לפי מוצר
function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = ''; // ניקוי הטבלה לפני מילוי מחדש

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-muted">אין נתוני מכירות לתקופה זו.</td></tr>';
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        
        // תמיכה בהצגת הכנסה
        const revenueText = (product.revenue && product.revenue > 0) 
                            ? `₪${product.revenue.toLocaleString()}` 
                            : '-';

        row.innerHTML = `
            <td class="fw-bold text-dark">${product._id}</td>
            <td>${product.totalSold}</td>
            <td class="text-success fw-bold">${revenueText}</td>
        `;
        tbody.appendChild(row);
    });
}

// ----------------------------------------------------
// פונקציות עזר לציור הגרפים באמצעות Chart.js
// ----------------------------------------------------

function drawRevenueChart(labels, data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInst) revenueChartInst.destroy();

    revenueChartInst = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: labels,
            datasets: [{
                label: 'הכנסות (₪)',
                data: data,
                borderColor: '#198754', 
                backgroundColor: 'rgba(25, 135, 84, 0.1)', 
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#198754'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function drawTopProductsPie(labels, data) {
    const ctx = document.getElementById('topProductsPieChart').getContext('2d');
    if (productsPieInst) productsPieInst.destroy();

    productsPieInst = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', rtl: true } }
        }
    });
}

function drawTopProductsBar(labels, data) {
    const ctx = document.getElementById('topProductsBarChart').getContext('2d');
    if (productsBarInst) productsBarInst.destroy();

    productsBarInst = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: labels,
            datasets: [{
                label: 'כמות שנמכרה',
                data: data,
                backgroundColor: 'rgba(13, 110, 253, 0.7)',
                borderColor: '#0d6efd',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y', 
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}