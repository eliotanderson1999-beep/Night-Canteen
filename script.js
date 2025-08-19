async function initializeApp() {
  try {
    showLoading(true);
    const items = await loadMenuItems();
    menuItems = items;
    displayMenuItems(items);
    setupEventListeners();
    updateOrderSummary(getCurrentOrder());
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showError("Failed to load menu. Please refresh the page.");
  } finally {
    showLoading(false);
  }
}
document.addEventListener("DOMContentLoaded", function () {
  // Initialize app
  initializeApp();
});

let menuItems = [];
let isLoading = false;

// Operating hours configuration
const OPERATING_HOURS = {
  startHour: 22, // 10 PM (22:00)
  endHour: 1, // 1 AM (01:00)
  timezone: "Asia/Kolkata", // Indian Standard Time
};

async function initializeApp() {
  try {
    showLoading(true);
    const items = await loadMenuItems();
    menuItems = items;
    displayMenuItems(items);
    setupEventListeners();
    updateOrderSummary(getCurrentOrder());
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showError("Failed to load menu. Please refresh the page.");
  } finally {
    showLoading(false);
  }
}

async function loadMenuItems() {
  // Fallback menu items in case JSON fails to load
  const fallbackItems = [
    {
      id: 1,
      name: "Maggie Noodles",
      description: "52gm pack",
      price: 12,
    },
    {
      id: 2,
      name: "Maggie Noodles",
      description: "70gm pack",
      price: 17,
    },
    {
      id: 3,
      name: "BourBon",
      description:
        "Double-layered chocolate cream biscuits – crunchy outside, creamy inside. Perfect late-night munch.",
      price: 35,
    },

    {
      id: 4,
      name: "Nice Time",
      description:
        "Light, crispy coconut-flavored biscuits with sugar crystals on top. Sweet and simple, ekdum mood fresh.",
      price: 15,
    },
    {
      id: 5,
      name: "Coffee",
      description:
        "Quick-fix strong coffee sachet – bas garam paani daalo aur jag jao. Budget-friendly caffeine boost.",
      price: 3,
    },
  ];

  try {
    console.log("Loading menu items from JSON..."); // Debug
    const response = await fetch("items.json");
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const items = await response.json();
    console.log("Loaded items from JSON:", items); // Debug

    // Validate the loaded items
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Invalid items data received");
    }

    // Ensure all items have required properties
    const validItems = items.filter(
      (item) =>
        item &&
        typeof item.id !== "undefined" &&
        item.name &&
        typeof item.price === "number"
    );

    if (validItems.length !== items.length) {
      console.warn(
        `${items.length - validItems.length} invalid items filtered out`
      );
    }

    return validItems;
  } catch (error) {
    console.warn("Failed to load from JSON, using fallback items:", error);
    return fallbackItems;
  }
}

function setupEventListeners() {
  const proceedBtn = document.getElementById("proceed-to-order");
  const newOrderBtn = document.getElementById("new-order");
  const orderForm = document.getElementById("customer-order-form");
  const submitFeedbackBtn = document.getElementById("submit-feedback");
  const downloadBillBtn = document.getElementById("download-bill");

  console.log("Setting up event listeners..."); // Debug
  console.log("proceedBtn:", proceedBtn); // Debug

  if (proceedBtn) {
    proceedBtn.addEventListener("click", (e) => {
      console.log("Proceed button clicked!"); // Debug
      e.preventDefault(); // Prevent any default behavior

      const order = getCurrentOrder();
      console.log("Current order:", order); // Debug

      if (order.items && order.items.length > 0) {
        console.log("Calling showOrderForm..."); // Debug
        showOrderForm();
      } else {
        console.log("No items in order"); // Debug
        showError("Please add items to your order first!");
      }
    });
    console.log("Proceed button listener added"); // Debug
  } else {
    console.error("Proceed button not found!"); // Debug
  }

  if (newOrderBtn) {
    newOrderBtn.addEventListener("click", resetOrder);
  }

  if (orderForm) {
    orderForm.addEventListener("submit", handleFormSubmit);
  }

  if (submitFeedbackBtn) {
    submitFeedbackBtn.addEventListener("click", handleFeedback);
  }

  if (downloadBillBtn) {
    downloadBillBtn.addEventListener("click", downloadBill);
  }
}

