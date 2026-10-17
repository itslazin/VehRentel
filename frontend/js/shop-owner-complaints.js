document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuthenticatedRole('SHOP_OWNER');
  if (!session) return;
  shell('support');
  renderOwnerComplaints();
});

async function renderOwnerComplaints() {
  document.getElementById('content').innerHTML = `<section class="section"><div class="auth-card"><p class="eyebrow">Shop owner support</p><h1>Help & Support</h1><p class="muted">Send a complaint or query to the Platform Admin.</p><form id="ownerComplaintForm"><label>Subject<input name="subject" required></label><label>Description<textarea name="description" rows="6" required></textarea></label><button class="button button-primary">Submit</button></form><div id="ownerComplaintMessage"></div></div><div id="ownerComplaints" class="section-subheading"></div></section>`;
  const renderList = complaints => {
    document.getElementById('ownerComplaints').innerHTML = `<h2>My Complaints</h2>${complaints.length ? `<div class="table-card"><table><thead><tr><th>ID</th><th>Subject</th><th>Description</th><th>Date</th><th>Status</th><th>Admin response</th></tr></thead><tbody>${complaints.map(item => `<tr><td>#${esc(item.complaintId)}</td><td>${esc(item.subject)}</td><td>${esc(item.description)}</td><td>${esc(item.createdAt)}</td><td>${badge(item.status)}</td><td>${esc(item.adminResponse || 'Awaiting response')}</td></tr>`).join('')}</tbody></table></div>` : notice('No complaints submitted yet.', 'info')}`;
  };
  try {
    renderList(await apiGet('/shop/complaints'));
    document.getElementById('ownerComplaintForm').onsubmit = async event => {
      event.preventDefault();
      const form = event.target;
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        const complaint = await apiPost('/shop/complaints', {
          subject: form.subject.value,
          description: form.description.value
        });
        document.getElementById('ownerComplaintMessage').innerHTML = notice(`Complaint submitted successfully. Complaint ID: #${complaint.complaintId}`, 'success');
        form.reset();
        renderList(await apiGet('/shop/complaints'));
      } catch (error) {
        handleAuthError(error);
        document.getElementById('ownerComplaintMessage').innerHTML = notice(error.message, 'error');
      } finally {
        button.disabled = false;
      }
    };
  } catch (error) {
    handleAuthError(error);
    document.getElementById('ownerComplaints').innerHTML = notice(error.message, 'error');
  }
}
