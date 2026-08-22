function renderCart() {
    let cart = getCart();
    let container = document.getElementById("cartItems");
    let total = 0;

    if (!container) return;

    container.innerHTML = "";

    if (cart.length === 0) {
        container.innerHTML = ` <div id="emptyCart" class="d-flex align-items-center justify-content-center h-100">
                                <div class="text-center">
                                    <i class="bi bi-cart-x" style="font-size:48px; color:rgb(0,83,80);"></i>
                                    <div class="fw-semibold mt-2">
                                        סל הקניות שלכם ריק
                                    </div>
                                    <div class="text-muted small">
                                        התחילו להוסיף מוצרים
                                    </div>
                                </div>
                            </div>`;

        const cartSum = document.getElementById("cartSum");
        if (cartSum) cartSum.textContent = "₪" + total.toFixed(2);
        return;
    }

    cart.forEach(item => {
        let product = products.find(p => String(p.id) === String(item.id));
        if (!product) return;
        total += item.quantity * product.price;
        container.innerHTML += `<div class="d-flex align-items-center border-bottom py-3 position-relative" style="padding-left: 35px;">
    
   <button class="btn p-0 text-danger position-absolute"
        style="left: 5px; top: 50%; transform: translateY(-50%); text-decoration: none;"
        onclick="deleteProduct('${item.id}')"
        title="הסר מוצר">
    <i class="bi bi-trash"></i>
</button>

    <img src="/image/cart/${product.name}.JPG" onerror="this.onerror=null; this.src='https://via.placeholder.com/50';" alt="${product.name}" class="rounded-circle flex-shrink-0" style="width: 38px; height: 38px; object-fit: cover; margin-left: 10px;">

    <div class="fw-semibold small text-dark flex-grow-1 text-truncate" style="min-width: 0;" title="${product.name}">
        ${product.name}
    </div>

   <div class="d-flex align-items-center border rounded-pill flex-shrink-0 bg-light ms-2 qty-control">
    <button class="btn btn-sm px-2 py-0 border-0 text-muted"
        onclick="addToCart('${item.id}')">+</button>

    <div class="flex-grow-1 text-center small fw-semibold" style="line-height: 1;">
        ${item.quantity}
    </div>

    <button class="btn btn-sm px-2 py-0 border-0 text-muted"
        onclick="removeFromCart('${item.id}')">-</button>
</div>

    <div class="fw-bold small text-end flex-shrink-0" style="color:rgb(0, 83, 80); width: 45px;">
        ₪${parseFloat(item.quantity * product.price).toFixed(2)}
    </div>

</div>`;
    });

    const cartSum = document.getElementById("cartSum");
    if (cartSum) cartSum.textContent = "₪" + total.toFixed(2);
}

function getCart() {
    const raw = JSON.parse(localStorage.getItem("products")) || [];
    const map = {};
    raw.forEach(item => {
        const key = String(item.id);
        if (map[key] !== undefined) {
            map[key].quantity += item.quantity;
        } else {
            map[key] = { ...item };
        }
    });
    const merged = Object.values(map);
    if (merged.length !== raw.length) {
        localStorage.setItem("products", JSON.stringify(merged));
    }
    return merged;
}

async function syncCartWithServer(productId, quantity) {
    const username = localStorage.getItem('username');
    if (!username) return;

    try {
        await fetch('/cart/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, productId, quantity })
        });
    } catch (err) {
        console.error('שגיאה בעדכון העגלה בשרת:', err);
    }
}

function saveCart(cartProducts) {
    localStorage.setItem("products", JSON.stringify(cartProducts));
}

function addToCart(id) {
    let cart = getCart();
    let originalProduct = products.find(p => String(p.id) === String(id));
    let product = cart.find(p => String(p.id) === String(id));

    if (!originalProduct) return;

    let stock = originalProduct.stock;
    let newQuantity = 0;

    if (!product && stock >= 0.5) {
        newQuantity = 0.5;
        cart.push({ id: id, quantity: newQuantity });
    } else if (product && product.quantity + 0.5 <= stock) {
        product.quantity += 0.5;
        newQuantity = product.quantity;
    } else {
        alert("המוצר לא זמין בכמות המבוקשת");
        return;
    }

    saveCart(cart);
    syncCartWithServer(id, newQuantity);
    if (typeof renderCart === 'function') {
        renderCart();
    }
}

function removeFromCart(id) {
    let cart = getCart();
    let product = cart.find(p => String(p.id) === String(id));
    if (!product) return;

    let newQuantity = 0;
    if (product.quantity > 0.5) {
        product.quantity -= 0.5;
        newQuantity = product.quantity;
    } else {
        cart = cart.filter(p => String(p.id) !== String(id));
        newQuantity = 0;
    }

    saveCart(cart);
    syncCartWithServer(id, newQuantity);
    if (typeof renderCart === 'function') {
        renderCart();
    }
}

function deleteProduct(id) {
    let cart = getCart();
    cart = cart.filter(p => String(p.id) !== String(id));
    saveCart(cart);
    syncCartWithServer(id, 0);
    if (typeof renderCart === 'function') {
        renderCart();
    }
}