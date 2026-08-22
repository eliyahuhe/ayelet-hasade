let products = [];

// פונקציה להצגת שם המשתמש
function displayUserName() {
    const userName = localStorage.getItem('username') || "אורח";
    const userNameElement = document.getElementById("userName");
    if (userNameElement) {
        userNameElement.textContent = "HI, " + userName;
    }
}

async function loadProducts() {
    try {
        const response = await fetch('/products');

        if (!response.ok) {
            throw new Error('שגיאה בתקשורת עם השרת');
        }

        products = await response.json();

        renderProducts(products);

        if (typeof renderCart === 'function') {
            renderCart();
        }

    } catch (error) {
        console.error('שגיאה במשיכת המוצרים:', error);
    }
}

/* פונק' להדפסת הכרטיסים */
function renderProducts(productsToShow) {
    const container = document.getElementById("productsContainer");
    if (!container) return;
    container.innerHTML = "";
    productsToShow.forEach(product => {
        container.innerHTML += `
            <div class="col-auto">
                <div class="card shadow-sm product-card">
                    <img src="${product.image}" class="card-img-top product-img" alt="${product.name}">

                    <div class="card-body d-flex flex-column justify-content-between text-center">

                        <div>
                            <h6 class="fw-bold mb-1">${product.name}</h6>
                            <div class="text-success fw-semibold small">
                                ₪${product.price} לק״ג
                            </div>
                        </div>

                        <div class="d-flex justify-content-center align-items-center gap-2">

                            <button onclick="removeFromCart('${product.id}')" class="btn btn-outline-success btn-sm rounded-circle">
                                <i class="bi bi-dash"></i>
                            </button>

                            <div class="border rounded-pill px-3 py-1 small fw-semibold">
                                הוסף לסל
                            </div>

                            <button onclick="addToCart('${product.id}')" class="btn btn-success btn-sm rounded-circle">
                                <i class="bi bi-plus"></i>
                            </button>

                        </div>

                    </div>
                </div>
            </div>
        `;
    });
}

function filterproducts(category) {
    if (category === "all") {
        renderProducts(products);
    } else {
        const filtered = products.filter(product => product.category === category);
        renderProducts(filtered);
    }
}

/* קריאה לפונקציית הטעינה רק שה-DOM מוכן */
document.addEventListener("DOMContentLoaded", async function () {
    displayUserName(); // הצגת שם המשתמש
    await loadProducts();
});

function setNavBtn(active) {
    const buttons = document.querySelectorAll(".category-btn");
    buttons.forEach(btn => { btn.classList.remove("active", "fw-bold", "text-success") });
    active.classList.add("active", "fw-bold", "text-success");
}

const input = document.getElementById("searchInput");
if (input) {
    input.addEventListener("input", function () {
        const value = this.value.toLowerCase();

        if (value === "") {
            renderProducts(products);
        } else {
            const arrSearch = products.filter(product => product.name.toLowerCase().includes(value));
            renderProducts(arrSearch);
        }
    });
}

function moveToCheckout() {
    let cart = JSON.parse(localStorage.getItem("products")) || [];

    if (cart.length === 0) {
        alert("העגלה ריקה, יש להוסיף מוצרים לפני מעבר לתשלום");
        return;
    }

    window.location.href = "checkout.html";
}