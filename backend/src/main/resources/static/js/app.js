const API = window.APP_API_BASE || '/api';
function csrfToken() {
  const cookie = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='));
  return cookie ? decodeURIComponent(cookie.substring(10)) : '';
}
const state = {
  vehicles: [],
  user: JSON.parse(sessionStorage.getItem('thrissurUser') || 'null'),
  shopAuth: sessionStorage.getItem('thrissurShopSession') === 'true'
};

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.method && options.method !== 'GET') {
    let token = csrfToken();
    if (!token) {
      await fetch(`${API}/auth/csrf`, { credentials: 'include' });
      token = csrfToken();
    }
    if (token) headers['X-XSRF-TOKEN'] = token;
  }
  return fetch(`${API}${path}`, { ...options, headers, credentials: 'include' });
}

function setShopSession(username, password, shop) {
  state.shopAuth = true;
  state.user = { role: 'SHOP_OWNER', username, shopId: shop.shopId, status: shop.status };
  sessionStorage.setItem('thrissurShopSession', 'true');
  sessionStorage.setItem('thrissurUser', JSON.stringify(state.user));
}

function logout() {
  api('/auth/logout', { method: 'POST', body: '{}' });
  state.user = null;
  state.shopAuth = false;
  sessionStorage.removeItem('thrissurUser');
  sessionStorage.removeItem('thrissurShopSession');
  window.location.hash = '/';
}

