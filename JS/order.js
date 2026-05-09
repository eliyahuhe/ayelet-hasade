


// // שם העגלה בדפדפן
// const CART_KEY = "products";

// // מציג מחיר עם ₪
// function formatPrice(price) {
//   return "₪" + price;
// }

// // מביא את העגלה מהדפדפן
// function getCart() {
//   let cart = localStorage.getItem(CART_KEY);

//   if (!cart) return [];

//   return JSON.parse(cart);
// }

// // מחשב סכום כולל
// function getTotal(cart) {
//   let total = 0;

//   cart.forEach(item => {
//     total += item.price * item.qty;
//   });

//   return total;
// }

// // מציג את המוצרים בעמוד
// function showCart() {
//   let cart = getCart();

//   let body = document.getElementById("cartBody");
//   let totalBox = document.getElementById("grandTotal");
//   let empty = document.getElementById("emptyCart");
//   let btn = document.getElementById("submitBtn");

//   body.innerHTML = "";

//   if (cart.length === 0) {
//     empty.classList.remove("d-none");
//     btn.disabled = true;
//     totalBox.innerText = "₪0";
//     return;
//   }

//   empty.classList.add("d-none");
//   btn.disabled = false;

//   let total = 0;

//   cart.forEach(item => {
//     let product = products.find(p => p.id === item.id);
//     if (!product) return;

//     let row = document.createElement("tr");

//     let sum = product.price * item.quantity;
//     total += sum;

//     row.innerHTML = `
//       <td>${product.name}</td>
//       <td>${item.quantity} ק''ג </td>
//       <td>${formatPrice(product.price)}</td>
//       <td>${formatPrice(sum)}</td>
//     `;

//     body.appendChild(row);
//   });

//   totalBox.innerText = formatPrice(total);
// }

// // כשלוחצים אישור הזמנה
// document.getElementById("submitBtn").addEventListener("click", function() {

//   let cart = getCart();

//   if (cart.length === 0) return;

//   let orderId = "ORD-" + Date.now();

//   let order = {
//     id: orderId,
//     items: cart,
//     total: getTotal(cart)
//   };

//   // שומר הזמנה
//   localStorage.setItem("lastOrder", JSON.stringify(order));

//   // מוחק עגלה
//   localStorage.removeItem(CART_KEY);

//   // טקסט להודעת פופאפ
//   document.getElementById("popupText").innerText =
//     "תודה רבה שקנית אצלנו 🙏\n" +
//     "צוות איילת השדה מטפל לך בהזמנה\n" +
//     "מספר הזמנה: " + orderId;

//   // מציג בהודעת פופאפ
//   document.getElementById("popup").classList.remove("d-none");

//   showCart();
// });

// // סוגר לנו  פופאפ
// function closePopup() {
//   document.getElementById("popup").classList.add("d-none");
// }

// // הפעלה ראשונית
// showCart();


// השם שבו העגלה שמורה ב-localStorage
const CART_KEY = "products";

// הצגת מחיר בפורמט יפה
function formatPrice(price) {
  return "₪" + Number(price).toFixed(2);
}

// הבאת העגלה מה-localStorage
function getCart() {
  let cart = localStorage.getItem(CART_KEY);
  return cart ? JSON.parse(cart) : [];
}

// שמירת העגלה ל-localStorage
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// חישוב סכום כולל לפי העגלה והמוצרים המקוריים
function getTotal(cart) {
  let total = 0;

  cart.forEach(item => {
    let product = products.find(p => p.id === item.id);
    if (!product) return;

    total += product.price * item.quantity;
  });

  return total;
}

// הצגת המוצרים בטבלת הסיכום
function showCart() {
  let cart = getCart();

  let body = document.getElementById("cartBody");
  let totalBox = document.getElementById("grandTotal");
  let empty = document.getElementById("emptyCart");
  let btn = document.getElementById("submitBtn");

  body.innerHTML = "";

  // אם העגלה ריקה
  if (cart.length === 0) {
    empty.classList.remove("d-none");
    btn.disabled = true;
    totalBox.innerText = "₪0.00";
    return;
  }

  empty.classList.add("d-none");
  btn.disabled = false;

  // הדפסת כל מוצר בטבלה
  cart.forEach(item => {
    let product = products.find(p => p.id === item.id);
    if (!product) return;

    let sum = product.price * item.quantity;
    let row = document.createElement("tr");

    row.innerHTML = `
      <td>${product.name}</td>

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

  // עדכון סכום סופי
  totalBox.innerText = formatPrice(getTotal(cart));
}

// הוספת כמות למוצר
function addToCart(id) {
  let cart = getCart();

  let item = cart.find(p => p.id === id);
  let product = products.find(p => p.id === id);

  if (!item || !product) return;

  // לא לעבור את המלאי
  if (item.quantity + 0.5 <= product.stock) {
    item.quantity += 0.5;
  }

  saveCart(cart);
  showCart();
}

// הורדת כמות מהמוצר
function removeFromCart(id) {
  let cart = getCart();

  let item = cart.find(p => p.id === id);
  if (!item) return;

  // אם יש יותר מחצי קילו — מורידים חצי
  if (item.quantity > 0.5) {
    item.quantity -= 0.5;
  } 
  // אם נשאר חצי — מוחקים את המוצר מהעגלה
  else {
    cart = cart.filter(p => p.id !== id);
  }

  saveCart(cart);
  showCart();
}

// מחיקת מוצר מהעגלה
function deleteProduct(id) {
  let cart = getCart();

  cart = cart.filter(p => p.id !== id);

  saveCart(cart);
  showCart();
}

// הצגת / הסתרת שדה כתובת לפי בחירת משלוח
function toggleAddress() {
  let selected = document.querySelector('input[name="deliveryType"]:checked').value;
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
}

// אישור הזמנה
document.getElementById("submitBtn").addEventListener("click", function () {
  let cart = getCart();

  if (cart.length === 0) return;

  let deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
  let address = document.getElementById("deliveryAddress").value.trim();

  // אם נבחר משלוח ואין כתובת
  if (deliveryType === "delivery" && address === "") {
    alert("נא להזין כתובת למשלוח");
    return;
  }

  let orderId = "ORD-" + Date.now();

  let order = {
    id: orderId,
    items: cart,
    deliveryType: deliveryType,
    address: deliveryType === "delivery" ? address : "",
    total: getTotal(cart)
  };

  // שמירת הזמנה אחרונה
  localStorage.setItem("lastOrder", JSON.stringify(order));

  // מחיקת העגלה אחרי אישור
  localStorage.removeItem(CART_KEY);

  // הודעת אישור
  document.getElementById("popupText").innerText =
    "תודה רבה שקנית אצלנו 🙏\n" +
    "צוות איילת השדה מטפל בהזמנה שלך\n" +
    "מספר הזמנה: " + orderId;

  document.getElementById("popup").classList.remove("d-none");

  showCart();
});

// סגירת הפופאפ
function closePopup() {
  document.getElementById("popup").classList.add("d-none");
}

// הפעלה ראשונית כשנכנסים לעמוד
showCart();