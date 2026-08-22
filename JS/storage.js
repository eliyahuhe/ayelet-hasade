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
        // חיפוש המוצר המקורי לפי ID (תמיכה ב-_id של מונגו או id ישן)
        let product = products.find(p => (p._id === item.id || p.id === item.id));
        if (!product) return;

        total += item.quantity * product.price;

        // קביעת טקסט המידה לתצוגה בעגלה (קיצור של יחידות/מארזים ל"יח'")
        let unitText = product.unit || 'ק״ג';
        if (unitText === 'יחידות' || unitText === 'מארזים') unitText = "יח'";

        // עיצוב הכמות (ללא אפסים מיותרים, למשל 1.5 במקום 1.50)
        let displayQuantity = parseFloat(item.quantity);

        container.innerHTML += `<div class="d-flex align-items-center border-bottom py-3 position-relative" style="padding-left: 35px;">
    
   <button class="btn p-0 text-danger position-absolute"
        style="left: 5px; top: 50%; transform: translateY(-50%); text-decoration: none;"
        onclick="deleteProduct('${item.id}')"
        title="הסר מוצר">
    <i class="bi bi-trash"></i>
</button>

    <!-- תמונה -->
    <img src="${product.image}" onerror="this.onerror=null; this.src='https://via.placeholder.com/50';" alt="${product.name}" class="rounded-circle flex-shrink-0" style="width: 38px; height: 38px; object-fit: cover; margin-left: 10px;">

    <div class="fw-semibold small text-dark flex-grow-1 text-truncate" style="min-width: 0;" title="${product.name}">
        ${product.name}
    </div>

   <div class="d-flex align-items-center border rounded-pill flex-shrink-0 bg-light ms-2 qty-control">
    <button class="btn btn-sm px-2 py-0 border-0 text-muted"
        onclick="addToCart('${item.id}')">+</button>

    <div class="flex-grow-1 text-center small fw-semibold" style="line-height: 1; padding: 0 4px;">
        ${displayQuantity} <span style="font-size: 0.8em; color:#666;">${unitText}</span>
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
    // שלפנו את שם המשתמש מהעוגיות למקרה שאין ב-localStorage
    const cookieString = document.cookie.split(';').find(row => row.trim().startsWith('username='));
    const username = cookieString ? decodeURIComponent(cookieString.split('=')[1]) : null;

    if (!username) return; // אורח - אינו מסנכרן מול השרת

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
    let originalProduct = products.find(p => (p._id === id || p.id === id));
    let product = cart.find(p => p.id === id);

    if (!originalProduct) return;

    let stock = originalProduct.stock !== undefined ? originalProduct.stock : 100; // אם אין מלאי מוגדר, מניחים שיש הרבה
    let newQuantity = 0;

    // קביעת קפיצות הכמות לפי סוג היחידה
    let amountToAdd = (originalProduct.unit === 'ק״ג' || !originalProduct.unit) ? 0.5 : 1;

    if (!product && stock > 0) {
        newQuantity = amountToAdd;
        cart.push({ id: id, quantity: newQuantity });
    } else if (product && product.quantity + amountToAdd <= stock) {
        product.quantity += amountToAdd;
        newQuantity = product.quantity;
    } else if ((product && product.quantity + amountToAdd > stock) || (!product && stock <= 0)) {
        alert("המוצר לא זמין בכמות שביקשת במלאי");
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
    let product = cart.find(p => p.id === id);
    let originalProduct = products.find(p => (p._id === id || p.id === id));

    if (!product || !originalProduct) return;

    let amountToRemove = (originalProduct.unit === 'ק״ג' || !originalProduct.unit) ? 0.5 : 1;
    let newQuantity = 0;

    if (product.quantity > amountToRemove) {
        product.quantity -= amountToRemove;
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