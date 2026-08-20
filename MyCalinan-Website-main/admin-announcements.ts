interface AnnouncementItem {
  _id?: string;
  title?: string;
  date?: string;
  category?: string;
  image?: string;
  description?: string;
}

const PUBLIC_API: string = 'http://localhost:5000/api/announcements';
const ADMIN_API: string = 'http://localhost:5000/api/admin/announcements';

let announcementsCache: AnnouncementItem[] = [];
let pendingDeleteId: string | null = null;

/* ── Get stored JWT token ── */
function getToken(): string {
  return localStorage.getItem('mycalinan_admin_token')
      || sessionStorage.getItem('mycalinan_admin_token')
      || '';
}

/* ── Auth headers ── */
function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

/* ── Show auth warning if not logged in ── */
function checkAuth(): boolean {
  const token = getToken();
  const warningEl = document.getElementById('authWarning');
  if (!token) {
    if (warningEl) warningEl.style.display = 'block';
    return false;
  }
  return true;
}

/* ── Populate sidebar admin info ── */
function loadAdminInfo(): void {
  const username = localStorage.getItem('mycalinan_admin_username')
                || sessionStorage.getItem('mycalinan_admin_username')
                || 'Admin';
  const role = localStorage.getItem('mycalinan_admin_role')
            || sessionStorage.getItem('mycalinan_admin_role')
            || 'admin';

  const nameEl = document.getElementById('adminName');
  const roleEl = document.getElementById('adminRole');
  const initialEl = document.getElementById('adminInitial');

  if (nameEl) nameEl.textContent = username;
  if (roleEl) roleEl.textContent = role;
  if (initialEl) initialEl.textContent = username.charAt(0).toUpperCase();
}

/* ── Toast ── */
function showToast(msg: string, isError: boolean = false): void {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = isError ? '#c0392b' : '#1a5c38';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3000);
}

/* ── Escape HTML (XSS Guard) ── */
function escapeHtml(str?: string | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Category tag class ── */
function tagClass(category?: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('event'))    return 'event';
  if (c.includes('advisory')) return 'advisory';
  if (c.includes('program'))  return 'program';
  if (c.includes('festival')) return 'festival';
  return '';
}

/* ── Select value helper ── */
function setSelectValue(selectEl: HTMLSelectElement, value?: string): void {
  const target = (value || '').toLowerCase();
  for (let i = 0; i < selectEl.options.length; i++) {
    const opt = selectEl.options[i];
    if (opt.value.toLowerCase() === target) {
      selectEl.value = opt.value;
      return;
    }
  }
  selectEl.selectedIndex = 0;
}

