


// שם העגלה בדפדפן
const CART_KEY = "products";

// מציג מחיר עם ₪
function formatPrice(price) {
  return "₪" + price;
}

// מביא את העגלה מהדפדפן
function getCart() {
  let cart = localStorage.getItem(CART_KEY);

  if (!cart) return [];

  return JSON.parse(cart);
}

// מחשב סכום כולל
function getTotal(cart) {
  let total = 0;

  cart.forEach(item => {
    total += item.price * item.qty;
  });

  return total;
}

// מציג את המוצרים בעמוד
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
    totalBox.innerText = "₪0";
    return;
  }

  empty.classList.add("d-none");
  btn.disabled = false;

  let total = 0;

  cart.forEach(item => {
    let product = products.find(p => p.id === item.id);
    if (!product) return;

    let row = document.createElement("tr");

    let sum = product.price * item.quantity;
    total += sum;

    row.innerHTML = `
      <td>${product.name}</td>
      <td>${item.quantity} ק''ג </td>
      <td>${formatPrice(product.price)}</td>
      <td>${formatPrice(sum)}</td>
    `;

    body.appendChild(row);
  });

  totalBox.innerText = formatPrice(total);
}

// כשלוחצים אישור הזמנה
document.getElementById("submitBtn").addEventListener("click", function() {

  let cart = getCart();

  if (cart.length === 0) return;

  let orderId = "ORD-" + Date.now();

  let order = {
    id: orderId,
    items: cart,
    total: getTotal(cart)
  };

  // שומר הזמנה
  localStorage.setItem("lastOrder", JSON.stringify(order));

  // מוחק עגלה
  localStorage.removeItem(CART_KEY);

  // טקסט להודעת פופאפ
  document.getElementById("popupText").innerText =
    "תודה רבה שקנית אצלנו 🙏\n" +
    "צוות איילת השדה מטפל לך בהזמנה\n" +
    "מספר הזמנה: " + orderId;

  // מציג בהודעת פופאפ
  document.getElementById("popup").classList.remove("d-none");

  showCart();
});

// סוגר לנו  פופאפ
function closePopup() {
  document.getElementById("popup").classList.add("d-none");
}

// הפעלה ראשונית
showCart();

