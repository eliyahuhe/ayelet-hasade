// =====================
// CONFIG
// =====================
const CART_KEY = "products";

// =====================
// FORMAT מחיר
// =====================
function formatPrice(price) {
  return "₪" + Number(price).toFixed(2);
}

// =====================
// חישוב סכום כולל
// =====================
function getTotal(cart) {
  let total = 0;

  cart.forEach(item => {
    let product = products.find(p => p.id === item.id);
    if (!product) return;

    total += product.price * item.quantity;
  });

  return total;
}

// =====================
// הצגת עגלה
// =====================
function showCart() {
  let cart = getCart(); // מגיע מ-storage.js

  let body = document.getElementById("cartBody");
  let totalBox = document.getElementById("grandTotal");
  let empty = document.getElementById("emptyCart");
  let btn = document.getElementById("submitBtn");

  body.innerHTML = "";

  if (cart.length === 0) {
    empty.classList.remove("d-none");
    btn.disabled = true;
    totalBox.innerText = "₪0.00";
    return;
  }

  empty.classList.add("d-none");
  btn.disabled = false;

  cart.forEach(item => {
    let product = products.find(p => p.id === item.id);
    if (!product) return;

    let sum = product.price * item.quantity;

    let row = document.createElement("tr");

    row.innerHTML = `
      <td></td>

      <td>
        <div class="product-cell">
          <img
            src="/image/cart/${product.name}.JPG"
            onerror="this.src='https://via.placeholder.com/50'"
            class="rounded-circle product-img"
          >
          <span>${product.name}</span>
        </div>
      </td>

      <td>
        <div class="qty-box">
          <!-- משתמש בפונקציות מ-storage.js -->
          <button onclick="removeFromCart(${item.id})">−</button>
          <span>${item.quantity} ק״ג</span>
          <button onclick="addToCart(${item.id})">+</button>
        </div>
      </td>

      <td>${formatPrice(product.price)}</td>
      <td>${formatPrice(sum)}</td>

      <td>
        <!-- גם מחיקה מגיעה מ-storage.js -->
        <button class="delete-btn" onclick="deleteProduct(${item.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    body.appendChild(row);
  });

  totalBox.innerText = formatPrice(getTotal(cart));
}

// =====================
// כתובת משלוח
// =====================
window.toggleAddress = function () {
  let selected =
    document.querySelector('input[name="deliveryType"]:checked').value;

  let addressBox = document.getElementById("addressBox");
  let addressInput = document.getElementById("deliveryAddress");

  if (selected === "delivery") {
    addressBox.classList.remove("d-none");
    addressInput.required = true;
  } else {
    addressBox.classList.add("d-none");
    addressInput.required = false;
    addressInput.value = "";
  }
};

// =====================
// STATE להזמנה
// =====================
window.tempOrder = null;

// =====================
// ולידציה ת"ז (9 ספרות בלבד)
// =====================
function isValidID(id) {
  return /^\d{9}$/.test(id);
}

// =====================
// אישור הזמנה
// =====================
document.getElementById("submitBtn").addEventListener("click", function (e) {
  e.preventDefault();

  let cart = getCart();
  if (cart.length === 0) return;

  let deliveryType =
    document.querySelector('input[name="deliveryType"]:checked').value;

  let address =
    document.getElementById("deliveryAddress").value.trim();

  if (deliveryType === "delivery" && address === "") {
    alert("נא להזין כתובת למשלוח");
    return;
  }

  window.tempOrder = { cart, deliveryType, address };

  openPaymentPopup();
});

// =====================
// POPUPS
// =====================
window.openPaymentPopup = function () {
  document.getElementById("paymentPopup").classList.remove("d-none");
};

window.closePaymentPopup = function () {
  document.getElementById("paymentPopup").classList.add("d-none");
};

window.closePopup = function () {
  document.getElementById("popup").classList.add("d-none");
  window.location.href = "login.html";

};

// =====================
// תשלום (עם validation כמו בתמונה)
// =====================
document.getElementById("paymentForm").addEventListener("submit", function (e) {
  e.preventDefault();

  // מציג שגיאות שדות חובה (בלי alert)
  if (!this.reportValidity()) return;

  let tz = document.getElementById("cardTz").value.trim();

  if (!isValidID(tz)) {
    document.getElementById("cardTz").setCustomValidity("יש להזין 9 ספרות");
    document.getElementById("cardTz").reportValidity();
    return;
  }

  document.getElementById("cardTz").setCustomValidity("");

  let data = window.tempOrder;
  if (!data) return;

  let orderId = "ORD-" + Date.now();

  let order = {
    id: orderId,
    items: data.cart,
    deliveryType: data.deliveryType,
    address: data.address,
    total: getTotal(data.cart)
  };

  localStorage.setItem("lastOrder", JSON.stringify(order));

  // ריקון עגלה בלבד
  localStorage.removeItem(CART_KEY);

  closePaymentPopup();

  document.getElementById("popupText").innerText =
    "תודה שקנית אצלנו 🙏\n" +
    "ההזמנה שלך התקבלה בהצלחה ותטופל בהקדם\n" +
    "צוות איילת השדה כאן בשבילך תמיד 💚\n" +
    "מספר הזמנה: " + orderId;

  document.getElementById("popup").classList.remove("d-none");

  showCart();
});

// =====================
// 🔥 חיבור חשוב ל-storage.js
// =====================
// גורם לכך שכל שינוי בעגלה (פלוס/מינוס/מחיקה)
// יעדכן את הטבלה בעמוד הזה
window.renderCart = showCart;

// =====================
// INIT
// =====================
showCart();