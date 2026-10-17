const shopOwnerSections = ['dashboard', 'profile', 'vehicles', 'bookings', 'customers', 'reports'];
let shopOwnerDashboard;
let shopOwnerBookingNotice = '';

function getShopOwnerErrorMessage(error, fallback = 'Something went wrong.') {
  if (!error) return fallback;
  if (error.data && error.data.reason) return error.data.reason;
  if (error.data && error.data.message) return error.data.message;
  if (error.message) return error.message;
  return fallback;
}

function coalesce(value, fallback) {
  return value !== null && value !== undefined ? value : fallback;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!await requireAuthenticatedRole('SHOP_OWNER')) return;
  shell('owner-dashboard');
  loading();
  try {
    shopOwnerDashboard = await apiGet('/shop/dashboard');
    renderShopOwnerShell();
    window.addEventListener('hashchange', navigateShopOwner);
    await navigateShopOwner();
  } catch (error) {
    handleAuthError(error);
    document.getElementById('content').innerHTML = notice(getShopOwnerErrorMessage(error), 'error');
  }
});

function renderShopOwnerShell() {
  document.getElementById('content').innerHTML = `
    <section class="dashboard-shell">
      <aside class="sidebar">
        <p class="sidebar-title">Shop owner</p>
        ${shopOwnerSections.map(section => `
          <a href="#${section}" data-owner-section="${section}">
            ${section === 'profile' ? 'My shop' : section[0].toUpperCase() + section.slice(1)}
          </a>`).join('')}
        <a href="#" id="ownerLogout">Logout</a>
      </aside>
      <div class="dashboard-main" id="shopOwnerContent"></div>
    </section>`;

  document.querySelectorAll('[data-owner-section]').forEach(link => {
    link.addEventListener('click', () => {
      setActiveOwnerSection(link.dataset.ownerSection);
    });
  });
  document.getElementById('ownerLogout').addEventListener('click', event => {
    event.preventDefault();
    clearSession();
    location.href = 'index.html';
  });
}

async function navigateShopOwner() {
  const requested = location.hash.replace('#', '') || 'dashboard';
  const section = shopOwnerSections.includes(requested) ? requested : 'dashboard';
  setActiveOwnerSection(section);
  const content = document.getElementById('shopOwnerContent');
  if (!content) return;
  content.innerHTML = loadingMarkup();
  try {
    if (section === 'dashboard') renderOwnerDashboard(content);
    if (section === 'profile') await renderOwnerProfile(content);
    if (section === 'vehicles') await renderOwnerVehicles(content);
    if (section === 'bookings') await renderOwnerBookings(content);
    if (section === 'customers') await renderOwnerCustomers(content);
    if (section === 'reports') await renderOwnerReports(content);
  } catch (error) {
    handleAuthError(error);
    content.innerHTML = notice(getShopOwnerErrorMessage(error), 'error');
  }
}

function setActiveOwnerSection(section) {
  document.querySelectorAll('[data-owner-section]').forEach(link => {
    link.classList.toggle('active', link.dataset.ownerSection === section);
  });
}

function loadingMarkup() {
  return '<div class="loading"><span></span><span></span><span></span></div>';
}