/* ── Render table + stats ── */
function renderTable(items: AnnouncementItem[]): void {
  const tbody = document.getElementById('announcementsTableBody');
  const statTotal = document.getElementById('statTotal');
  const statEvents = document.getElementById('statEvents');
  const statPrograms = document.getElementById('statPrograms');
  const statAdvisories = document.getElementById('statAdvisories');

  if (!tbody) return;
  tbody.innerHTML = '';

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr class="table-state"><td colspan="5">No announcements yet. Click <b>Add Announcement</b> to create one.</td></tr>`;
    if (statTotal) statTotal.textContent = '0';
    if (statEvents) statEvents.textContent = '0';
    if (statPrograms) statPrograms.textContent = '0';
    if (statAdvisories) statAdvisories.textContent = '0';
    return;
  }

  let events = 0, programs = 0, advisories = 0;

  items.forEach(item => {
    const cat = (item.category || '').toLowerCase();
    if (cat.includes('event'))    events++;
    if (cat.includes('program'))  programs++;
    if (cat.includes('advisory')) advisories++;

    const id = item._id || '';
    const tc = tagClass(item.category);

    const thumb = item.image
      ? `<img class="title-thumb" src="${escapeHtml(item.image)}" alt="" onerror="this.style.display='none'">`
      : '';

    tbody.innerHTML += `
      <tr>
        <td><div class="title-cell">${thumb}<b>${escapeHtml(item.title) || '—'}</b></div></td>
        <td><span class="tag ${tc}">${escapeHtml(item.category) || 'General'}</span></td>
        <td>${escapeHtml(item.date) || '—'}</td>
        <td class="desc-cell">${escapeHtml(item.description) || '—'}</td>
        <td>
          <button class="edit" onclick="editAnnouncement('${id}')"><i class="fas fa-pen"></i> Edit</button>
          <button class="delete" onclick="openDeleteModal('${id}')"><i class="fas fa-trash"></i> Delete</button>
        </td>
      </tr>`;
  });

  if (statTotal) statTotal.textContent = String(items.length);
  if (statEvents) statEvents.textContent = String(events);
  if (statPrograms) statPrograms.textContent = String(programs);
  if (statAdvisories) statAdvisories.textContent = String(advisories);
}

/* ── Load announcements from DB ── */
async function loadAnnouncements(): Promise<void> {
  try {
    const res = await fetch(PUBLIC_API);
    if (!res.ok) throw new Error(String(res.status));
    const data: AnnouncementItem[] = await res.json();
    announcementsCache = data;
    renderTable(data);
  } catch (err) {
    console.error('Load announcements error:', err);
    const tbody = document.getElementById('announcementsTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr class="table-state"><td colspan="5">⚠️ Cannot connect to server. Make sure Flask is running on port 5000.</td></tr>`;
    }
    showToast('Server unreachable', true);
  }
}

/* ── Form show/hide ── */
function isFormOpen(): boolean {
  const form = document.getElementById('announcementForm');
  return form ? form.style.display === 'block' : false;
}

function showForm(): void {
  const formTitle = document.getElementById('formTitle');
  const editId = document.getElementById('editId') as HTMLInputElement;
  const annTitle = document.getElementById('annTitle') as HTMLInputElement;
  const annDate = document.getElementById('annDate') as HTMLInputElement;
  const annCategory = document.getElementById('annCategory') as HTMLSelectElement;
  const annImage = document.getElementById('annImage') as HTMLInputElement;
  const annDescription = document.getElementById('annDescription') as HTMLTextAreaElement;
  const formSection = document.getElementById('announcementForm');

  if (formTitle) formTitle.textContent = 'Create Announcement';
  if (editId) editId.value = '';
  if (annTitle) annTitle.value = '';
  if (annDate) annDate.value = '';
  if (annCategory) setSelectValue(annCategory, 'General');
  if (annImage) annImage.value = '';
  if (annDescription) annDescription.value = '';

  if (formSection) {
    formSection.style.display = 'block';
    formSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function hideForm(): void {
  const formSection = document.getElementById('announcementForm');
  if (formSection) formSection.style.display = 'none';
}

/* ── Save ── */
async function saveAnnouncement(): Promise<void> {
  if (!checkAuth()) {
    showToast('Please log in first.', true);
    return;
  }

  const id = (document.getElementById('editId') as HTMLInputElement)?.value.trim();
  const title = (document.getElementById('annTitle') as HTMLInputElement)?.value.trim();
  const date = (document.getElementById('annDate') as HTMLInputElement)?.value.trim();
  const category = (document.getElementById('annCategory') as HTMLSelectElement)?.value;
  const image = (document.getElementById('annImage') as HTMLInputElement)?.value.trim();
  const description = (document.getElementById('annDescription') as HTMLTextAreaElement)?.value.trim();

  if (!title || !description) {
    showToast('Title and Description are required.', true);
    return;
  }

  const isEdit = id !== '';
  const url = isEdit ? `${ADMIN_API}/${id}` : ADMIN_API;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify({ title, date, category, image, description })
    });

    if (res.status === 401) {
      showToast('Session expired. Please log in again.', true);
      setTimeout(() => window.location.href = 'Admin-login.html', 1500);
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to save announcement.', true);
      return;
    }

    showToast(isEdit ? '✅ Announcement updated!' : '✅ Announcement created!');
    hideForm();
    loadAnnouncements();

  } catch (err) {
    console.error('Save error:', err);
    showToast('Cannot reach server. Check Flask is running.', true);
  }
}