function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <div class="kicker">Trusted mobility for every journey</div>
          <h1>Your road.<span class="highlight">Your choice.</span></h1>
          <p>Rent well-maintained cars and bikes across Thrissur with transparent pricing, flexible dates, and support whenever you need it.</p>
          <button class="btn btn-primary hero-cta" data-route="vehicles">Explore vehicles →</button>
        </div>
        <div class="search-card">
          <h3>Find your perfect ride in Thrissur</h3>
          <div class="search-box">
            <input id="homeSearch" type="text" placeholder="Search by vehicle, brand or area" />
            <button class="btn btn-primary" id="heroSearchBtn">Search</button>
          </div>
          <div class="search-meta"><span>Sample demo rates from <strong>₹650/day</strong></span></div>
          <div class="check-list"><span>Verified vehicles</span><span>Easy returns</span></div>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div><div class="eyebrow">Popular fleet</div><h2>Ready when you are</h2></div>
          <button class="link-button" data-route="vehicles">View all</button>
        </div>
        <div id="vehicleGrid" class="vehicle-grid"></div>
      </div>
    </section>
  `;
  bindRouteButtons();
  fetchVehicles();
  document.getElementById('heroSearchBtn').onclick = () => renderVehiclesPage(document.getElementById('homeSearch').value.trim());
}

function renderVehiclesPage(query = '') {
  const filtered = state.vehicles.filter(v => {
    const haystack = `${v.vehicleName || ''} ${v.brand || ''} ${v.model || ''} ${v.shop?.area || ''}`.toLowerCase();
    return !query || haystack.includes(query.toLowerCase());
  });
  document.getElementById('app').innerHTML = `
    <div class="page-shell">
      <div class="eyebrow">Our fleet</div><h1>Find your next vehicle</h1>
      <div class="search-box" style="margin-top:20px;background:#fff;max-width:1000px;">
        <input id="vehicleSearchInput" type="text" value="${escapeHtml(query)}" placeholder="Search by name, brand, model or area" />
        <button class="btn btn-primary" id="applyVehicleFilter">Apply filters</button>
      </div>
      <div class="vehicle-grid" style="margin-top:30px;">${filtered.map(renderVehicleCard).join('')}</div>
    </div>`;
  bindRouteButtons();
  document.getElementById('applyVehicleFilter').onclick = () => renderVehiclesPage(document.getElementById('vehicleSearchInput').value.trim());
}

function renderVehicleCard(vehicle) {
  const image = vehicle.imagePath || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80';
  return `<article class="vehicle-card"><div class="vehicle-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(vehicle.vehicleName || 'Vehicle')}" /></div>
    <div class="vehicle-body"><div class="vehicle-name">${escapeHtml(vehicle.vehicleName || 'Vehicle')}</div>
    <div class="meta-row"><span>${escapeHtml(vehicle.brand || 'Brand')}</span><span class="badge">${escapeHtml(vehicle.vehicleStatus || 'AVAILABLE')}</span></div>
    <div class="meta-row"><span>₹${vehicle.rentPerDay || '0'}/day</span><span>${escapeHtml(vehicle.shop?.area || 'Thrissur')}</span></div></div></article>`;
}

function renderShopRegister() {
  document.getElementById('app').innerHTML = `
    <div class="auth-shell"><div class="auth-panel auth-panel-wide">
      <div class="eyebrow">Partner with Thrissur Fleet</div><h2>Register your rental shop</h2>
      <p class="form-note">Your registration will be reviewed by a Platform Admin before your shop can accept rentals.</p>
      <form id="shopRegisterForm" class="form-grid">
        <div class="form-group"><label>Shop Name</label><input name="shopName" required /></div>
        <div class="form-group"><label>Owner Name</label><input name="ownerName" required /></div>
        <div class="form-group"><label>Mobile Number</label><input name="mobile" required /></div>
        <div class="form-group"><label>Email</label><input name="email" type="email" required /></div>
        <div class="form-group"><label>Area / Locality</label><input name="area" placeholder="Punkunnam, Viyyur..." required /></div>
        <div class="form-group form-full"><label>Full Shop Address</label><input name="address" required /></div>
        <div class="form-group"><label>Username</label><input name="username" required /></div>
        <div class="form-group"><label>Password</label><input name="password" type="password" minlength="8" required /></div>
        <div class="form-group"><label>Confirm Password</label><input name="confirmPassword" type="password" minlength="8" required /></div>
        <div class="form-group"><label>Business Registration / License Number</label><input name="businessLicenseNo" required /></div>
        <div class="form-group"><label>Owner ID Proof Number</label><input name="ownerIdProofNo" required /></div>
        <button class="btn btn-primary form-full" type="submit">Submit registration</button>
      </form>
      <div id="shopRegisterMessage" class="form-message"></div>
      <div class="auth-switch">Already registered? <a href="#/shop/login">Shop owner sign in</a></div>
    </div></div>`;
  document.getElementById('shopRegisterForm').onsubmit = async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    if (payload.password !== payload.confirmPassword) {
      showMessage('shopRegisterMessage', 'Passwords do not match.', true);
      return;
    }
    delete payload.confirmPassword;
    const response = await api('/auth/shop/register', { method: 'POST', body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) {
      showMessage('shopRegisterMessage', data.message || 'Registration failed.', true);
      return;
    }
    showMessage('shopRegisterMessage', 'Shop registration submitted successfully. Your account will be available after Platform Admin approval.');
    event.target.reset();
  };
}

function renderShopLogin() {
  document.getElementById('app').innerHTML = `
    <div class="auth-shell"><div class="auth-panel">
      <div class="eyebrow">Shop owner account</div><h2>Welcome back</h2>
      <p class="form-note">Sign in to manage your own shop, vehicles and rentals.</p>
      <form id="shopLoginForm">
        <div class="form-group"><label>Username or Email</label><input name="username" required /></div>
        <div class="form-group"><label>Password</label><input name="password" type="password" required /></div>
        <button class="btn btn-primary" type="submit">Sign in</button>
      </form>
      <div id="shopLoginMessage" class="form-message"></div>
      <div class="auth-switch">New partner? <a href="#/shop/register">Register your shop</a></div>
    </div></div>`;
  document.getElementById('shopLoginForm').onsubmit = async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const response = await api('/auth/shop/login', { method: 'POST', body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) {
      showMessage('shopLoginMessage', [data.message, data.reason].filter(Boolean).join(' '), true);
      return;
    }
    setShopSession(data.username, payload.password, data);
    window.location.hash = '/shop/dashboard';
  };
}

async function renderShopDashboard(section = 'dashboard') {
  if (!state.shopAuth) {
    window.location.hash = '/shop/login';
    return;
  }
  const response = await api('/shop/dashboard');
  const data = await response.json();
  if (!response.ok) {
    showBlockedShop(data);
    return;
  }
  const shop = data.shop;
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="shop-layout">
      <aside class="shop-sidebar">
        <div class="shop-brand">Thrissur Fleet</div>
        <div class="shop-label">SHOP OWNER</div>
        ${shopNav('dashboard', 'Dashboard', section)}
        ${shopNav('profile', 'My Shop', section)}
        ${shopNav('vehicles', 'Vehicles', section)}
        ${shopNav('bookings', 'Bookings', section)}
        ${shopNav('customers', 'Customers', section)}
        ${shopNav('reports', 'Reports', section)}
        <button class="sidebar-link" id="shopLogout">Logout</button>
      </aside>
      <main class="shop-main"><div class="shop-topbar"><div><div class="eyebrow">Owner workspace</div><h1>${escapeHtml(shop.shopName)}</h1></div><span class="status-pill ${shop.status.toLowerCase()}">${escapeHtml(shop.status)}</span></div>
        <div id="shopContent"></div>
      </main>
    </div>`;
  document.getElementById('shopLogout').onclick = logout;
  document.querySelectorAll('[data-shop-section]').forEach(link => link.onclick = () => renderShopDashboard(link.dataset.shopSection));
  if (section === 'profile') renderShopProfile(shop);
  else if (section === 'vehicles') renderShopVehicles(data);
  else if (section === 'bookings') renderShopBookings(data.rentals || []);
  else if (section === 'customers') renderShopCustomers();
  else if (section === 'reports') renderShopReports();
  else renderShopOverview(data);
}