function renderOwnerDashboard(content) {
  const data = shopOwnerDashboard;
  const shop = data.shop || {};
  content.innerHTML = `
    <div class="section-heading">
      <div><p class="eyebrow">Owner workspace</p><h1>${esc(shop.shopName)}</h1></div>
      ${badge(shop.status)}
    </div>
    <div class="stat-grid">${[
      ['Total vehicles', data.totalVehicles],
      ['Available', data.availableVehicles],
      ['Maintenance', data.maintenanceVehicles],
      ['Bookings', data.totalBookings],
      ['Pending verification', data.pendingVerification],
      ['Active rentals', data.activeRentals],
      ['Return requests', data.returnRequests],
      ['Completed', data.completedRentals]
    ].map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value || 0}</strong></div>`).join('')}</div>
    <div class="notice-card"><strong>Physical verification only</strong>
      <p>Payment and handover are completed directly at the rental shop after document verification.</p>
    </div>
    <div class="section-actions">
      <a class="button button-primary" href="#vehicles">Manage vehicles</a>
      <a class="button button-ghost" href="#bookings">Review bookings</a>
    </div>
    ${data.totalVehicles === 0 ? notice('No vehicles added yet. Add your first vehicle from Vehicles.', 'info') : ''}
    ${data.totalBookings === 0 ? notice('No bookings yet. New shop bookings will appear in Bookings.', 'info') : ''}`;
}

async function renderOwnerProfile(content) {
  const shop = await apiGet('/shop/profile');
  content.innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Shop information</p><h1>My shop</h1></div>${badge(shop.status)}</div>
    <form id="ownerProfileForm" class="form-grid table-card">
      ${profileInput('shopName', 'Shop name', shop.shopName)}
      ${profileInput('ownerName', 'Owner name', shop.ownerName)}
      ${profileInput('mobile', 'Mobile', shop.mobile)}
      ${profileInput('email', 'Email', shop.email, 'email')}
      ${profileInput('area', 'Area / locality', shop.area)}
      ${profileInput('address', 'Full address', shop.address)}
      ${profileInput('businessLicenseNo', 'Business license number', shop.businessLicenseNo)}
      ${profileInput('ownerIdProofNo', 'Owner ID proof number', shop.ownerIdProofNo)}
      <div><label>Shop ID<input value="${esc(shop.shopId)}" disabled></label></div>
      <div><label>Registration date<input value="${esc(shop.registrationDate)}" disabled></label></div>
      <div class="full"><button class="button button-primary" type="submit">Save shop information</button></div>
      <div id="profileMessage" class="full"></div>
    </form>`;
  document.getElementById('ownerProfileForm').addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('profileMessage');
    try {
      const payload = Object.fromEntries(new FormData(event.target).entries());
      await apiPatch('/shop/profile', payload);
      message.innerHTML = notice('Shop information updated successfully.', 'success');
    } catch (error) {
      message.innerHTML = notice(error.message, 'error');
    }
  });
}

function profileInput(name, label, value, type = 'text') {
  return `<div><label>${label}<input name="${name}" type="${type}" value="${esc(value)}" required></label></div>`;
}

