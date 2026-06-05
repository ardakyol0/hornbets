async function apiGet(url) {
  const res = await fetch(url, { credentials: 'include' });
  if (res.status === 401) { window.location.href = '/'; return null; }
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res.status === 401) { window.location.href = '/'; return null; }
  return res.json();
}

async function logout() {
  await apiPost('/api/auth/logout');
  window.location.href = '/';
}

function tierBadge(tier) {
  const map = { 1: ['gold', 'Favori'], 2: ['silver', 'Güçlü'], 3: ['bronze', 'Sürpriz Aday'], 4: ['gray', 'Uzak İhtimal'] };
  const [cls, label] = map[tier] || ['gray', 'Bilinmiyor'];
  return `<span class="badge badge-${cls}">${label}</span>`;
}

function statusBadge(status) {
  const labels = { pending: 'Bekliyor', won: 'Kazandı', lost: 'Kaybetti' };
  const colors = { pending: 'yellow', won: 'green', lost: 'red' };
  return `<span class="badge badge-${colors[status] || 'gray'}">${labels[status] || status}</span>`;
}

function initNav(active) {
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.querySelector('.nav-links a[data-page="' + active + '"]')?.classList.add('active');

  const hamburger = nav.querySelector('.hamburger');
  const links = nav.querySelector('.nav-links');
  if (hamburger) {
    hamburger.addEventListener('click', () => links.classList.toggle('open'));
  }
}

async function loadNavUser() {
  const data = await apiGet('/api/auth/me');
  if (!data || !data.success) return;
  const u = data.data;
  const el = document.getElementById('nav-user');
  if (el) {
    el.innerHTML = `<span>${u.display_name}</span> <span class="balance">🪙 ${u.balance.toLocaleString()}</span>`;
  }
}
