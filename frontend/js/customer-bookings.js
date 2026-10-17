document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuthenticatedRole('CUSTOMER');
  if (!session) return;
  shell('bookings');
  loading();

  try {
    const bookings = await apiGet('/customer/bookings');
    renderBookings(bookings);
  } catch (error) {
    handleAuthError(error);
    document.getElementById('content').innerHTML = notice(
      'Unable to load your bookings. Please try again.',
      'error'
    );
  }
});

function renderBookings(bookings) {
  const currentStatuses = ['PENDING_VERIFICATION', 'ACTIVE', 'RETURN_REQUESTED'];
  const current = bookings.filter(booking => currentStatuses.includes(booking.status));
  const previous = bookings.filter(booking => ['COMPLETED', 'CANCELLED'].includes(booking.status));
  document.getElementById('content').innerHTML = `
    <section class="section">
      <div class="section-heading">
        <div><p class="eyebrow">Customer workspace</p><h1>My bookings</h1></div>
        <a class="button button-primary" href="vehicles.html">Find a vehicle</a>
      </div>
      <h2>Current / Upcoming Bookings</h2>
      ${bookingTable(current)}
      <h2 class="section-subheading">Previous Bookings</h2>
      ${bookingTable(previous)}
    </section>`;
}

function bookingTable(bookings) {
  if (!bookings.length) return notice('No bookings found.', 'info');
  return `<div class="table-card"><table><thead><tr>
    <th>Booking ID</th><th>Vehicle</th><th>Type</th><th>Shop</th><th>Area</th>
    <th>Start date</th><th>Expected return</th><th>Return date</th><th>Days</th><th>Rent/day</th>
    <th>Amount</th><th>Status</th><th>Action</th>
  </tr></thead><tbody>${bookings.map(booking => {
    const vehicle = booking.vehicle || {};
    const shop = booking.shop || {};
    const amount = booking.finalAmount !== null && booking.finalAmount !== undefined
      ? booking.finalAmount : booking.estimatedAmount;
    const statusLabel = booking.status === 'COMPLETED'
      ? (booking.returnMarkedBy === 'SHOP_OWNER_DIRECT' ? 'RETURNED BY SHOP OWNER' : 'RETURNED')
      : booking.status;
    const action = booking.status === 'ACTIVE'
      ? `<button class="button button-small button-ghost" data-return="${booking.rentalId}">Request Return</button>`
      : booking.status === 'RETURN_REQUESTED'
        ? '<span class="muted">Waiting for shop owner</span>'
        : '—';
    return `<tr>
      <td>#${esc(booking.rentalId)}</td><td>${esc(vehicle.vehicleName || 'Not provided')}</td>
      <td>${esc(vehicle.vehicleType || vehicle['@type'] || 'Vehicle')}</td>
      <td>${esc(shop.shopName || 'Not provided')}</td><td>${esc(shop.area || 'Not provided')}</td>
      <td>${esc(booking.startDate || 'Not provided')}</td><td>${esc(booking.expectedReturnDate || 'Not provided')}</td>
      <td>${esc(booking.actualReturnDate || 'Not provided')}</td>
      <td>${esc(booking.rentalDays || 'Not provided')}</td><td>₹${esc(booking.rentPerDay || 0)}</td>
      <td>₹${esc(amount || 0)}</td><td>${badge(statusLabel)}</td><td>${action}</td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-return]');
  if (!button) return;
  try {
    await apiPatch(`/customer/rentals/${button.dataset.return}/return`, {});
    const message = notice('Return request submitted successfully.', 'success');
    document.getElementById('content').insertAdjacentHTML('afterbegin', message);
    setTimeout(() => location.reload(), 500);
  } catch (error) {
    document.getElementById('content').insertAdjacentHTML('afterbegin', notice(error.message, 'error'));
  }
});