function showSection(sectionId) {
  const sections = ["menu", "order-summary", "order-form", "thank-you"];

  // Hide all sections
  sections.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.add("hidden");
    }
  });

  // Show target section
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove("hidden");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function displayMenuItems(items) {
  const menuContainer = document.getElementById("menu-items");
  if (!menuContainer) return;

  console.log("Displaying menu items:", items); // Debug

  menuContainer.innerHTML = "";

  items.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item-card";
    div.style.animationDelay = `${index * 0.1}s`;

    div.innerHTML = `
      <div class="item-image">🍜</div>
      <h3>${escapeHtml(item.name)}</h3>
      <p class="item-description">${escapeHtml(item.description || "")}</p>
      <p class="price">₹${item.price}</p>
      <button class="add-to-order" data-id="${item.id}">
        <span class="btn-text">Add to Order</span>
        <span class="btn-icon">+</span>
      </button>`;

    menuContainer.appendChild(div);
  });

  // Add click listeners with animation
  document.querySelectorAll(".add-to-order").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      console.log("Button clicked, data-id:", e.target.getAttribute("data-id")); // Debug
      animateButton(e.target);
      addItemToOrder(e);
    });
  });
}

function animateButton(button) {
  button.style.transform = "scale(0.95)";
  button.style.background = "#27ae60";

  setTimeout(() => {
    button.style.transform = "scale(1)";
    button.style.background = "";
  }, 150);
}

function addItemToOrder(e) {
  // Get the button that was clicked (handle event bubbling)
  let button = e.target;
  if (!button.classList.contains("add-to-order")) {
    button = button.closest(".add-to-order");
  }

  if (!button) {
    console.error("Could not find add-to-order button");
    return;
  }

  const id = button.getAttribute("data-id");
  console.log("Adding item with ID (string):", id); // Debug

  // Try both string and number comparison to be safe
  let selectedItem = menuItems.find(
    (item) => item.id == id || item.id === parseInt(id)
  );

  // If still not found, try to reload menu items and search again
  if (!selectedItem && menuItems.length === 0) {
    console.log("Menu items not loaded, reloading..."); // Debug
    showError("Loading menu... Please try again in a moment.");

    // Reload menu items
    loadMenuItems().then((items) => {
      menuItems = items;
      selectedItem = menuItems.find(
        (item) => item.id == id || item.id === parseInt(id)
      );
      if (selectedItem) {
        proceedWithAddingItem(selectedItem, id);
      } else {
        showError("Item not available at the moment!");
      }
    });
    return;
  }

  if (!selectedItem) {
    console.error(`Item with ID ${id} not found in menuItems:`, menuItems); // Debug
    showError("Item not found! Please refresh the page.");
    return;
  }

  proceedWithAddingItem(selectedItem, id);
}

function proceedWithAddingItem(selectedItem, id) {
  let order = getCurrentOrder();
  const existingItem = order.items.find((item) => item.id == id);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    order.items.push({ ...selectedItem, quantity: 1 });
  }

  order.total += selectedItem.price;
  saveOrder(order);
  updateOrderSummary(order);

  // Enable proceed button
  const proceedBtn = document.getElementById("proceed-to-order");
  if (proceedBtn) {
    proceedBtn.disabled = false;
    proceedBtn.classList.add("enabled");
  }

  // Show success feedback
  showSuccess(`${selectedItem.name} added to order!`);
}

