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
    // איפוס השדות החדשים במעבר לאיסוף עצמי
    if (document.getElementById("cityName")) document.getElementById("cityName").value = "";
    if (document.getElementById("streetName")) document.getElementById("streetName").value = "";
    if (document.getElementById("houseNumber")) document.getElementById("houseNumber").value = "";
    if (document.getElementById("entrance")) document.getElementById("entrance").value = "";
    if (document.getElementById("floor")) document.getElementById("floor").value = "";
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
      // שימוש ב-IDs החדשים מה-HTML המשוכלל
      let city = document.getElementById("cityName")?.value.trim() || "";
      let street = document.getElementById("streetName")?.value.trim() || "";
      let house = document.getElementById("houseNumber")?.value.trim() || "";
      let entrance = document.getElementById("entrance")?.value.trim() || "";
      let floor = document.getElementById("floor")?.value.trim() || "";

      if (!city || !street || !house) {
        alert("נא למלא עיר, רחוב ומספר דירה למשלוח");
        return;
      }

      // בניית כתובת מלאה כולל קומה וכניסה
      fullAddress = `${city}, ${street} ${house}`;
      if (entrance) fullAddress += `, כניסה ${entrance}`;
      if (floor) fullAddress += `, קומה ${floor}`;
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

showCart();

// מזהי מאגרים פתוחים (API ממשלתי)
const CITY_RESOURCE_ID = '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba';
const STREET_RESOURCE_ID = '9ad3862c-8391-4b2f-84a4-2d4c68625f4b';

const cityInput = document.getElementById('cityName');
const cityList = document.getElementById('cityList');
const streetInput = document.getElementById('streetName');
const streetList = document.getElementById('streetList');

// השלמת עיר
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
  } catch (err) {
    console.error("שגיאה במשיכת עיר:", err);
  }
});

// פתיחת שדה הרחוב ברגע שנבחרה עיר (שינוי ערך)
cityInput.addEventListener('change', () => {
  if (cityInput.value.trim().length > 0) {
    streetInput.disabled = false;
    streetInput.placeholder = "התחל להקליד שם רחוב...";
    streetInput.focus();
  }
});

// השלמת רחוב
streetInput.addEventListener('input', async (e) => {
  const streetQuery = e.target.value.trim();
  const selectedCity = cityInput.value.trim();

  if (streetQuery.length < 1 || !selectedCity) {
    streetList.innerHTML = '';
    return;
  }

  try {
    // חיפוש חופשי שמשלב את שם הרחוב והעיר יחד
    const fullQuery = `${streetQuery} ${selectedCity}`;
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${STREET_RESOURCE_ID}&q=${encodeURIComponent(fullQuery)}&limit=15`;

    const res = await fetch(url);
    const data = await res.json();

    streetList.innerHTML = '';
    if (data.result && data.result.records) {
      data.result.records.forEach(record => {
        const streetName = (record['שם_רחוב'] || record['שם רחוב']).trim();
        const recordCity = (record['שם_ישוב'] || record['שם ישוב'] || '').trim();

        // מוודא שהרחוב שייך לעיר שנבחרה
        if (recordCity.includes(selectedCity) || selectedCity.includes(recordCity)) {
          const option = document.createElement('option');
          option.value = streetName;
          streetList.appendChild(option);
        }
      });
    }
  } catch (err) {
    console.error("שגיאה במשיכת רחוב:", err);
  }
});
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
