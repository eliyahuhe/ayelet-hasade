const CART_KEY = "products";

// מחיר
function formatPrice(price) {
  return "₪" + Number(price).toFixed(2);
}

// חישוב סכום כולל
function getTotal(cart) {
  let total = 0;
  cart.forEach(item => {
    let product = products.find(p => p.id === item.id);
    if (!product) return;
    total += product.price * item.quantity;
  });
  return total;
}

// הצגת עגלה
function showCart() {
  let cart = getCart();
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
<img src="/image/cart/${product.name}.JPG" onerror="this.src='https://via.placeholder.com/50'" class="rounded-circle product-img">
<span>${product.name}</span>
</div>
</td>
<td>
<div class="qty-box">
<button onclick="removeFromCart(${item.id})">−</button>
<span>${item.quantity} ק״ג</span>
<button onclick="addToCart(${item.id})">+</button>
</div>
</td>
<td>${formatPrice(product.price)}</td>
<td>${formatPrice(sum)}</td>
<td>
<button class="delete-btn" onclick="deleteProduct(${item.id})">
<i class="bi bi-trash"></i>
</button>
</td>
`;
    body.appendChild(row);
  });
  totalBox.innerText = formatPrice(getTotal(cart));
}

// כתובת משלוח - פתיחה וסגירה
window.toggleAddress = function () {
  let selected = document.querySelector('input[name="deliveryType"]:checked').value;
  let addressBox = document.getElementById("addressBox");
  let cityInput = document.getElementById("cityName");

  if (selected === "delivery") {
    addressBox.classList.remove("d-none");
    cityInput.required = true;
  } else {
    addressBox.classList.add("d-none");
    cityInput.required = false;
  }
};

window.tempOrder = null;

// ולידציה ת"ז
function isValidID(id) {
  return /^\d{9}$/.test(id);
}

// אישור הזמנה (מעודכן לשדות החדשים!)
document.getElementById("submitBtn").addEventListener("click", function (e) {
  e.preventDefault();

  let cart = getCart();
  if (cart.length === 0) return;

  let deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
  let addressData = "";

  if (deliveryType === "delivery") {
    let city = document.getElementById("cityName").value.trim();
    let street = document.getElementById("streetName").value.trim();
    let house = document.getElementById("houseNumber").value.trim();

    if (city === "" || street === "") {
      alert("נא להזין עיר ורחוב למשלוח");
      return;
    }
    addressData = `${city}, ${street} ${house}`;
    // שמירת הכתובת ללקוח חוזר
    saveAddressToDB();
  }

  window.tempOrder = { cart, deliveryType, address: addressData };
  openPaymentPopup();
});

// POPUPS
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

// תשלום
document.getElementById("paymentForm").addEventListener("submit", function (e) {
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

  let orderId = "ORD-" + Date.now();
  let order = {
    id: orderId,
    items: data.cart,
    deliveryType: data.deliveryType,
    address: data.address,
    total: getTotal(data.cart)
  };

  localStorage.setItem("lastOrder", JSON.stringify(order));
  localStorage.removeItem(CART_KEY);

  const username = localStorage.getItem('username');
  if (username) {
    fetch('/cart/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    }).catch(err => console.error('שגיאה בניקוי עגלה בשרת:', err));
  }

  closePaymentPopup();
  document.getElementById("popupText").innerText =
    "תודה שקנית אצלנו 🙏\n" +
    "ההזמנה שלך התקבלה בהצלחה ותטופל בהקדם\n" +
    "צוות איילת השדה כאן בשבילך תמיד 💚\n" +
    "מספר הזמנה: " + orderId;

  document.getElementById("popup").classList.remove("d-none");
  showCart();
});

window.renderCart = showCart;
showCart();

// ==========================================
// API ממשלתי לערים ורחובות
// ==========================================
const CITY_RESOURCE_ID = '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba';
const STREET_RESOURCE_ID = '9ad3862c-8391-4b2f-84a4-2d4c68625f4b';

const cityInput = document.getElementById('cityName');
const cityList = document.getElementById('cityList');
const streetInput = document.getElementById('streetName');
const streetList = document.getElementById('streetList');

cityInput.addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  if (query.length < 2) {
    cityList.innerHTML = '';
    streetInput.disabled = true;
    streetInput.placeholder = "קודם יש לבחור עיר...";
    streetInput.value = '';
    return;
  }
  try {
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${CITY_RESOURCE_ID}&q=${encodeURIComponent(query)}&limit=15`;
    const res = await fetch(url);
    const data = await res.json();
    cityList.innerHTML = '';
    if (data.result && data.result.records) {
      data.result.records.forEach(record => {
        const cityName = (record['שם_ישוב'] || record['שם_ישוב ']).trim();
        const option = document.createElement('option');
        option.value = cityName;
        cityList.appendChild(option);
      });
    }
  } catch (err) { console.error("שגיאה:", err); }
});

cityInput.addEventListener('change', () => {
  if (cityInput.value.trim().length > 0) {
    streetInput.disabled = false;
    streetInput.placeholder = "התחל להקליד שם רחוב...";
    streetInput.focus();
  }
});

streetInput.addEventListener('input', async (e) => {
  const streetQuery = e.target.value.trim();
  const selectedCity = cityInput.value.trim();
  if (streetQuery.length < 1 || !selectedCity) {
    streetList.innerHTML = '';
    return;
  }
  try {
    const fullQuery = `${streetQuery} ${selectedCity}`;
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${STREET_RESOURCE_ID}&q=${encodeURIComponent(fullQuery)}&limit=15`;
    const res = await fetch(url);
    const data = await res.json();
    streetList.innerHTML = '';
    if (data.result && data.result.records) {
      data.result.records.forEach(record => {
        const streetName = (record['שם_רחוב'] || record['שם רחוב']).trim();
        const recordCity = (record['שם_ישוב'] || record['שם ישוב'] || '').trim();
        if (recordCity.includes(selectedCity) || selectedCity.includes(recordCity)) {
          const option = document.createElement('option');
          option.value = streetName;
          streetList.appendChild(option);
        }
      });
    }
  } catch (err) { console.error("שגיאה:", err); }
});

// ==========================================
// זיכרון ללקוח חוזר
// ==========================================
function loadSavedAddress() {
  const saved = JSON.parse(localStorage.getItem('savedAddress'));
  if (saved) {
    document.getElementById('cityName').value = saved.city || '';
    document.getElementById('streetName').value = saved.street || '';
    if (saved.city) document.getElementById('streetName').disabled = false;
    document.getElementById('houseNumber').value = saved.house || '';
    document.getElementById('entrance').value = saved.entrance || '';
    document.getElementById('floor').value = saved.floor || '';
    document.getElementById('deliveryNotes').value = saved.notes || '';
  }
}

document.addEventListener('DOMContentLoaded', loadSavedAddress);

function saveAddressToDB() {
  const addressData = {
    city: document.getElementById('cityName').value,
    street: document.getElementById('streetName').value,
    house: document.getElementById('houseNumber').value,
    entrance: document.getElementById('entrance').value,
    floor: document.getElementById('floor').value,
    notes: document.getElementById('deliveryNotes').value
  };
  localStorage.setItem('savedAddress', JSON.stringify(addressData));
}