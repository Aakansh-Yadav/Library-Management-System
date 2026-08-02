const user = requireAuth('user');
if (!user) throw new Error('Unauthorized');

document.getElementById('userInfo').textContent = `${user.name} (Member)`;

document.querySelectorAll('.sidebar-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-nav a').forEach((l) => l.classList.remove('active'));
    document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(link.dataset.section).classList.add('active');
  });
});

async function loadCategories() {
  const categories = await API.request('/api/books/categories');
  const select = document.getElementById('bookCategory');
  select.innerHTML = '<option value="">All Categories</option>';
  categories.forEach((cat) => {
    select.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

async function loadCatalog() {
  const search = document.getElementById('bookSearch').value;
  const category = document.getElementById('bookCategory').value;
  let url = '/api/books?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (category) url += `category=${encodeURIComponent(category)}`;

  const books = await API.request(url);
  const container = document.getElementById('catalogTable');

  if (!books.length) {
    container.innerHTML = '<div class="empty-state">No books found</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead><tr>
        <th>Title</th><th>Author</th><th>ISBN</th><th>Category</th>
        <th>Available</th><th>Action</th>
      </tr></thead>
      <tbody>${books.map((b) => `
        <tr>
          <td><strong>${b.title}</strong></td>
          <td>${b.author}</td>
          <td>${b.isbn}</td>
          <td><span class="badge badge-info">${b.category}</span></td>
          <td>${b.available_copies > 0
            ? `<span class="badge badge-success">${b.available_copies} available</span>`
            : `<span class="badge badge-danger">Unavailable</span>`}</td>
          <td>${b.available_copies > 0
            ? `<button class="btn btn-accent btn-sm" onclick="requestBook(${b.id}, '${b.title.replace(/'/g, "\\'")}')">Borrow</button>`
            : '—'}</td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

async function requestBook(id, title) {
  showModal('Borrow Book', `<p>Request to borrow <strong>${title}</strong>? Due date will be 14 days from today.</p>`, async () => {
    await API.request('/api/issues/request', {
      method: 'POST',
      body: JSON.stringify({ book_id: id })
    });
    showToast('Book borrowed successfully!');
    loadCatalog();
    loadMyBooks();
  });
}

async function loadMyBooks() {
  const issues = await API.request('/api/issues');
  const container = document.getElementById('myBooksTable');

  if (!issues.length) {
    container.innerHTML = '<div class="empty-state">You have no borrowed books</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead><tr>
        <th>Book</th><th>Issue Date</th><th>Due Date</th><th>Return Date</th><th>Status</th>
      </tr></thead>
      <tbody>${issues.map((i) => {
        const isOverdue = i.status === 'issued' && i.due_date < new Date().toISOString().split('T')[0];
        const statusBadge = i.status === 'returned'
          ? '<span class="badge badge-success">Returned</span>'
          : isOverdue
            ? '<span class="badge badge-danger">Overdue</span>'
            : '<span class="badge badge-warning">Active</span>';
        return `
          <tr>
            <td><strong>${i.book_title}</strong><br><small>${i.book_author}</small></td>
            <td>${formatDate(i.issue_date)}</td>
            <td>${formatDate(i.due_date)}</td>
            <td>${formatDate(i.return_date)}</td>
            <td>${statusBadge}</td>
          </tr>`;
      }).join('')}</tbody>
    </table>
  `;
}

loadCategories();
loadCatalog();
loadMyBooks();