function updateOrderSummary(order) {
  const selectedItemsContainer = document.getElementById("selected-items");
  if (!selectedItemsContainer) return;

  if (!order.items || order.items.length === 0) {
    selectedItemsContainer.innerHTML = `
      <div class="empty-order">
        <p>🛒 No items selected yet.</p>
        <p>Browse our menu above to add items!</p>
      </div>`;
    return;
  }

  const itemsHTML = order.items
    .map(
      (item) => `
    <div class="order-item">
      <div class="item-info">
        <span class="item-name">${escapeHtml(item.name)}</span>
        <span class="item-quantity">x${item.quantity}</span>
      </div>
      <div class="item-controls">
        <button class="quantity-btn minus" onclick="changeQuantity(${
          item.id
        }, -1)">-</button>
        <span class="item-price">₹${item.price * item.quantity}</span>
        <button class="quantity-btn plus" onclick="changeQuantity(${
          item.id
        }, 1)">+</button>
      </div>
    </div>
  `
    )
    .join("");

  selectedItemsContainer.innerHTML = `
    ${itemsHTML}
    <div class="order-total">
      <hr>
      <div class="total-row">
        <span class="total-label">Total Amount:</span>
        <span class="total-amount">₹${order.total}</span>
      </div>
    </div>`;
}

function changeQuantity(itemId, delta) {
  let order = getCurrentOrder();
  const item = order.items.find((i) => i.id === itemId);

  if (!item) return;

  const menuItem = menuItems.find((m) => m.id === itemId);
  if (!menuItem) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    order.items = order.items.filter((i) => i.id !== itemId);
    order.total -= menuItem.price;
  } else {
    order.total += delta * menuItem.price;
  }

  // Ensure total doesn't go negative
  order.total = Math.max(0, order.total);

  saveOrder(order);
  updateOrderSummary(order);

  // Update proceed button state
  const proceedBtn = document.getElementById("proceed-to-order");
  if (proceedBtn) {
    proceedBtn.disabled = order.items.length === 0;
    proceedBtn.classList.toggle("enabled", order.items.length > 0);
  }
}

