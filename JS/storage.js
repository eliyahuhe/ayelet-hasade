


function renderCart() {
    let cart = getCart();
    let container = document.getElementById("cartItems");
    let total = 0;


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

        document.getElementById("cartSum").textContent = "₪" + total.toFixed(2);
        return
    }

    cart.forEach(item => {
        let product = products.find(p => p.id === item.id);
        if (!product) return;
        total += item.quantity * product.price;
        container.innerHTML += `<div class="d-flex align-items-center border-bottom py-3 position-relative" style="padding-left: 35px;">
    
    <!-- כפתור מחיקה (פח אשפה) -->
   <button class="btn p-0 text-danger position-absolute"
        style="left: 5px; top: 50%; transform: translateY(-50%); text-decoration: none;"
        onclick="deleteProduct(${item.id})"
        title="הסר מוצר">

    <i class="bi bi-trash"></i>

</button>
    <!-- תמונה -->
    <img src="/image/cart/${product.name}.JPG" onerror="this.onerror=null; this.src='https://via.placeholder.com/50';" alt="${product.name}" class="rounded-circle flex-shrink-0" style="width: 38px; height: 38px; object-fit: cover; margin-left: 10px;">

    <!-- שם המוצר -->
    <div class="fw-semibold small text-dark flex-grow-1 text-truncate" style="min-width: 0; ps-1" title="${product.name}">
        ${product.name}
    </div>

    <!-- פלוס/מינוס -->
   <div class="d-flex align-items-center border rounded-pill flex-shrink-0 bg-light ms-2 qty-control">

    <button class="btn btn-sm px-2 py-0 border-0 text-muted"
        onclick="addToCart(${item.id})">+</button>

    <div class="flex-grow-1 text-center small fw-semibold" style="line-height: 1;">
        ${item.quantity}
    </div>

    <button class="btn btn-sm px-2 py-0 border-0 text-muted"
        onclick="removeFromCart(${item.id})">-</button>

</div>

    <!-- מחיר -->
    <div class="fw-bold small text-end flex-shrink-0" style="color:rgb(0, 83, 80); width: 45px;">
        ₪${parseFloat(item.quantity * product.price).toFixed(2)}
    </div>

</div>`
    });
    document.getElementById("cartSum").textContent = "₪" + total.toFixed(2);
}





/*קבלת מוצרים מDATA */
function getCart() {
    return JSON.parse(localStorage.getItem("products")) || [];
}

/*שמירת מוצרים*/
function saveCart(products) {
    localStorage.setItem("products", JSON.stringify(products));
}

/*הוספה לעגלה*/
function addToCart(id) {
    let cart = getCart();
    let originalProduct = products.find(p => p.id === id) /*כמות במלאי המקורי*/
    let product = cart.find(p => p.id === (id));

    if (!originalProduct) return;

    let stock = originalProduct.stock;

    /*הגבלת כמות*/
    if (!product && stock > 0) {
        cart.push({ id: id, quantity: 0.5 });
    }

    if (product && product.quantity + 0.5 <= stock) {
        product.quantity += 0.5;

    }
    if ((product && product.quantity + 0.5 > stock) || (!product && stock <= 0)) {
        alert("המוצר לא זמין יותר ממה שנבחר");
    }


    saveCart(cart);
    renderCart();
}


/*הסרה מהעגלה*/
function removeFromCart(id) {
    let cart = getCart()

    let product = cart.find(p => p.id === (id))
    if (!product) return;

    if (product.quantity > 0.5) {
        product.quantity -= 0.5;
    }
    else {
        cart = cart.filter(p => p.id !== id)
    }
    saveCart(cart);
    renderCart();
}

function deleteProduct(id) {
    let cart = getCart();

    cart = cart.filter(p => p.id !== id)
    saveCart(cart);
    renderCart();

}