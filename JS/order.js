const CART_KEY = "products";

// מחיר
function formatPrice(price) {
  return "₪" + Number(price).toFixed(2);
}

// חישוב סכום כולל
function getTotal(cart) {
  let total = 0;

  cart.forEach(item => {
    let product = products.find(p => String(p.id) === String(item.id));
    if (!product) return;

    total += product.price * item.quantity;
  });

  return total;
}

// הצגת עגלה בדף Checkout
function showCart() {
  let cart = getCart(); // מגיע מ-storage.js
  let body = document.getElementById("cartBody");
  let totalBox = document.getElementById("grandTotal");
  let empty = document.getElementById("emptyCart");
  let btn = document.getElementById("submitBtn");

  if (!body) return;

  body.innerHTML = "";

  if (cart.length === 0) {
    if (empty) empty.classList.remove("d-none");
    if (btn) btn.disabled = true;
    if (totalBox) totalBox.innerText = "₪0.00";
    return;
  }

  if (empty) empty.classList.add("d-none");
  if (btn) btn.disabled = false;

  cart.forEach(item => {
    let product = products.find(p => String(p.id) === String(item.id));
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
          <button onclick="removeFromCart('${item.id}')">−</button>
          <span>${item.quantity} ק״ג</span>
          <button onclick="addToCart('${item.id}')">+</button>
        </div>
      </td>

      <td>${formatPrice(product.price)}</td>
      <td>${formatPrice(sum)}</td>

      <td>
        <button class="delete-btn" onclick="deleteProduct('${item.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    body.appendChild(row);
  });

  if (totalBox) totalBox.innerText = formatPrice(getTotal(cart));
}

// כתובת משלוח
window.toggleAddress = function () {
  let selected = document.querySelector('input[name="deliveryType"]:checked')?.value;
  let addressBox = document.getElementById("addressBox");
  let addressInput = document.getElementById("deliveryAddress");

  if (!addressBox || !addressInput) return;

  if (selected === "delivery") {
    addressBox.classList.remove("d-none");
    addressInput.required = true;
  } else {
    addressBox.classList.add("d-none");
    addressInput.required = false;
    addressInput.value = "";
  }
};

window.tempOrder = null;

function isValidID(id) {
  return /^\d{9}$/.test(id);
}

// אישור הזמנה - פתיחת פופאפ אשראי
const submitBtn = document.getElementById("submitBtn");
if (submitBtn) {
  submitBtn.addEventListener("click", function (e) {
    e.preventDefault();

    let cart = getCart();
    if (cart.length === 0) return;

    let deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value;
    let address = document.getElementById("deliveryAddress")?.value.trim() || "";

    if (deliveryType === "delivery" && address === "") {
      alert("נא להזין כתובת למשלוח");
      return;
    }

    window.tempOrder = { cart, deliveryType, address };
    openPaymentPopup();
  });
}

// POPUPS
window.openPaymentPopup = function () {
  const p = document.getElementById("paymentPopup");
  if (p) p.classList.remove("d-none");
};

window.closePaymentPopup = function () {
  const p = document.getElementById("paymentPopup");
  if (p) p.classList.add("d-none");
};

window.closePopup = function () {
  const p = document.getElementById("popup");
  if (p) p.classList.add("d-none");
  window.location.href = "/html/shop.html";
};

// תשלום ושליחת ההזמנה לשרת (כולל בדיקת מלאי)
const paymentForm = document.getElementById("paymentForm");
if (paymentForm) {
  paymentForm.addEventListener("submit", async function (e) {
    e.preventDefault();

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

    const username = localStorage.getItem('username') || 'אורח';

    const orderData = {
      username: username,
      items: data.cart,
      deliveryType: data.deliveryType,
      address: data.address,
      total: getTotal(data.cart)
    };

    try {
      // שליחת ההזמנה לשרת
      const response = await fetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!response.ok) {
        // הצגת השגיאה מהשרת (כולל רשימת המוצרים שחסרים במלאי)
        alert(result.error || "אירעה שגיאה בביצוע ההזמנה");
        return;
      }

      // במקרה של הצלחה:
      localStorage.setItem("lastOrder", JSON.stringify({ ...orderData, id: result.orderId }));
      localStorage.removeItem(CART_KEY); // ניקוי עגלה מקומית

      closePaymentPopup();

      const popupText = document.getElementById("popupText");
      if (popupText) {
        popupText.innerText =
          "תודה שקנית אצלנו 🙏\n" +
          "ההזמנה שלך התקבלה בהצלחה ותטופל בהקדם\n" +
          "צוות איילת השדה כאן בשבילך תמיד 💚\n" +
          "מספר הזמנה: " + result.orderId;
      }

      const popup = document.getElementById("popup");
      if (popup) popup.classList.remove("d-none");

      showCart();

    } catch (err) {
      console.error('שגיאה בתקשורת מול השרת ביצירת הזמנה:', err);
      alert('אירעה שגיאה בתקשורת עם השרת, אנא נסה שוב');
    }
  });
}

// דריסת הפונקציה renderCart מ-storage.js עבור עמוד ה-Checkout
window.renderCart = showCart;

// טעינת המוצרים מהשרת ולאחר מכן הצגת העגלה בדף
document.addEventListener("DOMContentLoaded", async function () {
  if (typeof displayUserName === 'function') {
    displayUserName();
  }
  if (typeof loadProducts === 'function') {
    await loadProducts();
  }
  showCart();
});