// ==================== STATE MANAGEMENT ====================
// Using in-memory state instead of localStorage (sandboxed environment)
let state = {
  products: [],
  filteredProducts: [],
  cart: [],
  currentUser: null,
  currentPage: 'home',
  darkMode: false,
  filters: {
    search: '',
    category: 'all',
    minPrice: 0,
    maxPrice: 1000,
    minRating: 0
  },
  users: [
    { username: 'demo_user', email: 'user@example.com', password: 'password123' }
  ]
};

// ==================== INITIALIZATION ====================
window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  loadProducts();
  updateCartBadge();
  updateAuthButton();
  navigateTo('home');
}

// ==================== API FUNCTIONS ====================
async function loadProducts() {
  const loadingEl = document.getElementById('products-loading');
  const errorEl = document.getElementById('products-error');
  const gridEl = document.getElementById('products-grid');
  
  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  gridEl.innerHTML = '';
  
  try {
    const response = await fetch('https://fakestoreapi.com/products');
    if (!response.ok) throw new Error('Failed to fetch products');
    
    state.products = await response.json();
    state.filteredProducts = [...state.products];
    
    loadingEl.style.display = 'none';
    renderProducts();
    loadCategories();
  } catch (error) {
    console.error('Error loading products:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}

function loadCategories() {
  const categories = ['all', ...new Set(state.products.map(p => p.category))];
  const select = document.getElementById('category-filter');
  
  select.innerHTML = categories.map(cat => 
    `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`
  ).join('');
}

// ==================== RENDERING FUNCTIONS ====================
function renderProducts() {
  const gridEl = document.getElementById('products-grid');
  
  if (state.filteredProducts.length === 0) {
    gridEl.innerHTML = '<div class="empty-state"><p>No products found matching your filters.</p></div>';
    return;
  }
  
  gridEl.innerHTML = state.filteredProducts.map(product => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.title}" class="product-image">
      <div class="product-category">${product.category}</div>
      <h3 class="product-title">${product.title}</h3>
      <div class="product-rating">
        <span>⭐ ${product.rating.rate}</span>
        <span>(${product.rating.count} reviews)</span>
      </div>
      <div class="product-price">$${product.price.toFixed(2)}</div>
      <div class="product-actions">
        <div class="quantity-selector">
          <button onclick="updateProductQuantity(${product.id}, -1)">−</button>
          <span id="qty-${product.id}">1</span>
          <button onclick="updateProductQuantity(${product.id}, 1)">+</button>
        </div>
        <button class="btn btn--primary" onclick="addToCart(${product.id})">
          Add to Cart
        </button>
      </div>
    </div>
  `).join('');
  
  updateFilterCount();
}

function renderCart() {
  const emptyEl = document.getElementById('cart-empty');
  const contentEl = document.getElementById('cart-content');
  const itemsEl = document.getElementById('cart-items');
  
  if (state.cart.length === 0) {
    emptyEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }
  
  emptyEl.style.display = 'none';
  contentEl.style.display = 'block';
  
  itemsEl.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.title}" class="cart-item-image">
      <div class="cart-item-details">
        <h3 class="cart-item-title">${item.title}</h3>
        <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
        <div class="cart-item-actions">
          <div class="quantity-selector">
            <button onclick="updateCartItemQuantity(${item.id}, -1)">−</button>
            <span>${item.quantity}</span>
            <button onclick="updateCartItemQuantity(${item.id}, 1)">+</button>
          </div>
          <button class="btn btn--outline" onclick="removeFromCart(${item.id})">
            Remove
          </button>
        </div>
      </div>
      <div class="cart-item-total">
        <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
      </div>
    </div>
  `).join('');
  
  updateCartSummary();
}

function renderCheckout() {
  const itemsEl = document.getElementById('checkout-items');
  
  itemsEl.innerHTML = state.cart.map(item => `
    <div class="checkout-item">
      <div class="checkout-item-info">
        <div class="checkout-item-name">${item.title}</div>
        <div class="checkout-item-qty">Quantity: ${item.quantity}</div>
      </div>
      <div class="checkout-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
    </div>
  `).join('');
  
  updateCheckoutSummary();
}

// ==================== CART FUNCTIONS ====================
function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  const qtyEl = document.getElementById(`qty-${productId}`);
  const quantity = parseInt(qtyEl.textContent);
  
  const existingItem = state.cart.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    state.cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      quantity: quantity
    });
  }
  
  qtyEl.textContent = '1';
  updateCartBadge();
  showToast('Item added to cart!', 'success');
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.id !== productId);
  updateCartBadge();
  renderCart();
  showToast('Item removed from cart', 'info');
}

