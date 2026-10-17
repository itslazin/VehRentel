document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'vehicles') renderVehicles();
  if (page === 'vehicle-details') renderVehicleDetails();
  if (page === 'shops') renderShops();
  if (page === 'shop-details') renderShopDetails();
  if (page === 'customer-dashboard' || page === 'bookings' || page === 'rentals' || page === 'profile' || page === 'support' || page === 'complaints') renderCustomerPage(page);
});

async function renderVehicles() {
  shell('vehicles'); loading();
  try {
    const shopId = query('shopId');
    if (shopId !== null && (!/^\d+$/.test(shopId) || Number(shopId) <= 0)) {
      document.getElementById('content').innerHTML = notice('Invalid shop ID.', 'error');
      return;
    }
    const items = await apiGet(shopId ? `/public/shops/${encodeURIComponent(shopId)}/vehicles` : '/public/vehicles');
    document.getElementById('content').innerHTML = `<section class="section"><div class="section-heading"><div><p class="eyebrow">Our fleet</p><h1>Find your next vehicle</h1></div></div><div class="toolbar"><input id="vehicleSearch" placeholder="Search vehicle, brand or area" value="${esc(query('q') || '')}"><select id="vehicleType"><option value="">All types</option><option>BIKE</option><option>SCOOTER</option><option>CAR</option></select></div><div id="vehicleList" class="vehicle-grid"></div></section>`;
    const draw = () => {
      const q = document.getElementById('vehicleSearch').value.toLowerCase(), type = document.getElementById('vehicleType').value;
      const filtered = items.filter(v => (!type || v.vehicleType === type || v['@type'] === type) && `${v.vehicleName} ${v.brand} ${v.model} ${v.shop?.area}`.toLowerCase().includes(q));
      document.getElementById('vehicleList').innerHTML = filtered.length
        ? filtered.map(vehicleCard).join('')
        : `<div class="empty-state">${shopId ? 'No vehicles available for this shop.' : 'No vehicles match your search.'}</div>`;
    };
    document.getElementById('vehicleSearch').oninput = draw; document.getElementById('vehicleType').onchange = draw; draw();
  } catch (error) { document.getElementById('content').innerHTML = notice(error.message, 'error'); }
}