/* ── Edit ── */
function editAnnouncement(id: string): void {
  const item = announcementsCache.find(a => a._id === id);
  if (!item) return;

  const editId = document.getElementById('editId') as HTMLInputElement;
  const annTitle = document.getElementById('annTitle') as HTMLInputElement;
  const annDate = document.getElementById('annDate') as HTMLInputElement;
  const annCategory = document.getElementById('annCategory') as HTMLSelectElement;
  const annImage = document.getElementById('annImage') as HTMLInputElement;
  const annDescription = document.getElementById('annDescription') as HTMLTextAreaElement;
  const formTitle = document.getElementById('formTitle');
  const formSection = document.getElementById('announcementForm');

  if (editId) editId.value = id;
  if (annTitle) annTitle.value = item.title || '';
  if (annDate) annDate.value = item.date || '';
  if (annCategory) setSelectValue(annCategory, item.category);
  if (annImage) annImage.value = item.image || '';
  if (annDescription) annDescription.value = item.description || '';
  if (formTitle) formTitle.textContent = 'Edit Announcement';

  if (formSection) {
    formSection.style.display = 'block';
    formSection.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ── Delete ── */
function openDeleteModal(id: string): void {
  pendingDeleteId = id;
  document.getElementById('deleteModal')?.classList.add('open');
}

function closeModal(): void {
  pendingDeleteId = null;
  document.getElementById('deleteModal')?.classList.remove('open');
}

async function confirmDelete(): Promise<void> {
  if (!pendingDeleteId) return;
  const idToDelete = pendingDeleteId;
  closeModal();

  if (!checkAuth()) {
    showToast('Please log in first.', true);
    return;
  }

  try {
    const res = await fetch(`${ADMIN_API}/${idToDelete}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    if (res.status === 401) {
      showToast('Session expired. Please log in again.', true);
      setTimeout(() => window.location.href = 'Admin-login.html', 1500);
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to delete announcement.', true);
      return;
    }

    showToast('🗑️ Announcement deleted.');
    loadAnnouncements();

  } catch (err) {
    console.error('Delete error:', err);
    showToast('Cannot reach server. Check Flask is running.', true);
  }
}

/* ── Logout ── */
function confirmLogout(): void {
  document.getElementById('logoutModal')?.classList.add('open');
}

function closeLogoutModal(): void {
  document.getElementById('logoutModal')?.classList.remove('open');
}

function doLogout(): void {
  localStorage.removeItem('mycalinan_admin_token');
  localStorage.removeItem('mycalinan_admin_username');
  localStorage.removeItem('mycalinan_admin_role');
  sessionStorage.removeItem('mycalinan_admin_token');
  sessionStorage.removeItem('mycalinan_admin_username');
  sessionStorage.removeItem('mycalinan_admin_role');
  window.location.href = 'Admin-login.html';
}

/* ── Global window assignments para magamit sa inline onclicks ── */
(window as any).showForm = showForm;
(window as any).hideForm = hideForm;
(window as any).saveAnnouncement = saveAnnouncement;
(window as any).editAnnouncement = editAnnouncement;
(window as any).openDeleteModal = openDeleteModal;
(window as any).closeModal = closeModal;
(window as any).confirmDelete = confirmDelete;
(window as any).confirmLogout = confirmLogout;
(window as any).closeLogoutModal = closeLogoutModal;
(window as any).doLogout = doLogout;

/* ── Init Events ── */
document.addEventListener('DOMContentLoaded', () => {
  loadAdminInfo();
  checkAuth();
  loadAnnouncements();

  document.getElementById('deleteModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  document.getElementById('logoutModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeLogoutModal();
  });

  setInterval(() => { if (!isFormOpen()) loadAnnouncements(); }, 30000);
});