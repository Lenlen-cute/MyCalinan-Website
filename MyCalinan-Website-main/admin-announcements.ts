/* ══════════════════════════════════════════
   INTERFACES & CONSTANTS
══════════════════════════════════════════ */
interface Announcement {
  _id?: string;
  title: string;
  date: string;
  category: string;
  image: string;
  description: string;
}

const PUBLIC_API = 'http://localhost:5000/api/announcements';
const ADMIN_API  = 'http://localhost:5000/api/admin/announcements';

let announcementsCache: Announcement[] = [];
let pendingDeleteId: string | null = null;

/* ══════════════════════════════════════════
   AUTH & INFO
══════════════════════════════════════════ */
function getToken(): string {
  return localStorage.getItem('mycalinan_admin_token')
      || sessionStorage.getItem('mycalinan_admin_token')
      || '';
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

function checkAuth(): boolean {
  const token = getToken();
  if (!token) {
    const warning = document.getElementById('authWarning');
    if (warning) warning.style.display = 'block';
    return false;
  }
  return true;
}

function loadAdminInfo(): void {
  const username = localStorage.getItem('mycalinan_admin_username')
                || sessionStorage.getItem('mycalinan_admin_username')
                || 'Admin';
  const role     = localStorage.getItem('mycalinan_admin_role')
                || sessionStorage.getItem('mycalinan_admin_role')
                || 'admin';

  const nameEl = document.getElementById('adminName');
  const roleEl = document.getElementById('adminRole');
  const initEl = document.getElementById('adminInitial');

  if (nameEl) nameEl.textContent = username;
  if (roleEl) roleEl.textContent = role;
  if (initEl) initEl.textContent = username.charAt(0).toUpperCase();
}

/* ══════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
function showToast(msg: string, isError: boolean = false): void {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = isError ? '#c0392b' : '#1a5c38';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3000);
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tagClass(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('event'))    return 'event';
  if (c.includes('advisory')) return 'advisory';
  if (c.includes('program'))  return 'program';
  if (c.includes('festival')) return 'festival';
  return '';
}

function setSelectValue(selectEl: HTMLSelectElement | null, value: string): void {
  if (!selectEl) return;
  const target = (value || '').toLowerCase();
  for (const opt of Array.from(selectEl.options)) {
    if (opt.value.toLowerCase() === target) {
      selectEl.value = opt.value;
      return;
    }
  }
  selectEl.selectedIndex = 0;
}

/* ══════════════════════════════════════════
   RENDERING
══════════════════════════════════════════ */
function renderTable(items: Announcement[]): void {
  const tbody = document.getElementById('announcementsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const statTotal = document.getElementById('statTotal');
  const statEvents = document.getElementById('statEvents');
  const statPrograms = document.getElementById('statPrograms');
  const statAdvisories = document.getElementById('statAdvisories');

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

  if (statTotal) statTotal.textContent = items.length.toString();
  if (statEvents) statEvents.textContent = events.toString();
  if (statPrograms) statPrograms.textContent = programs.toString();
  if (statAdvisories) statAdvisories.textContent = advisories.toString();
}

async function loadAnnouncements(): Promise<void> {
  try {
    const res = await fetch(PUBLIC_API);
    if (!res.ok) throw new Error(res.status.toString());
    const data: Announcement[] = await res.json();
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

/* ══════════════════════════════════════════
   FORM HANDLING
══════════════════════════════════════════ */
function isFormOpen(): boolean {
  const form = document.getElementById('announcementForm');
  return form ? form.style.display === 'block' : false;
}

function showForm(): void {
  const titleEl = document.getElementById('formTitle');
  if (titleEl) titleEl.textContent = 'Create Announcement';
  
  (document.getElementById('editId') as HTMLInputElement).value = '';
  (document.getElementById('annTitle') as HTMLInputElement).value = '';
  (document.getElementById('annDate') as HTMLInputElement).value = '';
  setSelectValue(document.getElementById('annCategory') as HTMLSelectElement, 'General');
  (document.getElementById('annImage') as HTMLInputElement).value = '';
  (document.getElementById('annDescription') as HTMLTextAreaElement).value = '';
  
  const form = document.getElementById('announcementForm');
  if (form) {
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
  }
}

function hideForm(): void {
  const form = document.getElementById('announcementForm');
  if (form) form.style.display = 'none';
}

async function saveAnnouncement(): Promise<void> {
  if (!checkAuth()) {
    showToast('Please log in first.', true);
    return;
  }

  const id = (document.getElementById('editId') as HTMLInputElement).value.trim();
  const title = (document.getElementById('annTitle') as HTMLInputElement).value.trim();
  const date = (document.getElementById('annDate') as HTMLInputElement).value.trim();
  const category = (document.getElementById('annCategory') as HTMLSelectElement).value;
  const image = (document.getElementById('annImage') as HTMLInputElement).value.trim();
  const description = (document.getElementById('annDescription') as HTMLTextAreaElement).value.trim();

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

function editAnnouncement(id: string): void {
  const item = announcementsCache.find(a => a._id === id);
  if (!item) return;

  (document.getElementById('editId') as HTMLInputElement).value = id;
  (document.getElementById('annTitle') as HTMLInputElement).value = item.title || '';
  (document.getElementById('annDate') as HTMLInputElement).value = item.date || '';
  setSelectValue(document.getElementById('annCategory') as HTMLSelectElement, item.category);
  (document.getElementById('annImage') as HTMLInputElement).value = item.image || '';
  (document.getElementById('annDescription') as HTMLTextAreaElement).value = item.description || '';
  
  const titleEl = document.getElementById('formTitle');
  if (titleEl) titleEl.textContent = 'Edit Announcement';
  
  const form = document.getElementById('announcementForm');
  if (form) {
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ══════════════════════════════════════════
   MODALS (DELETE & LOGOUT)
══════════════════════════════════════════ */
function openDeleteModal(id: string): void {
  pendingDeleteId = id;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.classList.add('open');
}

function closeModal(): void {
  pendingDeleteId = null;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.classList.remove('open');
}

async function confirmDelete(): Promise<void> {
  if (!pendingDeleteId) return;
  closeModal();

  if (!checkAuth()) {
    showToast('Please log in first.', true);
    return;
  }

  try {
    const res = await fetch(`${ADMIN_API}/${pendingDeleteId}`, {
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

function confirmLogout(): void {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.classList.add('open');
}

function closeLogoutModal(): void {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.classList.remove('open');
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

/* ══════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════ */
const delModal = document.getElementById('deleteModal');
if (delModal) {
  delModal.addEventListener('click', function(e: MouseEvent) {
    if (e.target === this) closeModal();
  });
}

const outModal = document.getElementById('logoutModal');
if (outModal) {
  outModal.addEventListener('click', function(e: MouseEvent) {
    if (e.target === this) closeLogoutModal();
  });
}

/* ══════════════════════════════════════════
   EXPOSE GLOBALS FOR INLINE HTML EVENTS
══════════════════════════════════════════ */
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

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
loadAdminInfo();
checkAuth();
loadAnnouncements();
window.setInterval(() => { 
  if (!isFormOpen()) loadAnnouncements(); 
}, 30000);