function updateCartItemQuantity(productId, change) {
  const item = state.cart.find(item => item.id === productId);
  
  if (item) {
    item.quantity += change;
    
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      renderCart();
      updateCartBadge();
    }
  }
}

function updateProductQuantity(productId, change) {
  const qtyEl = document.getElementById(`qty-${productId}`);
  let qty = parseInt(qtyEl.textContent);
  qty = Math.max(1, qty + change);
  qtyEl.textContent = qty;
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = totalItems;
}

function updateCartSummary() {
  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.10;
  const total = subtotal + tax;
  
  document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('cart-tax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
}

function updateCheckoutSummary() {
  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.10;
  const total = subtotal + tax;
  
  document.getElementById('checkout-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('checkout-tax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('checkout-total').textContent = `$${total.toFixed(2)}`;
}

function calculateSubtotal() {
  return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ==================== FILTER FUNCTIONS ====================
function applyFilters() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const category = document.getElementById('category-filter').value;
  const minPrice = parseFloat(document.getElementById('min-price').value);
  const maxPrice = parseFloat(document.getElementById('max-price').value);
  const minRating = parseFloat(document.getElementById('rating-filter').value);
  
  state.filters = { search: searchTerm, category, minPrice, maxPrice, minRating };
  
  state.filteredProducts = state.products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm);
    const matchesCategory = category === 'all' || product.category === category;
    const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
    const matchesRating = product.rating.rate >= minRating;
    
    return matchesSearch && matchesCategory && matchesPrice && matchesRating;
  });
  
  renderProducts();
}

function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('category-filter').value = 'all';
  document.getElementById('min-price').value = '0';
  document.getElementById('max-price').value = '1000';
  document.getElementById('rating-filter').value = '0';
  
  updatePriceDisplay();
  applyFilters();
}

function updatePriceDisplay() {
  const minPrice = document.getElementById('min-price').value;
  const maxPrice = document.getElementById('max-price').value;
  document.getElementById('price-value').textContent = `${minPrice}-${maxPrice}`;
}

function updateFilterCount() {
  const countEl = document.getElementById('filter-count');
  countEl.textContent = `Showing ${state.filteredProducts.length} of ${state.products.length} products`;
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // Show selected page
  const pageEl = document.getElementById(`${page}-page`);
  if (pageEl) {
    pageEl.classList.add('active');
    state.currentPage = page;
    
    // Render page-specific content
    if (page === 'cart') {
      renderCart();
    } else if (page === 'checkout') {
      renderCheckout();
    } else if (page === 'profile') {
      renderProfile();
    }
    
    // Show/hide filters based on page
    const filtersSection = document.getElementById('filters-section');
    filtersSection.style.display = page === 'home' ? 'block' : 'none';
  }
}

function proceedToCheckout() {
  if (!state.currentUser) {
    showToast('Please login to proceed to checkout', 'error');
    navigateTo('auth');
    return;
  }
  
  if (state.cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }
  
  navigateTo('checkout');
}