function showOrderForm() {
  const order = getCurrentOrder();
  console.log("showOrderForm called, order:", order); // Debug log

  if (!order.items || order.items.length === 0) {
    showError("Please add items to your order first!");
    return;
  }

  showSection("order-form");

  const orderItemsList = document.getElementById("order-items-list");
  console.log("orderItemsList element:", orderItemsList); // Debug log

  if (orderItemsList) {
    const itemsHTML = order.items
      .map(
        (item) => `
      <div class="order-summary-item">
        <span>${escapeHtml(item.name)} - ${item.quantity} x ₹${
          item.price
        }</span>
        <span class="item-subtotal">₹${item.price * item.quantity}</span>
      </div>
    `
      )
      .join("");

    orderItemsList.innerHTML = `
      ${itemsHTML}
      <hr>
      <div class="final-total">
        <strong>Total: ₹${order.total}</strong>
      </div>`;
  } else {
    console.error("order-items-list element not found!");
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (isLoading) return;

  const order = getCurrentOrder();
  if (!order.items || order.items.length === 0) {
    showError("No items in order!");
    return;
  }

  const formData = {
    name: document.getElementById("name").value.trim(),
    room: document.getElementById("room").value.trim(),
    mobile: document.getElementById("mobile").value.trim(),
    order: order.items
      .map((item) => `${item.name} (x${item.quantity})`)
      .join(", "),
    total: order.total,
    items: order.items,
    timestamp: new Date().toLocaleString(),
  };

  // Validation
  if (!formData.name || !formData.room || !formData.mobile) {
    showError("Please fill in all required fields!");
    return;
  }

  if (!/^\d{10}$/.test(formData.mobile.replace(/\s+/g, ""))) {
    showError("Please enter a valid 10-digit mobile number!");
    return;
  }

  try {
    isLoading = true;
    showLoading(true, "Placing your order...");

    // Save order for bill generation
    sessionStorage.setItem("lastOrder", JSON.stringify(formData));

    // Submit to Google Sheets (if form-handler.js is available)
    if (typeof submitOrderToGoogleSheets === "function") {
      await submitOrderToGoogleSheets(formData);
    }

    // Clear current order
    sessionStorage.removeItem("order");

    showSection("thank-you");
    showSuccess("Order placed successfully! 🎉");
  } catch (error) {
    console.error("Error submitting order:", error);
    showError("Failed to place order. Please try again!");
  } finally {
    isLoading = false;
    showLoading(false);
  }
}

async function handleFeedback() {
  const feedbackText = document.getElementById("feedback-text");
  if (!feedbackText) return;

  const text = feedbackText.value.trim();
  if (!text) {
    showError("Please enter your feedback!");
    return;
  }

  try {
    if (typeof submitOrderToGoogleSheets === "function") {
      await submitOrderToGoogleSheets({
        feedback: text,
        timestamp: new Date().toLocaleString(),
      });
    }

    document.getElementById("feedback-section").innerHTML = `
      <div class="feedback-success">
        <h3>✨ Thank you for your feedback!</h3>
        <p>We appreciate your input and will use it to improve our service.</p>
      </div>`;
  } catch (error) {
    console.error("Error submitting feedback:", error);
    showError("Failed to submit feedback. Please try again!");
  }
}

function downloadBill() {
  const order = JSON.parse(sessionStorage.getItem("lastOrder"));
  if (!order || !order.items) {
    showError("No bill available to download!");
    return;
  }

  const billWindow = window.open("", "PRINT", "height=600,width=800");

  const billHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Night Canteen - Invoice</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .order-details { margin: 20px 0; }
        .items { margin: 20px 0; }
        .item { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { font-weight: bold; border-top: 1px solid #333; padding-top: 10px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌙 Night Canteen</h1>
        <p>Invoice - ${order.timestamp || new Date().toLocaleString()}</p>
      </div>
      
      <div class="order-details">
        <p><strong>Customer:</strong> ${escapeHtml(order.name)}</p>
        <p><strong>Room:</strong> ${escapeHtml(order.room)}</p>
        <p><strong>Mobile:</strong> ${escapeHtml(order.mobile)}</p>
      </div>
      
      <div class="items">
        <h3>Order Items:</h3>
        ${order.items
          .map(
            (item) => `
          <div class="item">
            <span>${escapeHtml(item.name)} x ${item.quantity}</span>
            <span>₹${item.price * item.quantity}</span>
          </div>
        `
          )
          .join("")}
      </div>
      
      <div class="total">
        <div class="item">
          <span>Total Amount:</span>
          <span>₹${order.total}</span>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <p>Thank you for ordering with Night Canteen!</p>
        <p>Open: 10 PM - 1 AM | Contact: 9341320141</p>
      </div>
    </body>
    </html>
  `;

  billWindow.document.write(billHTML);
  billWindow.document.close();
  billWindow.print();
}

function resetOrder() {
  // Clear form
  const form = document.getElementById("customer-order-form");
  if (form) form.reset();

  // Clear orders from storage
  sessionStorage.removeItem("order");
  sessionStorage.removeItem("lastOrder");

  // Reset UI
  updateOrderSummary({ items: [], total: 0 });

  const proceedBtn = document.getElementById("proceed-to-order");
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.classList.remove("enabled");
  }

  showSection("menu");
  showSuccess("Ready for a new order! 🛒");
}

// Utility Functions
function getCurrentOrder() {
  const order = sessionStorage.getItem("order");
  return order ? JSON.parse(order) : { items: [], total: 0 };
}

function saveOrder(order) {
  sessionStorage.setItem("order", JSON.stringify(order));
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showLoading(show, message = "Loading...") {
  let loader = document.getElementById("loader");

  if (show) {
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "loader";
      loader.innerHTML = `
        <div class="loader-backdrop">
          <div class="loader-content">
            <div class="spinner"></div>
            <p>${message}</p>
          </div>
        </div>
      `;
      document.body.appendChild(loader);
    }
    loader.style.display = "flex";
  } else {
    if (loader) {
      loader.style.display = "none";
    }
  }
}

function showSuccess(message) {
  showNotification(message, "success");
}

function showError(message) {
  showNotification(message, "error");
}

function showNotification(message, type) {
  // Remove existing notifications
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="notification-text">${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

// Make changeQuantity globally available
window.changeQuantity = changeQuantity;
