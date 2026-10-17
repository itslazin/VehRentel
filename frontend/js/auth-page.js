document.addEventListener('DOMContentLoaded', () => {
  shell();
  const page = document.body.dataset.page;
  const role = query('role') || 'customer';
  document.getElementById('content').innerHTML = page === 'register' ? registerForm(role) : loginForm(role);
  document.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.target).entries());
    const message = document.getElementById('formMessage');
    try {
      if (page === 'register') {
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.');
        delete form.confirmPassword;
        const endpoint = role === 'shop' ? '/auth/shop/register' : '/auth/customer/register';
        if (role === 'shop') Object.assign(form, { registrationDate: undefined, status: 'PENDING' });
        await apiPost(endpoint, form);
        message.innerHTML = notice(role === 'shop' ? 'Shop registration submitted successfully. Your account will be available after Platform Admin approval.' : 'Registration completed. You can now sign in.', 'success');
        event.target.reset();
      } else {
        clearSession();
        let result;
        const endpoint = role === 'admin' ? '/auth/admin/login'
          : role === 'shop' ? '/auth/shop/login' : '/auth/customer/login';
        result = await apiPost(endpoint, { username: form.username, password: form.password });
        if (role === 'admin') {
          saveSession(result);
          location.href = 'admin-dashboard.html';
        } else if (role === 'shop') {
          saveSession(result);
          location.href = 'shop-owner-dashboard.html';
        } else {
          saveSession(result);
          location.href = 'customer-dashboard.html';
        }
      }
    } catch (error) {
      message.innerHTML = notice(error.data?.message || error.data?.reason || error.message, 'error');
    }
  });
});

function loginForm(role) {
  return `<section class="auth-layout"><div class="auth-card"><p class="eyebrow">${role === 'admin' ? 'Platform access' : role === 'shop' ? 'Shop owner account' : 'Customer account'}</p><h1>Welcome back</h1><p class="muted">Sign in securely to continue.</p><form><label>Username or email<input name="username" required></label><label>Password<input name="password" type="password" required></label><button class="button button-primary full">Sign in</button></form><div id="formMessage"></div>${role === 'customer' ? '<div class="owner-register-callout"><span>Are you a rental shop owner?</span><a class="button button-ghost full" href="login.html?role=shop">Login as Shop Owner</a></div>' : ''}<p class="form-footer">${role === 'shop' ? 'New shop partner? <a href="register.html?role=shop">Register your shop</a>' : role === 'customer' ? 'New here? <a href="register.html">Create an account</a>' : ''}</p></div></section>`;
}

function registerForm(role) {
  if (role === 'shop') return `<section class="auth-layout"><div class="auth-card wide"><p class="eyebrow">Partner with us</p><h1>Register your rental shop</h1><p class="muted">Registrations begin as PENDING and require Platform Admin approval.</p><form class="form-grid">${[['shopName','Shop name'],['ownerName','Owner name'],['mobile','Mobile number'],['email','Email'],['area','Area / locality'],['address','Full shop address'],['username','Username'],['password','Password'],['confirmPassword','Confirm password'],['businessLicenseNo','Business registration / license number'],['ownerIdProofNo','Owner ID proof number']].map(([n,l])=>`<label>${l}<input name="${n}" type="${n.includes('password')?'password':n==='email'?'email':'text'}" required></label>`).join('')}<button class="button button-primary full">Submit registration</button></form><div id="formMessage"></div><p class="form-footer">Already registered? <a href="login.html?role=shop">Shop owner login</a></p></div></section>`;
  return `<section class="auth-layout"><div class="auth-card"><p class="eyebrow">Customer account</p><h1>Create your account</h1><form>${[['name','Full name'],['mobile','Mobile number'],['email','Email'],['address','Address'],['drivingLicenseNo','Driving licence number'],['username','Username'],['password','Password'],['confirmPassword','Confirm password']].map(([n,l])=>`<label>${l}<input name="${n}" type="${n.includes('password')?'password':n==='email'?'email':'text'}" required></label>`).join('')}<button class="button button-primary full">Register</button></form><div id="formMessage"></div><div class="owner-register-callout"><span>Are you a rental shop owner?</span><a class="button button-ghost full" href="register.html?role=shop">Register as Shop Owner</a></div><p class="form-footer">Already registered? <a href="login.html">Sign in</a></p></div></section>`;
}