async function renderVehicleDetails() {
  shell('vehicles'); loading();
  try {
    const vehicle = await apiGet(`/public/vehicle/${encodeURIComponent(query('id'))}`);
    document.getElementById('content').innerHTML = `<section class="section detail-layout"><img class="detail-image" src="${esc(vehicleImageUrl(vehicle.imagePath, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80'))}" alt="${esc(vehicle.vehicleName)}"><div class="detail-copy"><p class="eyebrow">Vehicle details</p><h1>${esc(vehicle.vehicleName)}</h1><p>${esc(vehicle.brand)} · ${esc(vehicle.model)} · ${esc(vehicle.vehicleType || 'Vehicle')}</p><div class="price">₹${esc(vehicle.rentPerDay)} <small>/ day</small></div><p class="muted">Pickup: ${esc(vehicle.shop?.shopName || '')}, ${esc(vehicle.shop?.area || 'Thrissur')}</p>${badge(vehicle.vehicleStatus)}<h3>Book this vehicle</h3><form id="bookingForm" class="form-grid"><label>Pickup date<input name="startDate" type="date" required></label><label>Return date<input name="endDate" type="date" required></label><p id="bookingTotal" class="form-full muted">Select dates to calculate the estimate.</p><button class="button button-primary form-full">Confirm booking</button></form><div id="bookingMessage"></div></div></section>`;
    const form = document.getElementById('bookingForm'), total = document.getElementById('bookingTotal');
    form.startDate.min = new Date().toISOString().slice(0,10);
    const minimumReturnDate = () => {
      if (!form.startDate.value) return '';
      const date = new Date(`${form.startDate.value}T00:00:00`);
      date.setDate(date.getDate() + 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const updateReturnDateMinimum = () => {
      const minimum = minimumReturnDate();
      form.endDate.min = minimum;
      if (minimum && form.endDate.value && form.endDate.value < minimum) {
        form.endDate.value = '';
      }
    };
    const calculate = () => {
      updateReturnDateMinimum();
      const start = form.startDate.value;
      const end = form.endDate.value;
      if (!start || !end) {
        total.textContent = 'Select dates to calculate the estimate.';
        return;
      }
      if (end <= start) {
        total.textContent = 'Return date must be at least one day after the pickup date.';
        return;
      }
      const days = Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000);
      total.textContent = `${days} day${days > 1 ? 's' : ''} · Estimated amount ₹${days * vehicle.rentPerDay}`;
    };
    form.startDate.addEventListener('change', calculate);
    form.endDate.addEventListener('change', calculate);
    form.onsubmit = async event => {
      event.preventDefault();
      updateReturnDateMinimum();
      if (!form.startDate.value || !form.endDate.value || form.endDate.value <= form.startDate.value) {
        total.textContent = 'Return date must be at least one day after the pickup date.';
        return;
      }
      try { const session = await requireAuthenticatedRole('CUSTOMER'); if (!session) return; const data = Object.fromEntries(new FormData(form).entries()); data.vehicleId = vehicle.vehicleId; await apiPost('/customer/book', data); document.getElementById('bookingMessage').innerHTML = notice('Booking submitted for physical shop verification.', 'success'); } catch (error) { handleAuthError(error); document.getElementById('bookingMessage').innerHTML = notice(error.message, 'error'); }
    };
  } catch (error) { document.getElementById('content').innerHTML = notice(error.message, 'error'); }
}

async function renderShops() {
  shell('shops'); loading();
  try { const shops = await apiGet('/public/shops'); document.getElementById('content').innerHTML = `<section class="section"><div class="section-heading"><div><p class="eyebrow">Local partners</p><h1>Rental shops in Thrissur</h1></div></div><div class="shop-grid">${shops.filter(s => s.status === 'APPROVED' || s.status === 'ACTIVE').map(s => `<article class="shop-card"><div class="shop-icon">⌂</div><p class="eyebrow">${esc(s.area)}</p><h2>${esc(s.shopName)}</h2><p class="muted">${esc(s.address)}</p><a class="button button-ghost" href="shop-details.html?id=${s.shopId}">View shop</a></article>`).join('')}</div></section>`; } catch (error) { document.getElementById('content').innerHTML = notice(error.message, 'error'); }
}

async function renderShopDetails() {
  shell('shops'); loading();
  try { const shops = await apiGet('/public/shops'), shopId = query('id'), shop = shops.find(item => String(item.shopId) === shopId); document.getElementById('content').innerHTML = shop ? `<section class="section"><div class="detail-copy"><p class="eyebrow">${esc(shop.area)}</p><h1>${esc(shop.shopName)}</h1><p>${esc(shop.address)}</p><div class="info-grid"><div><strong>Owner</strong><span>${esc(shop.ownerName)}</span></div><div><strong>Mobile</strong><span>${esc(shop.mobile)}</span></div><div><strong>Status</strong><span>${badge(shop.status)}</span></div></div><a class="button button-primary" href="vehicles.html?shopId=${encodeURIComponent(shop.shopId)}">Browse this shop's vehicles</a></div></section>` : notice('Shop not found.', 'error'); } catch (error) { document.getElementById('content').innerHTML = notice(error.message, 'error'); }
}

async function renderCustomerPage(page) {
  const session = await requireAuthenticatedRole('CUSTOMER'); if (!session) return; shell();
  if (page === 'support') { renderSupport(); return; }
  if (page === 'complaints') { renderComplaintsPage(); return; }
  loading();
  try {
    const rentals = await apiGet('/customer/rentals');
    if (page === 'profile') { document.getElementById('content').innerHTML = `<section class="section"><div class="auth-card"><p class="eyebrow">Account</p><h1>Your profile</h1><p>Username: ${esc(session.username)}</p><p class="muted">Profile editing can be connected when the backend profile update endpoint is added.</p></div></section>`; return; }
    const filtered = page === 'bookings' ? rentals.filter(r => ['PENDING_VERIFICATION','ACTIVE','RETURN_REQUESTED'].includes(r.status)) : page === 'rentals' ? rentals.filter(r => ['COMPLETED','CANCELLED'].includes(r.status)) : rentals;
    document.getElementById('content').innerHTML = `<section class="section"><div class="section-heading"><div><p class="eyebrow">Customer workspace</p><h1>${page === 'customer-dashboard' ? 'Your dashboard' : page === 'bookings' ? 'My bookings' : 'Rental history'}</h1></div><a class="button button-primary" href="vehicles.html">Find a vehicle</a></div><div class="stat-grid"><div class="stat-card"><span>Upcoming bookings</span><strong>${rentals.filter(r=>r.status==='PENDING_VERIFICATION').length}</strong></div><div class="stat-card"><span>Active rentals</span><strong>${rentals.filter(r=>r.status==='ACTIVE').length}</strong></div><div class="stat-card"><span>Completed rentals</span><strong>${rentals.filter(r=>r.status==='COMPLETED').length}</strong></div></div><div class="table-card"><table><thead><tr><th>Vehicle</th><th>Shop</th><th>Dates</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${filtered.map(r => `<tr><td>${esc(r.vehicle?.vehicleName)}</td><td>${esc(r.shop?.shopName)}</td><td>${r.startDate} → ${r.expectedReturnDate}</td><td>₹${r.finalAmount || r.estimatedAmount}</td><td>${badge(r.status === 'COMPLETED' ? (r.returnMarkedBy === 'SHOP_OWNER_DIRECT' ? 'RETURNED BY SHOP OWNER' : 'RETURNED') : r.status)}</td><td>${r.status==='ACTIVE'?`<button class="button button-small button-ghost" data-return="${r.rentalId}">Request return</button>`:r.status==='RETURN_REQUESTED'?'Waiting for shop owner':''}</td></tr>`).join('')}</tbody></table></div></section>`;
    document.querySelectorAll('[data-return]').forEach(button => button.onclick = async () => { try { await apiPatch(`/customer/rentals/${button.dataset.return}/return`, {}); document.getElementById('content').insertAdjacentHTML('afterbegin', notice('Return request submitted successfully.', 'success')); setTimeout(() => location.reload(), 500); } catch (error) { document.getElementById('content').insertAdjacentHTML('afterbegin', notice(error.message, 'error')); } });
  } catch (error) { handleAuthError(error); document.getElementById('content').innerHTML = notice(error.message, 'error'); }
}

function renderSupport() {
  document.getElementById('content').innerHTML = `<section class="section"><div class="section-heading"><div><p class="eyebrow">Customer care</p><h1>Help & support</h1><p class="muted">Need help with a booking, vehicle, or rental shop? Our support team can help.</p></div></div><div class="info-grid"><div class="card"><strong>Support email</strong><span>support@thrissur-rental.local</span></div><div class="card"><strong>Service area</strong><span>Thrissur, Kerala</span></div><div class="card"><strong>Complaints</strong><span>Use My Complaints to submit an issue and track its response.</span></div></div></section>`;
}

function renderComplaintsPage() {
  document.getElementById('content').innerHTML = `<section class="section"><div class="auth-card"><p class="eyebrow">Customer care</p><h1>My Complaints</h1><p class="muted">Submit an issue and track its status and admin response.</p><form id="supportForm"><label>Issue type<select name="type"><option>Booking</option><option>Vehicle</option><option>Shop</option><option>Other</option></select></label><label>Subject<input name="subject" required></label><label>Description<textarea name="description" rows="6" required></textarea></label><button class="button button-primary">Submit complaint</button></form><div id="supportMessage"></div></div><div id="myComplaints" class="section-subheading"></div></section>`;
  const renderComplaints = complaints => {
    document.getElementById('myComplaints').innerHTML = `<h2>My Complaints</h2>${complaints.length ? `<div class="table-card"><table><thead><tr><th>ID</th><th>Subject</th><th>Description</th><th>Date</th><th>Status</th><th>Admin response</th></tr></thead><tbody>${complaints.map(item => `<tr><td>#${esc(item.complaintId)}</td><td>${esc(item.subject)}</td><td>${esc(item.description)}</td><td>${esc(item.createdAt)}</td><td>${badge(item.status)}</td><td>${esc(item.adminResponse || 'Awaiting response')}</td></tr>`).join('')}</tbody></table></div>` : notice('No complaints submitted yet.', 'info')}`;
  };
  apiGet('/customer/complaints').then(renderComplaints).catch(error => { document.getElementById('myComplaints').innerHTML = notice(error.message, 'error'); });
  document.getElementById('supportForm').onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    try {
      const complaint = await apiPost('/customer/complaints', {
        subject: form.subject.value,
        description: form.description.value
      });
      document.getElementById('supportMessage').innerHTML = notice(`Complaint submitted successfully. Complaint ID: #${complaint.complaintId}`, 'success');
      form.reset();
      const complaints = await apiGet('/customer/complaints');
      renderComplaints(complaints);
    } catch (error) {
      handleAuthError(error);
      document.getElementById('supportMessage').innerHTML = notice(error.message, 'error');
    }
  };
}
