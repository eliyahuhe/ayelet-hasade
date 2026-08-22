const CART_KEY = "products";

function formatPrice(price) {
  return "₪" + Number(price).toFixed(2);
}

function getTotal(cart) {
  let total = 0;
  cart.forEach(item => {
    // תמיכה ב-_id של מונגו לצד id מספרי ישן
    let product = products.find(p => (p._id === item.id || p.id == item.id));
    if (!product) return;
    total += product.price * item.quantity;
  });
  return total;
}

function showCart() {
  let cart = getCart();
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
    // תמיכה ב-_id של מונגו לצד id מספרי ישן
    let product = products.find(p => (p._id === item.id || p.id == item.id));
    if (!product) return;

    let unitText = product.unit || 'ק״ג';
    if (unitText === 'יחידות' || unitText === 'מארזים') unitText = "יח'";

    let sum = product.price * item.quantity;
    let row = document.createElement("tr");

    row.innerHTML = `
      <td></td>
      <td>
        <div class="product-cell">
          <img src="${product.image}" onerror="this.src='https://via.placeholder.com/50'" class="rounded-circle product-img" style="width:38px; height:38px; object-fit:cover;">
          <span>${product.name}</span>
        </div>
      </td>
      <td>
        <div class="qty-box">
          <button onclick="removeFromCart('${item.id}')">−</button>
          <span>${item.quantity} ${unitText}</span>
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

window.toggleAddress = function () {
  let selected = document.querySelector('input[name="deliveryType"]:checked')?.value;
  let addressBox = document.getElementById("addressBox");

  if (!addressBox) return;

  if (selected === "delivery") {
    addressBox.classList.remove("d-none");
  } else {
    addressBox.classList.add("d-none");
    document.getElementById("addrCity").value = "";
    document.getElementById("addrStreet").value = "";
    document.getElementById("addrHouse").value = "";
    document.getElementById("addrApt").value = "";
  }
};

function checkGuestStatus() {
  const username = localStorage.getItem('username');
  const guestBox = document.getElementById("guestFieldsBox");
  if (!username && guestBox) {
    guestBox.classList.remove("d-none");
  }
}

// טעינת כתובת ברירת המחדל של המשתמש ומילוי אוטומטי
async function autofillDefaultAddress() {
  const username = localStorage.getItem('username');
  if (!username) return;

  try {
    const res = await fetch('/api/user/profile');
    if (!res.ok) return;
    const data = await res.json();

    if (data.defaultAddress) {
      window.userDefaultAddress = data.defaultAddress;
      const parts = data.defaultAddress.split(',').map(s => s.trim());
      if (parts[0]) document.getElementById("addrCity").value = parts[0];
      if (parts[1]) {
        const streetAndHouse = parts[1].split(' ');
        const house = streetAndHouse.pop();
        document.getElementById("addrStreet").value = streetAndHouse.join(' ');
        document.getElementById("addrHouse").value = house || '';
      }
      if (parts[2]) {
        document.getElementById("addrApt").value = parts[2].replace('דירה', '').trim();
      }
    }
  } catch (err) {
    console.error('שגיאה בשליפת כתובת ברירת מחדל:', err);
  }
}

window.tempOrder = null;

function isValidID(id) {
  return /^\d{9}$/.test(id);
}

const submitBtn = document.getElementById("submitBtn");
if (submitBtn) {
  submitBtn.addEventListener("click", function (e) {
    e.preventDefault();

    let cart = getCart();
    if (cart.length === 0) return;

    const username = localStorage.getItem('username');
    let guestName = "";
    let guestPhone = "";

    if (!username) {
      guestName = document.getElementById("guestName")?.value.trim();
      guestPhone = document.getElementById("guestPhone")?.value.trim();

      if (!guestName || !guestPhone) {
        alert("כאורח, חובה למלא שם מלא ומספר טלפון");
        return;
      }
    }

    let deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value;
    let fullAddress = "";

    if (deliveryType === "delivery") {
      let city = document.getElementById("addrCity")?.value.trim();
      let street = document.getElementById("addrStreet")?.value.trim();
      let house = document.getElementById("addrHouse")?.value.trim();
      let apt = document.getElementById("addrApt")?.value.trim();

      if (!city || !street || !house) {
        alert("נא למלא עיר, רחוב ומספר בית למשלוח");
        return;
      }

      fullAddress = `${city}, ${street} ${house}` + (apt ? `, דירה ${apt}` : "");
    }

    window.tempOrder = {
      cart,
      deliveryType,
      address: fullAddress,
      guestName,
      guestPhone
    };

    openPaymentPopup();
  });
}

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

    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "מעבד הזמנה...";
    }

    const username = localStorage.getItem('username') || 'אורח';

    const orderData = {
      username: username,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      items: data.cart,
      deliveryType: data.deliveryType,
      address: data.address,
      total: getTotal(data.cart)
    };

    try {
      const response = await fetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "אירעה שגיאה בביצוע ההזמנה");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "שלם עכשיו";
        }
        return;
      }

      if (username !== 'אורח' && data.deliveryType === 'delivery' && !window.userDefaultAddress) {
        const wantToSave = confirm(`האם ברצונך לשמור את הכתובת "${data.address}" ככתובת ברירת המחדל למשלוחים הבאים?`);
        if (wantToSave) {
          try {
            await fetch('/api/user/address', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: data.address })
            });
            window.userDefaultAddress = data.address;
          } catch (e) {
            console.error("שגיאה בשמירת כתובת ברירת מחדל:", e);
          }
        }
      }

      localStorage.setItem("lastOrder", JSON.stringify({ ...orderData, id: result.orderId }));
      localStorage.removeItem(CART_KEY);

      closePaymentPopup();

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "שלם עכשיו";
      }

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
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "שלם עכשיו";
      }
    }
  });
}

window.renderCart = showCart;

document.addEventListener("DOMContentLoaded", async function () {
  checkGuestStatus();
  await autofillDefaultAddress();
  if (typeof displayUserName === 'function') {
    displayUserName();
  }
  if (typeof loadProducts === 'function') {
    await loadProducts();
  }
  showCart();
});