async function renderOwnerVehicles(content) {
  const vehicles = await apiGet('/shop/vehicles');
  content.innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Your fleet</p><h1>Vehicles</h1></div>
      <button class="button button-primary" id="addVehicleButton">Add vehicle</button>
    </div>
    <div id="vehicleFormSlot"></div>
    <div class="table-card">${vehicles.length ? vehicleTable(vehicles) : notice('No vehicles added yet.', 'info')}</div>`;
  document.getElementById('addVehicleButton').addEventListener('click', () => {
    document.getElementById('vehicleFormSlot').innerHTML = vehicleForm();
    bindVehicleForm();
  });
  bindVehicleActions();
}

function vehicleTable(vehicles) {
  return `<table><thead><tr><th>Image</th><th>Vehicle</th><th>Type</th><th>Rent/day</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${vehicles.map(vehicle => `<tr>
      <td>${vehicle.imagePath ? `<img class="owner-vehicle-image" src="${esc(vehicleImageUrl(vehicle.imagePath))}" alt="${esc(vehicle.vehicleName)}" onerror="this.replaceWith(Object.assign(document.createElement('span'), {className:'image-placeholder', textContent:'No image'}))">` : '<span class="image-placeholder">No image</span>'}</td>
      <td>${esc(vehicle.vehicleName)}<br><span class="muted">${esc(vehicle.brand)} ${esc(vehicle.model)}</span></td>
      <td>${esc(vehicle.vehicleType || 'VEHICLE')}</td>
      <td>₹${esc(vehicle.rentPerDay)}</td>
      <td>${badge(vehicle.vehicleStatus)}</td>
      <td><button class="button button-small button-ghost" data-edit-vehicle="${vehicle.vehicleId}">Edit</button>
        ${vehicle.vehicleStatus === 'INACTIVE'
          ? `<button class="button button-small button-primary" data-vehicle-status="${vehicle.vehicleId}" data-next-status="AVAILABLE">Activate</button>`
          : `<button class="button button-small button-danger" data-vehicle-status="${vehicle.vehicleId}" data-next-status="INACTIVE">Deactivate</button>`}
      </td>
    </tr>`).join('')}</tbody></table>`;
}

function vehicleForm(vehicle = {}) {
  return `<form id="vehicleForm" class="form-grid notice-card">
    ${profileInput('vehicleName', 'Vehicle name', vehicle.vehicleName || '')}
    ${profileInput('brand', 'Brand', vehicle.brand || '')}
    ${profileInput('model', 'Model', vehicle.model || '')}
    <div><label>Vehicle type<select name="vehicleType" required><option ${vehicle.vehicleType === 'BIKE' ? 'selected' : ''}>BIKE</option><option ${vehicle.vehicleType === 'SCOOTER' ? 'selected' : ''}>SCOOTER</option><option ${vehicle.vehicleType === 'CAR' ? 'selected' : ''}>CAR</option></select></label></div>
    ${profileInput('rentPerDay', 'Rent per day', vehicle.rentPerDay || '', 'number')}
    <div class="full image-picker"><label>Choose vehicle image
      <input name="image" type="file" accept="image/jpeg,image/png,image/webp" ${vehicle.vehicleId ? '' : ''}>
      <span class="image-picker-help">JPG, PNG or WEBP · maximum 5 MB</span>
      <img id="vehicleImagePreview" class="vehicle-image-preview${vehicle.imagePath ? '' : ' is-hidden'}" src="${vehicle.imagePath ? esc(vehicleImageUrl(vehicle.imagePath)) : ''}" alt="Selected vehicle preview">
    </label></div>
    <div class="full"><button class="button button-primary" type="submit">${vehicle.vehicleId ? 'Save vehicle' : 'Add vehicle'}</button> <button class="button button-ghost" type="button" id="cancelVehicleForm">Cancel</button></div>
    <div id="vehicleFormMessage" class="full"></div>
  </form>`;
}

function bindVehicleForm(vehicleId = null) {
  document.getElementById('cancelVehicleForm').onclick = () => { document.getElementById('vehicleFormSlot').innerHTML = ''; };
  document.getElementById('vehicleForm').onsubmit = async event => {
    event.preventDefault();
    const message = document.getElementById('vehicleFormMessage');
    try {
      const formData = new FormData();
      formData.append('vehicleName', event.target.elements.vehicleName.value.trim());
      formData.append('brand', event.target.elements.brand.value.trim());
      formData.append('model', event.target.elements.model.value.trim());
      formData.append('vehicleType', event.target.elements.vehicleType.value);
      formData.append('rentPerDay', event.target.elements.rentPerDay.value);
      const image = event.target.elements.image.files[0];
      if (image) formData.append('image', image);
      const saved = vehicleId
        ? await apiPut(`/shop/vehicles/${vehicleId}`, formData)
        : await apiPost('/shop/vehicles', formData);
      await navigateShopOwner();
    } catch (error) {
      message.innerHTML = notice(error.message, 'error');
    }
  };
  document.getElementById('vehicleForm').elements.image.addEventListener('change', event => {
    const file = event.target.files[0];
    const preview = document.getElementById('vehicleImagePreview');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      document.getElementById('vehicleFormMessage').innerHTML = notice('Choose a JPG, PNG or WEBP image no larger than 5 MB.', 'error');
      preview.classList.add('is-hidden');
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('is-hidden');
  });
}

function bindVehicleActions() {
  document.querySelectorAll('[data-edit-vehicle]').forEach(button => button.onclick = async () => {
    const vehicles = await apiGet('/shop/vehicles');
    const vehicle = vehicles.find(item => String(item.vehicleId) === button.dataset.editVehicle);
    document.getElementById('vehicleFormSlot').innerHTML = vehicleForm(vehicle);
    bindVehicleForm(vehicle.vehicleId);
  });
  document.querySelectorAll('[data-vehicle-status]').forEach(button => button.onclick = async () => {
    await apiPatch(`/shop/vehicles/${button.dataset.vehicleStatus}/status`, { status: button.dataset.nextStatus });
    await navigateShopOwner();
  });
}

async function renderOwnerBookings(content) {
  const bookings = await apiGet('/shop/bookings');
  const bookingNotice = shopOwnerBookingNotice;
  shopOwnerBookingNotice = '';
  content.innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Rental workflow</p><h1>Bookings</h1></div></div>
    ${bookingNotice ? notice(bookingNotice, 'success') : ''}
    <div class="table-card">${bookings.length ? `<table><thead><tr><th>Booking ID</th><th>Customer</th><th>Phone</th><th>Driving licence</th><th>Vehicle</th><th>Type</th><th>Start date</th><th>Expected return</th><th>Days</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>
      ${bookings.map(booking => {
        const next = booking.status === 'PENDING_VERIFICATION' ? 'ACTIVE'
          : (booking.status === 'ACTIVE' || booking.status === 'RETURN_REQUESTED') ? 'COMPLETED' : '';
        const rentalDays = coalesce(booking.rentalDays, 'Not provided');
        const finalAmount = coalesce(booking.finalAmount, coalesce(booking.estimatedAmount, 0));
        const canCancel = booking.status === 'PENDING_VERIFICATION';
        const nextLabel = next === 'COMPLETED' ? 'Mark as Returned' : `Mark ${next}`;
        return `<tr><td>${esc(booking.rentalId)}</td><td>${esc(booking.customerName || 'Not provided')}</td><td>${esc(booking.customerMobile || 'Not provided')}</td><td>${esc(booking.drivingLicenseNo || 'Not provided')}</td><td>${esc(booking.vehicleName || 'Not provided')}</td><td>${esc(booking.vehicleType || 'Not provided')}</td><td>${esc(booking.startDate || 'Not provided')}</td><td>${esc(booking.expectedReturnDate || 'Not provided')}</td><td>${esc(rentalDays)}</td><td>₹${esc(finalAmount)}</td><td>${badge(booking.status)}</td><td>${next ? `<button class="button button-small button-primary" data-booking-id="${booking.rentalId}" data-booking-next="${next}">${nextLabel}</button>` : ''}${canCancel ? `<button class="button button-small button-danger" data-cancel-booking="${booking.rentalId}">Cancel Order</button>` : (!next ? '—' : '')}</td></tr>`;
      }).join('')}</tbody></table>` : notice('No bookings yet.', 'info')}</div>`;
  document.querySelectorAll('[data-booking-id]').forEach(button => button.onclick = async () => {
        if (button.dataset.bookingNext === 'COMPLETED'
          && !window.confirm('Are you sure you want to mark this vehicle as returned?')) {
          return;
        }
        try {
          await apiPatch(`/shop/bookings/${button.dataset.bookingId}/status`, { status: button.dataset.bookingNext });
          shopOwnerBookingNotice = button.dataset.bookingNext === 'COMPLETED'
            ? 'Vehicle marked as returned successfully.'
            : '';
          await navigateShopOwner();
        } catch (error) {
          document.getElementById('shopOwnerContent').insertAdjacentHTML('afterbegin', notice(error.message, 'error'));
        }
      });
  document.querySelectorAll('[data-cancel-booking]').forEach(button => button.onclick = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await apiPut(`/shop/bookings/${button.dataset.cancelBooking}/cancel`, {});
      shopOwnerBookingNotice = 'Booking cancelled successfully. The vehicle is now available.';
      await navigateShopOwner();
    } catch (error) {
      const content = document.getElementById('shopOwnerContent');
      content.insertAdjacentHTML('afterbegin', notice(error.message, 'error'));
    }
  });
}

