/* =========================================
   productsManage.js - ממשק הניהול של איילת השדה
========================================= */

let products = [];
let currentFilter = 'all';
let isDeleteMode = false;
let currentEditId = null;

// שליפת שם המנהל מהעוגייה (Cookie)
const cookieString = document.cookie.split(';').find(row => row.trim().startsWith('username='));
const userName = cookieString ? decodeURIComponent(cookieString.split('=')[1]) : "מנהל מערכת";
document.getElementById("userName").textContent = "שלום, " + userName;

// 1. טעינת נתונים מהשרת בטעינת הדף
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();

    // מאזין לשורת החיפוש בזמן אמת
    document.getElementById('searchInput').addEventListener('input', applyFilters);
});

// פנייה לשרת למשיכת כל המוצרים
async function loadProducts() {
    try {
        const response = await fetch('/products');
        if (!response.ok) throw new Error('שגיאה בתקשורת עם השרת');

        products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.error('שגיאה במשיכת המוצרים:', error);
        alert('לא ניתן היה לטעון את המוצרים מהשרת.');
    }
}

// ==========================================
// פונקציות תצוגה
// ==========================================

function renderProducts(productsToShow) {
    const container = document.getElementById("productsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (productsToShow.length === 0) {
        container.innerHTML = '<div class="col-12 text-center mt-5 text-muted">לא נמצאו מוצרים.</div>';
        return;
    }

    productsToShow.forEach(product => {
        // מזהה אם המוצר ממונגו (_id) או מקומי (id)
        const productId = product._id || product.id;

        // הצגה או הסתרה של כפתור המחיקה בהתאם למצב
        const deleteBtnClass = isDeleteMode ? '' : 'd-none';
        
        // הגדרת המלאי, סוג היחידה וההתראות הוויזואליות
        const stockStatus = (product.stock !== undefined) ? product.stock : 0;
        const stockColor = stockStatus <= 5 ? 'text-danger fw-bold' : 'text-muted';
        
        // קביעת טקסט המידה (ק״ג, יחידות, מארזים) - ברירת מחדל היא ק״ג
        const unitText = product.unit || 'ק״ג';
        
        // התאמת תווית המחיר (לק״ג / ליחידה / למארז)
        let priceLabel = 'לק״ג';
        if (unitText === 'יחידות') priceLabel = 'ליחידה';
        if (unitText === 'מארזים') priceLabel = 'למארז';

        container.innerHTML += `
            <div class="col-auto">
                <div class="card shadow-sm product-card">
                    <!-- תמונה -->
                    <img src="${product.image}" class="card-img-top product-img" alt="${product.name}">

                    <div class="card-body d-flex flex-column justify-content-between text-center">
                        
                        <!-- שם, מחיר ומלאי דינמי -->
                        <div>
                            <h6 class="fw-bold mb-1">${product.name}</h6>
                            <div class="text-success fw-semibold small">
                                ₪${product.price} ${priceLabel}
                            </div>
                            <div class="small mt-1 ${stockColor}">
                                במלאי: ${stockStatus} ${unitText}
                            </div>
                        </div>

                        <!-- כפתורי ניהול -->
                        <div class="d-flex justify-content-center align-items-center gap-2 mt-2">
                            <button onclick="openEditModal('${productId}')" class="btn btn-outline-primary btn-sm rounded-pill px-3 fw-semibold flex-grow-1">
                                <i class="bi bi-pencil me-1"></i> ערוך
                            </button>
                            <button onclick="deleteProduct('${productId}')" class="btn btn-danger btn-sm rounded-pill px-3 fw-semibold flex-grow-1 ${deleteBtnClass}">
                                <i class="bi bi-trash me-1"></i> מחק
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        `;
    });
}

// סינון והדגשת כפתורי ניווט
function filterproducts(category) {
    currentFilter = category;
    applyFilters();
}

function setNavBtn(active) {
    const buttons = document.querySelectorAll(".category-btn");
    buttons.forEach(btn => { btn.classList.remove("active", "fw-bold", "text-success") });
    active.classList.add("active", "fw-bold", "text-success");
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let filtered = products;

    if (currentFilter !== 'all') {
        filtered = filtered.filter(product => product.category === currentFilter);
    }

    if (searchTerm !== "") {
        filtered = filtered.filter(product => product.name.toLowerCase().includes(searchTerm));
    }

    renderProducts(filtered);
}

// ==========================================
// פונקציות ניהול מול השרת (API)
// ==========================================

function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    applyFilters();
}

function toggleEditMode() {
    toggleDeleteMode();
}

// פתיחת חלון ריק ליצירת מוצר
function openAddProductModal() {
    currentEditId = null;
    document.getElementById('modalTitle').innerText = 'הוסף מוצר חדש';
    document.getElementById('productForm').reset();
    
    // הגדרת ברירת המחדל לסוג היחידה (ק״ג) בפתיחת חלון חדש
    document.getElementById('productUnit').value = 'ק״ג';

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

// פתיחת חלון לעריכת מוצר קיים
function openEditModal(id) {
    const product = products.find(p => (p._id === id || p.id === id));
    if (!product) return;

    currentEditId = id;
    document.getElementById('modalTitle').innerText = 'ערוך מוצר';

    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productImage').value = product.image;
    
    // מילוי שדה המלאי וסוג היחידה בעריכה
    document.getElementById('productStock').value = product.stock !== undefined ? product.stock : 0;
    document.getElementById('productUnit').value = product.unit || 'ק״ג';

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

// שמירה לשרת (POST לחדש, PUT לעדכון)
async function saveProduct(event) {
    event.preventDefault();

    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: Number(document.getElementById('productStock').value),
        unit: document.getElementById('productUnit').value, // שליפת סוג היחידה מהטופס
        category: document.getElementById('productCategory').value,
        image: document.getElementById('productImage').value
    };

    try {
        let response;
        if (currentEditId) {
            // עדכון מוצר קיים
            response = await fetch(`/products/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
        } else {
            // יצירת מוצר חדש
            response = await fetch('/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
        }

        if (!response.ok) throw new Error('שגיאה בשמירת המוצר בשרת');

        // סגירת החלון וריענון הנתונים
        const modalEl = document.getElementById('productModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();

        await loadProducts(); // משיכת הרשימה המעודכנת

    } catch (error) {
        console.error('שגיאה:', error);
        alert('אירעה שגיאה בשמירת המוצר.');
    }
}

// מחיקת מוצר מול השרת (DELETE)
async function deleteProduct(id) {
    if (confirm('האם אתה בטוח שברצונך למחוק מוצר זה מהמלאי?')) {
        try {
            const response = await fetch(`/products/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('שגיאה במחיקת המוצר בשרת');

            await loadProducts(); // משיכת הרשימה המעודכנת
        } catch (error) {
            console.error('שגיאה:', error);
            alert('אירעה שגיאה במחיקת המוצר.');
        }
    }
}