const user = requireAuth('librarian');
if (!user) throw new Error('Unauthorized');

document.getElementById('userInfo').textContent = `${user.name} (Librarian)`;

document.querySelectorAll('.sidebar-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-nav a').forEach((l) => l.classList.remove('active'));
    document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(link.dataset.section).classList.add('active');
  });
});

async function loadStats() {
  const stats = await API.request('/api/records/stats');
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="label">Total Books</div><div class="value">${stats.total_books}</div></div>
    <div class="stat-card"><div class="label">Registered Users</div><div class="value">${stats.total_users}</div></div>
    <div class="stat-card"><div class="label">Books Issued</div><div class="value">${stats.books_issued}</div></div>
    <div class="stat-card"><div class="label">Available Copies</div><div class="value">${stats.books_available}</div></div>
    <div class="stat-card"><div class="label">Overdue</div><div class="value">${stats.overdue}</div></div>
  `;
}

async function loadCategories() {
  const categories = await API.request('/api/books/categories');
  const select = document.getElementById('bookCategory');
  select.innerHTML = '<option value="">All Categories</option>';
  categories.forEach((cat) => {
    select.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

async function loadBooks() {
  const search = document.getElementById('bookSearch').value;
  const category = document.getElementById('bookCategory').value;
  let url = '/api/books?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (category) url += `category=${encodeURIComponent(category)}`;

  const books = await API.request(url);
  const container = document.getElementById('booksTable');

  if (!books.length) {
    container.innerHTML = '<div class="empty-state">No books found</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead><tr>
        <th>Title</th><th>Author</th><th>ISBN</th><th>Category</th>
        <th>Total</th><th>Available</th><th>Actions</th>
      </tr></thead>
      <tbody>${books.map((b) => `
        <tr>
          <td><strong>${b.title}</strong></td>
          <td>${b.author}</td>
          <td>${b.isbn}</td>
          <td><span class="badge badge-info">${b.category}</span></td>
          <td>${b.total_copies}</td>
          <td>${b.available_copies > 0
            ? `<span class="badge badge-success">${b.available_copies}</span>`
            : `<span class="badge badge-danger">0</span>`}</td>
          <td class="actions">
            <button class="btn btn-secondary btn-sm" onclick='openBookForm(${JSON.stringify(b).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBook(${b.id}, '${b.title.replace(/'/g, "\\'")}')">Delete</button>
          </td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

function openBookForm(book = null) {
  const isEdit = !!book;
  showModal(
    isEdit ? 'Edit Book' : 'Add New Book',
    `
      <div class="form-group"><label>Title</label><input id="fTitle" value="${book?.title || ''}"></div>
      <div class="form-group"><label>Author</label><input id="fAuthor" value="${book?.author || ''}"></div>
      <div class="form-group"><label>ISBN</label><input id="fIsbn" value="${book?.isbn || ''}"></div>
      <div class="form-group"><label>Category</label><input id="fCategory" value="${book?.category || ''}"></div>
      <div class="form-group"><label>Total Copies</label><input type="number" id="fCopies" min="1" value="${book?.total_copies || 1}"></div>
    `,
    async () => {
      const body = {
        title: document.getElementById('fTitle').value,
        author: document.getElementById('fAuthor').value,
        isbn: document.getElementById('fIsbn').value,
        category: document.getElementById('fCategory').value,
        total_copies: document.getElementById('fCopies').value
      };
      if (isEdit) {
        await API.request(`/api/books/${book.id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast('Book updated');
      } else {
        await API.request('/api/books', { method: 'POST', body: JSON.stringify(body) });
        showToast('Book added');
      }
      loadBooks();
      loadStats();
    }
  );
}

async function deleteBook(id, title) {
  showModal('Delete Book', `<p>Are you sure you want to delete <strong>${title}</strong>?</p>`, async () => {
    await API.request(`/api/books/${id}`, { method: 'DELETE' });
    showToast('Book deleted');
    loadBooks();
    loadStats();
  });
}

async function loadIssues() {
  const status = document.getElementById('issueStatus').value;
  let url = '/api/issues';
  if (status) url += `?status=${status}`;

  const issues = await API.request(url);
  const container = document.getElementById('issuesTable');

  if (!issues.length) {
    container.innerHTML = '<div class="empty-state">No issue records found</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead><tr>
        <th>Book</th><th>User</th><th>Issue Date</th><th>Due Date</th>
        <th>Return Date</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody>${issues.map((i) => {
        const isOverdue = i.status === 'issued' && i.due_date < new Date().toISOString().split('T')[0];
        const statusBadge = i.status === 'returned'
          ? '<span class="badge badge-success">Returned</span>'
          : isOverdue
            ? '<span class="badge badge-danger">Overdue</span>'
            : '<span class="badge badge-warning">Issued</span>';
        return `
          <tr>
            <td><strong>${i.book_title}</strong><br><small>${i.book_author}</small></td>
            <td>${i.user_name}<br><small>${i.user_email}</small></td>
            <td>${formatDate(i.issue_date)}</td>
            <td>${formatDate(i.due_date)}</td>
            <td>${formatDate(i.return_date)}</td>
            <td>${statusBadge}</td>
            <td>${i.status === 'issued'
              ? `<button class="btn btn-accent btn-sm" onclick="returnBook(${i.id})">Return</button>`
              : '—'}</td>
          </tr>`;
      }).join('')}</tbody>
    </table>
  `;
}

async function openIssueForm() {
  const [books, users] = await Promise.all([
    API.request('/api/books'),
    API.request('/api/users')
  ]);

  const members = users.filter((u) => u.role === 'user');
  const available = books.filter((b) => b.available_copies > 0);

  showModal('Issue Book', `
    <div class="form-group">
      <label>Book</label>
      <select id="fBook">${available.map((b) =>
        `<option value="${b.id}">${b.title} (${b.available_copies} available)</option>`
      ).join('')}</select>
    </div>
    <div class="form-group">
      <label>User</label>
      <select id="fUser">${members.map((u) =>
        `<option value="${u.id}">${u.name} (${u.email})</option>`
      ).join('')}</select>
    </div>
    <div class="form-group">
      <label>Due in (days)</label>
      <input type="number" id="fDays" min="1" value="14">
    </div>
  `, async () => {
    await API.request('/api/issues/issue', {
      method: 'POST',
      body: JSON.stringify({
        book_id: parseInt(document.getElementById('fBook').value),
        user_id: parseInt(document.getElementById('fUser').value),
        days: parseInt(document.getElementById('fDays').value)
      })
    });
    showToast('Book issued successfully');
    loadIssues();
    loadBooks();
    loadStats();
  });
}

async function returnBook(id) {
  await API.request(`/api/issues/${id}/return`, { method: 'POST' });
  showToast('Book returned');
  loadIssues();
  loadBooks();
  loadStats();
}

async function loadUsers() {
  const users = await API.request('/api/users');
  const container = document.getElementById('usersTable');

  container.innerHTML = `
    <table>
      <thead><tr>
        <th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th>
      </tr></thead>
      <tbody>${users.map((u) => `
        <tr>
          <td><strong>${u.name}</strong></td>
          <td>${u.email}</td>
          <td><span class="badge ${u.role === 'librarian' ? 'badge-info' : 'badge-success'}">${u.role}</span></td>
          <td>${formatDate(u.created_at?.split(' ')[0])}</td>
          <td class="actions">
            <button class="btn btn-secondary btn-sm" onclick='openUserForm(${JSON.stringify(u).replace(/'/g, "&#39;")})'>Edit</button>
            ${u.id !== user.id ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id}, '${u.name.replace(/'/g, "\\'")}')">Delete</button>` : ''}
          </td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

function openUserForm(existing = null) {
  const isEdit = !!existing;
  showModal(
    isEdit ? 'Edit User' : 'Add New User',
    `
      <div class="form-group"><label>Name</label><input id="fName" value="${existing?.name || ''}"></div>
      <div class="form-group"><label>Email</label><input type="email" id="fEmail" value="${existing?.email || ''}"></div>
      <div class="form-group"><label>Password${isEdit ? ' (leave blank to keep)' : ''}</label><input type="password" id="fPassword"></div>
      <div class="form-group"><label>Role</label>
        <select id="fRole">
          <option value="user" ${existing?.role === 'user' ? 'selected' : ''}>User</option>
          <option value="librarian" ${existing?.role === 'librarian' ? 'selected' : ''}>Librarian</option>
        </select>
      </div>
    `,
    async () => {
      const body = {
        name: document.getElementById('fName').value,
        email: document.getElementById('fEmail').value,
        role: document.getElementById('fRole').value
      };
      const pwd = document.getElementById('fPassword').value;
      if (pwd) body.password = pwd;

      if (isEdit) {
        await API.request(`/api/users/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast('User updated');
      } else {
        if (!pwd) throw new Error('Password is required for new users');
        await API.request('/api/users', { method: 'POST', body: JSON.stringify(body) });
        showToast('User created');
      }
      loadUsers();
      loadStats();
    }
  );
}

async function deleteUser(id, name) {
  showModal('Delete User', `<p>Are you sure you want to delete <strong>${name}</strong>?</p>`, async () => {
    await API.request(`/api/users/${id}`, { method: 'DELETE' });
    showToast('User deleted');
    loadUsers();
    loadStats();
  });
}

async function loadRecords() {
  const action = document.getElementById('recordAction').value;
  let url = '/api/records';
  if (action) url += `?action=${action}`;

  const records = await API.request(url);
  const container = document.getElementById('recordsTable');

  if (!records.length) {
    container.innerHTML = '<div class="empty-state">No records found</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead><tr>
        <th>Timestamp</th><th>Action</th><th>Entity</th><th>Performed By</th><th>Details</th>
      </tr></thead>
      <tbody>${records.map((r) => `
        <tr>
          <td>${r.created_at}</td>
          <td><span class="badge badge-info">${r.action}</span></td>
          <td>${r.entity_type}${r.entity_id ? ` #${r.entity_id}` : ''}</td>
          <td>${r.performed_by_name}</td>
          <td>${r.details || '—'}</td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

loadStats();
loadCategories();
loadBooks();
loadIssues();
loadUsers();
loadRecords();
