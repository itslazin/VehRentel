document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuthenticatedRole('PLATFORM_ADMIN');
  if (!session) return;
  shell('admin-dashboard');
  await renderAdminView('dashboard');
});

async function renderAdminView(view) {
  const content = document.getElementById('content');
  content.innerHTML = adminShell(view, loading());
  try {
    const data = await apiGet(`/admin/${view === 'dashboard' ? 'dashboard' : view}`);
    const body = view === 'dashboard' ? dashboardView(data)
      : view === 'reports' ? reportsView(data) : view === 'complaints' ? complaintsView(data) : tableView(view, data);
    content.innerHTML = adminShell(view, body);
    bindAdminNavigation();
    bindShopActions();
  } catch (error) {
    handleAuthError(error);
    content.innerHTML = adminShell(view, notice(error.message, 'error'));
    bindAdminNavigation();
  }

  function complaintsView(complaints) {
    const table = (items, title, nameHeader, nameField, ownerHeader, ownerField, phoneField) => items.length ? `<div class="table-card"><h2>${title}</h2><table><thead><tr><th>ID</th><th>${nameHeader}</th><th>${ownerHeader}</th><th>Phone</th><th>Subject</th><th>Description</th><th>Date</th><th>Status</th><th>Admin response</th><th>Action</th></tr></thead><tbody>${items.map(item => `<tr><td>#${esc(item.complaintId)}</td><td>${esc(item[nameField])}</td><td>${esc(item[ownerField])}</td><td>${esc(item[phoneField])}</td><td>${esc(item.subject)}</td><td>${esc(item.description)}</td><td>${esc(item.createdAt)}</td><td><select data-complaint-status="${item.complaintId}">${['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(status => `<option value="${status}" ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}</select></td><td><textarea data-complaint-response="${item.complaintId}" rows="2">${esc(item.adminResponse || '')}</textarea></td><td><button class="button button-small button-primary" data-save-complaint="${item.complaintId}">Save</button></td></tr>`).join('')}</tbody></table></div>` : '';
    const customerComplaints = complaints.filter(item => item.complaintType === 'CUSTOMER');
    const shopOwnerComplaints = complaints.filter(item => item.complaintType === 'SHOP_OWNER');
    const emptyTable = title => `<div class="table-card"><h2>${title}</h2>${notice(`No ${title.toLowerCase()} found.`, 'info')}</div>`;
    return `${customerComplaints.length
      ? table(customerComplaints, 'Customer complaints', 'Customer', 'customerName', 'Username', 'customerUsername', 'customerMobile')
      : emptyTable('Customer complaints')}${shopOwnerComplaints.length
      ? table(shopOwnerComplaints, 'Shop owner complaints', 'Shop', 'shopName', 'Owner', 'shopOwnerName', 'shopMobile')
      : emptyTable('Shop owner complaints')}`;
  }
}

function adminShell(active, body) {
  const views = ['dashboard', 'shops', 'vehicles', 'customers', 'bookings', 'complaints', 'reports'];
  return `<section class="dashboard-shell"><aside class="sidebar admin-sidebar"><p class="sidebar-title">Platform admin</p>${views.map(view => `<a href="#${view}" data-admin-view="${view}" class="${view === active ? 'active' : ''}">${view[0].toUpperCase() + view.slice(1)}</a>`).join('')}<a href="#" id="adminLogout">Logout</a></aside><div class="dashboard-main">${body}</div></section>`;
}

function bindAdminNavigation() {
  document.querySelectorAll('[data-admin-view]').forEach(link => link.onclick = event => {
    event.preventDefault();
    renderAdminView(link.dataset.adminView);
  });
  document.getElementById('adminLogout')?.addEventListener('click', event => {
    event.preventDefault();
    clearSession();
    location.href = 'login.html?role=admin';
  });
}

function dashboardView(data) {
  const stats = data.statistics || {};
  return `<div class="section-heading"><div><p class="eyebrow">Platform control</p><h1>Admin dashboard</h1></div></div><div class="stat-grid">${[['Total shops',stats.totalShops],['Pending shops',stats.pendingShops],['Approved shops',stats.approvedShops],['Total vehicles',stats.totalVehicles],['Customers',stats.totalCustomers],['Bookings',stats.totalBookings],['Active rentals',stats.activeRentals]].map(([label,value]) => `<div class="stat-card"><span>${label}</span><strong>${value ?? 0}</strong></div>`).join('')}</div>${shopTable(data.pendingShops || [], true)}`;
}

function reportsView(data) {
  const stats = data.statistics || {};
  const statuses = data.rentalStatuses || {};
  return `<div class="section-heading"><div><p class="eyebrow">Real database aggregates</p><h1>Reports</h1></div></div><div class="stat-grid">${[['Total rentals',stats.totalBookings],['Pending verification',statuses.pendingVerification],['Active rentals',statuses.active],['Return requests',statuses.returnRequested],['Completed rentals',statuses.completed],['Cancelled rentals',statuses.cancelled]].map(([label,value]) => `<div class="stat-card"><span>${label}</span><strong>${value ?? 0}</strong></div>`).join('')}</div>`;
}