function shopNav(section, label, active) {
  return `<button class="sidebar-link ${section === active ? 'active' : ''}" data-shop-section="${section}">${label}</button>`;
}

function renderShopOverview(data) {
  const cards = [
    ['Total vehicles', data.totalVehicles], ['Available vehicles', data.availableVehicles],
    ['Maintenance', data.maintenanceVehicles], ['Total bookings', data.totalBookings],
    ['Pending verification', data.pendingVerification], ['Active rentals', data.activeRentals],
    ['Return requests', data.returnRequests], ['Completed rentals', data.completedRentals]
  ];
  document.getElementById('shopContent').innerHTML = `<div class="stat-grid">${cards.map(c => `<div class="stat-card"><div class="label">${c[0]}</div><div class="value">${c[1]}</div></div>`).join('')}</div>
    <div class="notice-card"><strong>Physical verification only</strong><p>Payment and vehicle handover are completed directly at the rental shop after physical document verification.</p></div>`;
}

function renderShopProfile(shop) {
  document.getElementById('shopContent').innerHTML = `<div class="dashboard-box"><div class="section-header"><div><div class="eyebrow">My shop</div><h2>Shop profile</h2></div><span class="status-pill ${shop.status.toLowerCase()}">${escapeHtml(shop.status)}</span></div>
    <form id="shopProfileForm" class="form-grid">
      <div class="form-group"><label>Shop ID</label><input value="${shop.shopId}" disabled /></div>
      <div class="form-group"><label>Registration Date</label><input value="${shop.registrationDate || ''}" disabled /></div>
      ${profileInput('shopName', 'Shop Name', shop.shopName)}${profileInput('ownerName', 'Owner Name', shop.ownerName)}
      ${profileInput('mobile', 'Mobile', shop.mobile)}${profileInput('email', 'Email', shop.email)}
      ${profileInput('area', 'Area', shop.area)}${profileInput('businessLicenseNo', 'Business License Number', shop.businessLicenseNo)}
      ${profileInput('ownerIdProofNo', 'Owner ID Proof Number', shop.ownerIdProofNo)}
      <div class="form-group form-full"><label>Full Address</label><input name="address" value="${escapeHtml(shop.address)}" required /></div>
      <button class="btn btn-primary form-full" type="submit">Save profile</button>
    </form><div id="profileMessage" class="form-message"></div></div>`;
  document.getElementById('shopProfileForm').onsubmit = async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const response = await api('/shop/profile', { method: 'PATCH', body: JSON.stringify(payload) });
    showMessage('profileMessage', response.ok ? 'Profile updated successfully.' : 'Unable to update profile.', !response.ok);
  };
}

