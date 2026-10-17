const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
const query = name => new URLSearchParams(location.search).get(name);

function shell(active = '') {
  const session = getSession();
  const role = session && session.role;
  const navigation = role === 'SHOP_OWNER'
    ? `<a class="${active === 'owner-dashboard' ? 'active' : ''}" href="shop-owner-dashboard.html">Owner Dashboard</a><a class="${active === 'support' ? 'active' : ''}" href="owner-complaints.html">Help & Support</a>`
    : role === 'PLATFORM_ADMIN'
      ? `<a class="${active === 'admin-dashboard' ? 'active' : ''}" href="admin-dashboard.html">Admin Dashboard</a>`
      : role === 'CUSTOMER'
        ? `<a class="${active === 'home' ? 'active' : ''}" href="index.html">Home</a><a class="${active === 'vehicles' ? 'active' : ''}" href="vehicles.html">Vehicles</a><a class="${active === 'shops' ? 'active' : ''}" href="shops.html">Shops</a><a class="${active === 'support' ? 'active' : ''}" href="support.html">Help & Support</a><a class="${active === 'bookings' ? 'active' : ''}" href="customer-bookings.html">My Bookings</a><a class="${active === 'complaints' ? 'active' : ''}" href="complaints.html">My Complaints</a>`
        : `<a class="${active === 'home' ? 'active' : ''}" href="index.html">Home</a><a class="${active === 'vehicles' ? 'active' : ''}" href="vehicles.html">Vehicles</a><a class="${active === 'shops' ? 'active' : ''}" href="shops.html">Shops</a><a href="support.html">Help & Support</a>`;
  document.getElementById('site').innerHTML = `
    <header class="topbar"><nav class="navbar">
      <a class="brand" href="index.html">Thrissur <span>Vehicle Rental</span></a>
      <button class="nav-toggle" aria-label="Toggle menu">☰</button>
      <div class="nav-links">
        ${navigation}
        ${session ? '<button class="link-button" id="logoutButton">Logout</button>' : '<a class="button button-ghost" href="login.html">Login</a><a class="button button-primary" href="register.html">Register</a>'}
      </div>
    </nav></header><main id="content"></main>
    <footer class="footer"><div><strong>Thrissur Vehicle Rental</strong><p>Verified cars, scooters and bikes from trusted local shops.</p></div><div><p>Thrissur, Kerala</p><p>support@thrissur-rental.local</p></div></footer>`;
  document.querySelector('.nav-toggle')?.addEventListener('click', () => document.querySelector('.nav-links').classList.toggle('open'));
  document.getElementById('logoutButton')?.addEventListener('click', () => { clearSession(); location.href = 'index.html'; });
}

function loading(target = 'content') { document.getElementById(target).innerHTML = '<div class="loading"><span></span><span></span><span></span></div>'; }
function notice(message, type = 'info') { return `<div class="alert alert-${type}">${esc(message)}</div>`; }
function badge(status) { return `<span class="badge badge-${String(status || '').toLowerCase()}">${esc(status || 'UNKNOWN')}</span>`; }
function vehicleImageUrl(imagePath, fallback = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80') {
  if (!imagePath) return fallback;
  if (/^(https?:|data:|blob:)/i.test(imagePath)) return imagePath;
  const backendOrigin = new URL(API_BASE, window.location.origin).origin;
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${backendOrigin}${normalizedPath}`;
}
function vehicleCard(vehicle) {
  const image = vehicleImageUrl(vehicle.imagePath);
  return `<article class="vehicle-card"><img src="${esc(image)}" alt="${esc(vehicle.vehicleName)}" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80'"><div class="card-body"><div class="row-between"><h3>${esc(vehicle.vehicleName)}</h3>${badge(vehicle.vehicleStatus)}</div><p>${esc(vehicle.brand)} · ${esc(vehicle.model)}</p><p class="muted">${esc(vehicle.shop?.shopName || 'Thrissur shop')} · ${esc(vehicle.shop?.area || 'Thrissur')}</p><div class="row-between"><strong>₹${esc(vehicle.rentPerDay)}/day</strong><a class="button button-primary button-small" href="vehicle-details.html?id=${vehicle.vehicleId}">View details</a></div></div></article>`;
}

function renderHome() {
  shell('home');
  document.getElementById('content').innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow light">Trusted mobility for every journey</p><h1>Rent your ride across <span>Thrissur.</span></h1><p>Find bikes, scooters and cars from registered local rental shops with transparent pricing and easy physical handover.</p><div class="hero-actions"><a class="button button-primary" href="vehicles.html">Browse vehicles</a><a class="button button-light" href="shops.html">Browse shops</a></div></div><div class="hero-search card"><h2>Find your perfect ride</h2><form id="heroSearch"><input name="q" placeholder="Search by vehicle, brand or area"><button class="button button-primary">Search</button></form><div class="trust-row"><span>✓ Verified vehicles</span><span>✓ Easy returns</span></div></div></section><section class="section"><div class="section-heading"><div><p class="eyebrow">Popular fleet</p><h2>Ready when you are</h2></div><a class="button button-ghost" href="vehicles.html">View all</a></div><div id="popularVehicles" class="vehicle-grid"></div></section><section class="section soft"><div class="section-heading"><div><p class="eyebrow">Simple by design</p><h2>How it works</h2></div></div><div class="steps"><div class="step"><b>01</b><h3>Choose a vehicle</h3><p>Compare real vehicles and pickup locations in Thrissur.</p></div><div class="step"><b>02</b><h3>Book your dates</h3><p>See the estimated total before confirming.</p></div><div class="step"><b>03</b><h3>Verify at the shop</h3><p>Complete payment and handover physically at the selected shop.</p></div></div></section>`;
  apiGet('/public/vehicles').then(items => document.getElementById('popularVehicles').innerHTML = items.slice(0,5).map(vehicleCard).join('')).catch(error => document.getElementById('popularVehicles').innerHTML = notice(error.message, 'error'));
  document.getElementById('heroSearch').addEventListener('submit', event => { event.preventDefault(); location.href = `vehicles.html?q=${encodeURIComponent(new FormData(event.target).get('q'))}`; });
}

document.addEventListener('DOMContentLoaded', () => { if (document.body.dataset.page === 'home') renderHome(); });