// ==================== CHECKOUT & ORDER ====================
function placeOrder(event) {
  event.preventDefault();
  
  const fullName = document.getElementById('full-name').value;
  const email = document.getElementById('email').value;
  const address = document.getElementById('address').value;
  const cardNumber = document.getElementById('card-number').value;
  const expiryDate = document.getElementById('expiry-date').value;
  const cvv = document.getElementById('cvv').value;
  
  // Validate card number format (simple check)
  if (cardNumber.length < 13) {
    showToast('Invalid card number', 'error');
    return;
  }
  
  // Validate expiry date format (MM/YY)
  if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
    showToast('Invalid expiry date format (MM/YY)', 'error');
    return;
  }
  
  // Validate CVV
  if (cvv.length !== 3) {
    showToast('Invalid CVV', 'error');
    return;
  }
  
  // Generate order ID
  const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  
  // Calculate delivery date (7 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  const formattedDate = deliveryDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Clear cart
  state.cart = [];
  updateCartBadge();
  
  // Show confirmation
  document.getElementById('order-id').textContent = orderId;
  document.getElementById('delivery-date').textContent = formattedDate;
  
  navigateTo('confirmation');
  showToast('Order placed successfully!', 'success');
  
  // Reset form
  document.getElementById('checkout-form').reset();
}

// Format card number input
document.addEventListener('DOMContentLoaded', () => {
  const cardInput = document.getElementById('card-number');
  if (cardInput) {
    cardInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s/g, '');
      let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formattedValue;
    });
  }
});

// ==================== AUTHENTICATION ====================
function handleAuthButton() {
  if (state.currentUser) {
    navigateTo('profile');
  } else {
    navigateTo('auth');
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  
  if (tab === 'login') {
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    document.getElementById('login-form').classList.add('active');
  } else {
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
    document.getElementById('signup-form').classList.add('active');
  }
}

function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  const user = state.users.find(u => u.email === email && u.password === password);
  
  if (user) {
    state.currentUser = user;
    updateAuthButton();
    showToast(`Welcome back, ${user.username}!`, 'success');
    navigateTo('home');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').style.display = 'none';
  } else {
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = 'Invalid email or password';
    errorEl.style.display = 'block';
  }
}

function handleSignup(event) {
  event.preventDefault();
  
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  
  // Check if user already exists
  if (state.users.find(u => u.email === email)) {
    const errorEl = document.getElementById('signup-error');
    errorEl.textContent = 'User with this email already exists';
    errorEl.style.display = 'block';
    return;
  }
  
  // Create new user
  const newUser = { username, email, password };
  state.users.push(newUser);
  state.currentUser = newUser;
  
  updateAuthButton();
  showToast(`Account created! Welcome, ${username}!`, 'success');
  navigateTo('home');
  
  // Reset form
  document.getElementById('signup-username').value = '';
  document.getElementById('signup-email').value = '';
  document.getElementById('signup-password').value = '';
  document.getElementById('signup-error').style.display = 'none';
}

function handleLogout() {
  state.currentUser = null;
  updateAuthButton();
  showToast('Logged out successfully', 'info');
  navigateTo('home');
}

function updateAuthButton() {
  const authBtn = document.getElementById('auth-btn');
  const authText = document.getElementById('auth-text');
  const authIcon = document.getElementById('auth-icon');
  
  if (state.currentUser) {
    authText.textContent = state.currentUser.username;
    authIcon.textContent = '👤';
  } else {
    authText.textContent = 'Login';
    authIcon.textContent = '👤';
  }
}

function renderProfile() {
  if (!state.currentUser) {
    navigateTo('auth');
    return;
  }
  
  document.getElementById('profile-name').textContent = state.currentUser.username;
  document.getElementById('profile-email').textContent = state.currentUser.email;
}

// ==================== DARK MODE ====================
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  
  if (state.darkMode) {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    document.getElementById('theme-icon').textContent = '☀️';
  } else {
    document.documentElement.setAttribute('data-color-scheme', 'light');
    document.getElementById('theme-icon').textContent = '🌙';
  }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };
  
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}