function profileInput(name, label, value) {
  return `<div class="form-group"><label>${label}</label><input name="${name}" value="${escapeHtml(value || '')}" required /></div>`;
}

function renderShopVehicles(data) {
  const vehicles = data.vehicles || [];
  document.getElementById('shopContent').innerHTML = `<div class="section-header"><div><div class="eyebrow">Fleet control</div><h2>Vehicles</h2></div><button class="btn btn-primary" id="addVehicleButton">Add vehicle</button></div>
    <div id="vehicleFormSlot"></div><div class="dashboard-box"><div class="table-wrap"><table><thead><tr><th>Vehicle</th><th>Type</th><th>Rate</th><th>Status</th><th>Action</th></tr></thead><tbody>${vehicles.map(v => `<tr><td>${escapeHtml(v.vehicleName)}</td><td>${escapeHtml(v.vehicleType || v['@type'] || 'Vehicle')}</td><td>₹${v.rentPerDay}/day</td><td><span class="status-pill ${v.vehicleStatus.toLowerCase()}">${v.vehicleStatus}</span></td><td><button class="table-action" data-vehicle-status="${v.vehicleId}" data-next-status="${v.vehicleStatus === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE'}">${v.vehicleStatus === 'AVAILABLE' ? 'Maintenance' : 'Available'}</button></td></tr>`).join('')}</tbody></table></div></div>`;
  document.getElementById('addVehicleButton').onclick = () => renderVehicleForm();
  document.querySelectorAll('[data-vehicle-status]').forEach(button => button.onclick = async () => {
    await api(`/shop/vehicles/${button.dataset.vehicleStatus}/status`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.nextStatus }) });
    renderShopDashboard('vehicles');
  });
}

function renderVehicleForm() {
  document.getElementById('vehicleFormSlot').innerHTML = `<div class="dashboard-box form-card"><h3>Add a vehicle</h3><form id="vehicleForm" class="form-grid">
    ${profileInput('vehicleName', 'Vehicle Name', '')}${profileInput('brand', 'Brand', '')}${profileInput('model', 'Model', '')}
    <div class="form-group"><label>Vehicle Type</label><select name="vehicleType"><option>BIKE</option><option>SCOOTER</option><option>CAR</option></select></div>
    ${profileInput('rentPerDay', 'Rent per day', '')}<div class="form-group"><label>Vehicle Image</label><input name="image" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" /></div>
    <button class="btn btn-primary form-full" type="submit">Save vehicle</button></form></div>`;
  document.getElementById('vehicleForm').onsubmit = async event => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = {
      vehicleName: formData.get('vehicleName'),
      brand: formData.get('brand'),
      model: formData.get('model'),
      vehicleType: formData.get('vehicleType'),
      rentPerDay: Number(formData.get('rentPerDay'))
    };
    payload.rentPerDay = Number(payload.rentPerDay);
    const response = await api('/shop/vehicles', { method: 'POST', body: JSON.stringify(payload) });
    if (!response.ok) {
      showMessage('vehicleFormSlot', 'Unable to save vehicle.', true);
      return;
    }
    const saved = await response.json();
    const image = formData.get('image');
    if (image && image.size > 0) {
      const upload = new FormData();
      upload.append('image', image);
      await api(`/shop/vehicles/${saved.vehicleId}/image`, { method: 'POST', body: upload });
    }
    renderShopDashboard('vehicles');
  };
}

