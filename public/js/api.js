/* Shared API utilities */
const API = {
  getToken() {
    return localStorage.getItem('token');
  },

  getUser() {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  },

  setSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  },

  logout() {
    this.clearSession();
    window.location.href = '/';
  }
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showModal(title, bodyHtml, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary modal-confirm">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.modal-close').onclick = close;
  overlay.querySelector('.modal-cancel').onclick = close;
  overlay.querySelector('.modal-confirm').onclick = async () => {
    try {
      await onConfirm();
      close();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function requireAuth(role) {
  const user = API.getUser();
  if (!user || !API.getToken()) {
    window.location.href = '/';
    return null;
  }
  if (role && user.role !== role) {
    window.location.href = user.role === 'librarian' ? '/librarian.html' : '/user.html';
    return null;
  }
  return user;
}
