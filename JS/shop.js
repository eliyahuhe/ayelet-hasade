


/*פונק' להדפסת הכרטיסים */
function renderProducts(productsToShow) {
    const container = document.getElementById("productsContainer");
    container.innerHTML = "";
    productsToShow.forEach(product => {
        container.innerHTML += `

  
                    <div class="col-auto">
                        <div class="card shadow-sm" style="width:208px; height:301px;">

                            <!-- תמונה -->
                            <img src="${product.image}" class="card-img-top" alt="רימון"
                                style="height:160px; object-fit:contain; padding:15px;">

                            <div class="card-body d-flex flex-column justify-content-between text-center">

                                <!-- שם -->
                                <div>
                                    <h6 class="fw-bold mb-1">${product.name}</h6>
                                    <div class="text-success fw-semibold small">
                                        ₪${product.price} לק״ג
                                    </div>
                                </div>

                                <!-- בחירת משקל -->
                                <div class="d-flex justify-content-center align-items-center gap-2">

                                    <button onclick="removeFromCart(${product.id})" class="btn btn-outline-success btn-sm rounded-circle">
                                        <i class="bi bi-dash"></i>
                                    </button>

                                    <div class="border rounded-pill px-3 py-1 small fw-semibold">
                                        הוסף לסל
                                    </div>

                                    <button onclick="addToCart(${product.id})" class="btn btn-success btn-sm rounded-circle">
                                        <i class="bi bi-plus"></i>
                                    </button>

                                </div>

                            </div>
                        </div>
                    </div>
`;
    });

    
}

function filterproducts(category)
{
    if(category==="all")
        renderProducts(products);
    else{
    const filtered = products.filter(product => product.category === category);
 renderProducts(filtered);
    }

  
}

/*קריאה לפונק' להדפסה*/
document.addEventListener("DOMContentLoaded", function () {
  renderProducts(products);
  renderCart();
});

/*הדגשת כפתורי הנאב בלחיצה*/
function setNavBtn(active){
const buttons = document.querySelectorAll(".category-btn");

buttons.forEach(btn => {btn.classList.remove("active","fw-bold","text-sucsses")})

active.classList.add("active","fw-bold","text-success")
}



/*פונקצית חיפוש */
const input=document.getElementById("searchInput")
input.addEventListener("input",function (){
const value = this.value.toLowerCase();

if(value==="")
{
    renderProducts(products)
}
else{
    const arrSearch = products.filter(product=> product.name.toLowerCase().includes(value))
    renderProducts(arrSearch)
}
})