function renderShopBookings(rentals) {
  document.getElementById('shopContent').innerHTML = `<div class="eyebrow">Rental workflow</div><h2>Bookings</h2><div class="dashboard-box table-wrap"><table><thead><tr><th>Customer</th><th>Vehicle</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead><tbody>${rentals.map(r => {
    const next = r.status === 'PENDING_VERIFICATION' ? 'ACTIVE' : r.status === 'RETURN_REQUESTED' ? 'COMPLETED' : '';
    return `<tr><td>${escapeHtml(r.customer?.name || '')}</td><td>${escapeHtml(r.vehicle?.vehicleName || '')}</td><td>${r.startDate} → ${r.expectedReturnDate}</td><td><span class="status-pill">${r.status}</span></td><td>${next ? `<button class="table-action" data-rental-id="${r.rentalId}" data-rental-next="${next}">Mark ${next}</button>` : '—'}</td></tr>`;
  }).join('')}</tbody></table></div>`;
  document.querySelectorAll('[data-rental-id]').forEach(button => button.onclick = async () => {
    await api(`/shop/bookings/${button.dataset.rentalId}/status`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.rentalNext }) });
    renderShopDashboard('bookings');
  });
}

async function renderShopCustomers() {
  const response = await api('/shop/customers');
  const customers = response.ok ? await response.json() : [];
  document.getElementById('shopContent').innerHTML = `<div class="eyebrow">Your customers</div><h2>Customers</h2><div class="dashboard-box table-wrap"><table><thead><tr><th>Name</th><th>Mobile</th><th>Username</th><th>Licence</th></tr></thead><tbody>${customers.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.mobile)}</td><td>${escapeHtml(c.username)}</td><td>${escapeHtml(c.drivingLicenseNo || '—')}</td></tr>`).join('')}</tbody></table></div>`;
}

async function renderShopReports() {
  const response = await api('/shop/reports');
  const report = response.ok ? await response.json() : {};
  const cards = [['Total rentals', report.totalRentals], ['Active', report.activeRentals], ['Completed', report.completedRentals], ['Cancelled', report.cancelledRentals], ['Pending verification', report.pendingVerification], ['Return requests', report.returnRequests], ['Available vehicles', report.availableVehicles], ['Maintenance', report.maintenanceVehicles]];
  document.getElementById('shopContent').innerHTML = `<div class="eyebrow">Shop analytics</div><h2>Reports</h2><div class="stat-grid">${cards.map(c => `<div class="stat-card"><div class="label">${c[0]}</div><div class="value">${c[1] || 0}</div></div>`).join('')}</div>`;
}

function showBlockedShop(data) {
  document.getElementById('app').innerHTML = `<div class="page-shell"><div class="dashboard-box"><div class="eyebrow">Shop access</div><h1>${escapeHtml(data.message || 'Shop access unavailable')}</h1><p>${escapeHtml(data.reason || 'Please contact the Platform Admin.')}</p><a class="btn btn-primary" href="#/shop/login">Return to shop login</a></div></div>`;
}

function renderAuthPage(type) {
  const isLogin = type === 'login';
  document.getElementById('app').innerHTML = `<div class="auth-shell"><div class="auth-panel"><div class="eyebrow">Customer account</div><h2>${isLogin ? 'Welcome back' : 'Create account'}</h2><form id="authForm">${!isLogin ? '<div class="form-group"><label>Name</label><input name="name" required /></div><div class="form-group"><label>Mobile</label><input name="mobile" required /></div><div class="form-group"><label>Email</label><input name="email" type="email" required /></div><div class="form-group"><label>Address</label><input name="address" required /></div><div class="form-group"><label>Driving licence number</label><input name="drivingLicenseNo" required /></div>' : ''}<div class="form-group"><label>Username</label><input name="username" required /></div><div class="form-group"><label>Password</label><input name="password" type="password" required /></div>${!isLogin ? '<div class="form-group"><label>Confirm password</label><input name="confirmPassword" type="password" required /></div>' : ''}<button class="btn btn-primary" type="submit">${isLogin ? 'Sign in' : 'Register'}</button></form><div class="auth-switch">${isLogin ? 'New here? <a href="#/register">Create an account</a>' : 'Already registered? <a href="#/login">Sign in</a>'}</div></div></div>`;
  document.getElementById('authForm').onsubmit = async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const path = isLogin ? '/auth/customer/login' : '/auth/customer/register';
    if (!isLogin && payload.password !== payload.confirmPassword) return alert('Passwords do not match.');
    delete payload.confirmPassword;
    const body = payload;
    const response = await api(path, { method: 'POST', body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) return alert(data.message || 'Request failed');
    alert(isLogin ? 'Signed in successfully.' : 'Customer registered successfully.');
    if (isLogin) renderCustomerDashboard(); else window.location.hash = '/login';
  };
}

function renderCustomerDashboard() {
  document.getElementById('app').innerHTML = `<div class="page-shell"><h1>Customer dashboard</h1><div class="grid-3"><div class="stat-card"><div class="label">Available vehicles</div><div class="value">${state.vehicles.length}</div></div><div class="stat-card"><div class="label">Bookings</div><div class="value">0</div></div><div class="stat-card"><div class="label">Rental history</div><div class="value">0</div></div></div></div>`;
}

function renderStaticPage(title, eyebrow, text) {
  document.getElementById('app').innerHTML = `<div class="page-shell"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${text}</p></div>`;
}

async function fetchVehicles() {
  try {
    const response = await api('/public/vehicles');
    state.vehicles = response.ok ? await response.json() : [];
    const grid = document.getElementById('vehicleGrid');
    if (grid) grid.innerHTML = state.vehicles.slice(0, 5).map(renderVehicleCard).join('');
  } catch (error) {
    console.error('Failed to fetch vehicles', error);
  }
}

function bindRouteButtons() {
  document.querySelectorAll('[data-route]').forEach(button => button.onclick = () => {
    window.location.hash = button.dataset.route === 'home' ? '/' : button.dataset.route;
  });
}

function showMessage(id, message, error = false) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = message;
    element.className = `form-message ${error ? 'error' : 'success'}`;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function router() {
  const path = location.hash
    ? location.hash.replace(/^#\/?/, '') || 'home'
    : location.pathname.replace(/^\/+/, '') || 'home';
  if (path === 'shop/register') renderShopRegister();
  else if (path === 'shop/login') renderShopLogin();
  else if (path === 'shop/dashboard') renderShopDashboard('dashboard');
  else if (path === 'shop/profile') renderShopDashboard('profile');
  else if (path === 'shop/vehicles') renderShopDashboard('vehicles');
  else if (path === 'shop/bookings') renderShopDashboard('bookings');
  else if (path === 'shop/customers') renderShopDashboard('customers');
  else if (path === 'shop/reports') renderShopDashboard('reports');
  else if (path === 'login') renderAuthPage('login');
  else if (path === 'register') renderAuthPage('register');
  else if (path === 'vehicles') renderVehiclesPage('');
  else if (path === 'about') renderStaticPage('Trusted local rental expertise', 'About us', 'Thrissur Fleet connects travellers and residents with verified vehicles from trusted local rental shops.');
  else if (path === 'contact') renderStaticPage('Get in touch', 'Contact', 'Email: support@thrissurfleet.in · Phone: +91 98765 43210 · Swaraj Round, Thrissur');
  else if (path === 'help') renderStaticPage('How it works', 'Help & support', 'Search a vehicle, choose your dates, then visit the shop for physical document verification and handover.');
  else renderHome();
}

window.addEventListener('hashchange', router);
document.addEventListener('DOMContentLoaded', router);