function shopTable(shops, pendingOnly) {
  return `<div class="table-card"><h2>${pendingOnly ? 'Pending shop approvals' : 'Shops'}</h2>${shops.length ? `<table><thead><tr><th>Shop</th><th>Owner</th><th>Phone Number</th><th>Area</th><th>Status</th><th>Action</th></tr></thead><tbody>${shops.map(shop => `<tr><td>${esc(shop.shopName)}</td><td>${esc(shop.ownerName)}</td><td>${esc(shop.mobile || 'Not provided')}</td><td>${esc(shop.area)}</td><td>${badge(shop.status)}</td><td>${shop.status === 'PENDING' ? `<button class="button button-small button-primary" data-approve="${shop.shopId}">Approve</button> <button class="button button-small button-danger" data-reject="${shop.shopId}">Reject</button>` : shop.status === 'SUSPENDED' ? `<button class="button button-small button-primary" data-reactivate="${shop.shopId}">Reactivate</button>` : shop.status === 'APPROVED' || shop.status === 'ACTIVE' ? `<button class="button button-small button-danger" data-suspend="${shop.shopId}">Suspend</button>` : ''} <button class="button button-small button-danger" data-delete-shop="${shop.shopId}">Delete</button></td></tr>`).join('')}</tbody></table>` : notice('No shops found.', 'info')}</div>`;
}

function tableView(view, data) {
  if (view === 'shops') return shopTable(data, false);
  if (!Array.isArray(data) || !data.length) return `<div class="table-card">${notice(`No ${view} found.`, 'info')}</div>`;
  const rows = data.map(item => {
    if (view === 'vehicles') return `<tr><td>${esc(item.vehicleName)}</td><td>${esc(item.brand)} ${esc(item.model)}</td><td>${esc(item.shopName)}</td><td>${badge(item.vehicleStatus)}</td></tr>`;
    if (view === 'customers') return `<tr><td>${esc(item.name)}</td><td>${esc(item.username)}</td><td>${esc(item.mobile)}</td><td>${esc(item.email)}</td></tr>`;
    return `<tr><td>#${item.rentalId}</td><td>${esc(item.customer?.name)}</td><td>${esc(item.shop?.shopName)}</td><td>${esc(item.vehicle?.vehicleName)}</td><td>${badge(item.status)}</td></tr>`;
  }).join('');
  const headers = view === 'vehicles' ? '<th>Vehicle</th><th>Model</th><th>Shop</th><th>Status</th>' : view === 'customers' ? '<th>Name</th><th>Username</th><th>Mobile</th><th>Email</th>' : '<th>Rental</th><th>Customer</th><th>Shop</th><th>Vehicle</th><th>Status</th>';
  return `<div class="table-card"><h2>${view[0].toUpperCase() + view.slice(1)}</h2><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function bindShopActions() {
  document.querySelectorAll('[data-approve]').forEach(button => button.onclick = async () => { await apiPost(`/admin/shops/${button.dataset.approve}/approve`, {}); renderAdminView('shops'); });
  document.querySelectorAll('[data-reject]').forEach(button => button.onclick = async () => { const reason = prompt('Reason for rejection:'); if (reason) { await apiPost(`/admin/shops/${button.dataset.reject}/reject`, { reason }); renderAdminView('shops'); } });
  document.querySelectorAll('[data-suspend]').forEach(button => button.onclick = async () => { const reason = prompt('Reason for suspension:'); if (reason) { await apiPost(`/admin/shops/${button.dataset.suspend}/suspend`, { reason }); renderAdminView('shops'); } });
  document.querySelectorAll('[data-reactivate]').forEach(button => button.onclick = async () => { await apiPost(`/admin/shops/${button.dataset.reactivate}/reactivate`, {}); renderAdminView('shops'); });
  document.querySelectorAll('[data-delete-shop]').forEach(button => button.onclick = async () => {
    if (!confirm('Delete this shop and all of its vehicles and bookings? This cannot be undone.')) return;
    try {
      await apiDelete(`/admin/shops/${button.dataset.deleteShop}`);
      renderAdminView('shops');
    } catch (error) {
      alert(error.message);
    }
  });
  document.querySelectorAll('[data-save-complaint]').forEach(button => button.onclick = async () => {
    if (button.disabled) return;
    button.disabled = true;
    const id = button.dataset.saveComplaint;
    const status = document.querySelector(`[data-complaint-status="${id}"]`).value;
    const adminResponse = document.querySelector(`[data-complaint-response="${id}"]`).value;
    try {
      await apiPatch(`/admin/complaints/${id}`, { status, adminResponse });
      await renderAdminView('complaints');
    } catch (error) {
      button.disabled = false;
      document.getElementById('content').insertAdjacentHTML('afterbegin', notice(error.message, 'error'));
    }
  });
}