async function renderOwnerCustomers(content) {
  const customers = await apiGet('/shop/customers');
  content.innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Your customers</p><h1>Customers</h1></div></div>
    <div class="table-card">${customers.length ? `<table><thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Address</th><th>Licence</th><th>Username</th></tr></thead><tbody>
      ${customers.map(customer => `<tr><td>${esc(customer.name)}</td><td>${esc(customer.mobile)}</td><td>${esc(customer.email)}</td><td>${esc(customer.address)}</td><td>${esc(customer.drivingLicenseNo || '—')}</td><td>${esc(customer.username)}</td></tr>`).join('')}</tbody></table>` : notice('No customers yet.', 'info')}</div>`;
}

async function renderOwnerReports(content) {
  const report = await apiGet('/shop/reports');
  const rentals = Array.isArray(shopOwnerDashboard && shopOwnerDashboard.rentals) ? shopOwnerDashboard.rentals : [];
  const totalAmount = rentals.filter(rental => rental.status !== 'CANCELLED').reduce((sum, rental) => {
    const amount = rental.finalAmount !== null && rental.finalAmount !== undefined ? rental.finalAmount : rental.estimatedAmount;
    return sum + Number(amount || 0);
  }, 0);
  content.innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Shop analytics</p><h1>Reports</h1></div></div>
    <div class="stat-grid">${[
      ['Total vehicles', shopOwnerDashboard.totalVehicles],
      ['Available vehicles', report.availableVehicles],
      ['Active rentals', report.activeRentals],
      ['Completed rentals', report.completedRentals],
      ['Total bookings', report.totalRentals],
      ['Cancelled rentals', report.cancelledRentals],
      ['Pending verification', report.pendingVerification],
      ['Rental amount', '₹' + totalAmount.toFixed(2)]
    ].map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value || 0}</strong></div>`).join('')}</div>`;
}
