// ─── TYPINGS & INTERFACES ────────────────────────────────
declare const L: any; // Ambient declaration for Leaflet CDN

interface OSRMRouteResponse {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: {
      coordinates: Array<[number, number]>;
    };
  }>;
}

// ─── STATE MANAGEMENT ─────────────────────────────────
let userLat: number | null = null;
let userLng: number | null = null;
let watchId: number | null = null;
let communityMap: any = null;
let mapReady: boolean = false;
let userMarker: any = null;
let activeMarker: any = null;
let routeLayer: any = null;
let activeFilter: string = 'all';
let sortByNearest: boolean = false;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let allCards: HTMLElement[] = [];

// ─── TOAST NOTIFICATIONS ──────────────────────────────
export function showToast(msg: string, duration: number = 3000): void {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

// ─── HAVERSINE MATH ───────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  if (km < 1) return Math.round(km * 1000) + ' m away';
  return km.toFixed(1) + ' km away';
}

// ─── LOCATION SERVICES ────────────────────────────────
function startLocating(): void {
  const locBtn = document.getElementById('locate-btn') as HTMLButtonElement | null;
  const locStatus = document.getElementById('location-status');
  const locText = document.getElementById('loc-text');

  if (!navigator.geolocation) {
    showToast('⚠️ Geolocation is not supported by your browser.');
    return;
  }

  if (locBtn) {
    locBtn.classList.add('loading');
    locBtn.disabled = true;
  }
  if (locStatus) locStatus.classList.add('visible');
  if (locText) locText.textContent = 'Detecting your location…';

  if (watchId !== null) navigator.geolocation.clearWatch(watchId);

  watchId = navigator.geolocation.watchPosition(
    onLocationSuccess,
    onLocationError,
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

function onLocationSuccess(pos: GeolocationPosition): void {
  userLat = pos.coords.latitude;
  userLng = pos.coords.longitude;

  const locBtn = document.getElementById('locate-btn') as HTMLButtonElement | null;
  const locDot = document.getElementById('loc-dot');
  const locText = document.getElementById('loc-text');
  const sortBtn = document.getElementById('sort-btn') as HTMLButtonElement | null;

  if (locBtn) {
    locBtn.classList.remove('loading');
    locBtn.disabled = false;
    const label = locBtn.querySelector('.btn-label');
    if (label) label.textContent = '📍 Tracking';
  }

  if (locDot) locDot.classList.remove('loc-err');
  if (locText) locText.textContent = `Location active · ±${Math.round(pos.coords.accuracy)} m accuracy`;
  if (sortBtn) sortBtn.disabled = false;

  updateAllDistances();
  updateUserMarker();
}

function onLocationError(err: GeolocationPositionError): void {
  const locBtn = document.getElementById('locate-btn') as HTMLButtonElement | null;
  const locDot = document.getElementById('loc-dot');
  const locText = document.getElementById('loc-text');

  if (locBtn) {
    locBtn.classList.remove('loading');
    locBtn.disabled = false;
  }

  if (locDot) locDot.classList.add('loc-err');

  const msgs: Record<number, string> = {
    1: 'Location access denied. Please allow it in your browser settings.',
    2: 'Location unavailable. Check your GPS or network.',
    3: 'Location request timed out. Try again.'
  };

  const errorMsg = msgs[err.code] || 'Could not get location.';
  if (locText) locText.textContent = errorMsg;
  showToast('⚠️ ' + errorMsg);
}

function updateAllDistances(): void {
  if (userLat === null || userLng === null) return;

  allCards.forEach(card => {
    const lat = parseFloat(card.dataset.lat || '0');
    const lng = parseFloat(card.dataset.lng || '0');
    const km = haversine(userLat!, userLng!, lat, lng);
    card.dataset.dist = km.toString();

    const badge = card.querySelector('.dist-badge');
    if (badge) {
      const distText = badge.querySelector('.dist-text');
      if (distText) distText.textContent = formatDist(km);
      badge.classList.add('visible');
    }

    const routeBtn = card.querySelector('.route-btn');
    if (routeBtn) routeBtn.classList.add('visible');
  });

  if (sortByNearest) applySortAndFilter();
}

function updateUserMarker(): void {
  if (!mapReady || userLat === null || userLng === null) return;
  if (userMarker) communityMap.removeLayer(userMarker);

  const icon = L.divIcon({
    className: '',
    html: `<div class="user-dot-wrapper">
             <div class="user-dot-ring"></div>
             <div class="user-dot-inner"></div>
           </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14]
  });

  userMarker = L.marker([userLat, userLng], { icon })
    .addTo(communityMap)
    .bindPopup('<div class="user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>');
}

// ─── SEARCH, FILTER & SORT ─────────────────────────────
function applySortAndFilter(): void {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const emptyState = document.getElementById('empty-state');

  const visibleCards = allCards.filter(card => {
    const name = (card.dataset.name || '').toLowerCase();
    const category = (card.dataset.category || '').toLowerCase();
    const tag = (card.dataset.tag || '').toLowerCase();

    const matchSearch = !query || name.includes(query) || category.includes(query) || tag.includes(query);
    const matchFilter = activeFilter === 'all' || category.includes(activeFilter.toLowerCase());
    return matchSearch && matchFilter;
  });

  if (sortByNearest && userLat !== null) {
    visibleCards.sort((a, b) => parseFloat(a.dataset.dist || '99999') - parseFloat(b.dataset.dist || '99999'));
  }

  allCards.forEach(card => {
    card.classList.add('hidden');
    card.style.order = '';
  });

  visibleCards.forEach((card, i) => {
    card.classList.remove('hidden');
    card.style.order = i.toString();
  });

  const count = visibleCards.length;
  const countEl = document.getElementById('result-count');
  if (countEl) {
    countEl.textContent = count > 0 ? `Showing ${count} of ${allCards.length} locations` : '';
  }

  if (emptyState) {
    emptyState.style.display = count === 0 ? 'flex' : 'none';
  }
}

// ─── LEAFLET MAP ACTIONS ───────────────────────────────
function initMap(): void {
  if (mapReady) return;
  communityMap = L.map('community-map', { zoomControl: true }).setView([7.1880, 125.4540], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
  }).addTo(communityMap);
  mapReady = true;
  if (userLat !== null) updateUserMarker();
}

export function showOnMap(btn: HTMLElement): void {
  const card = btn.closest('.card') as HTMLElement | null;
  if (!card) return;

  const lat = parseFloat(card.dataset.lat || '0');
  const lng = parseFloat(card.dataset.lng || '0');
  const name = card.dataset.name || '';
  const tag = card.dataset.tag || '';
  const query = card.dataset.mapsQuery || '';
  const pin = card.dataset.pin || '📍';

  const panel = document.getElementById('map-panel');
  const spacer = document.getElementById('map-panel-spacer');
  const title = document.getElementById('map-panel-title');
  const subtitle = document.getElementById('map-panel-subtitle');
  const dirLink = document.getElementById('map-directions-link') as HTMLAnchorElement | null;
  const routeInfo = document.getElementById('route-info');

  if (panel) panel.classList.add('active');
  if (spacer) spacer.classList.add('active');
  if (title) title.textContent = '📍 ' + name;
  if (subtitle) subtitle.textContent = tag;

  if (dirLink) {
    dirLink.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
    dirLink.classList.add('visible');
  }
  if (routeInfo) routeInfo.classList.remove('visible');

  initMap();

  if (activeMarker) communityMap.removeLayer(activeMarker);
  if (routeLayer) {
    communityMap.removeLayer(routeLayer);
    routeLayer = null;
  }

  const icon = L.divIcon({
    className: '',
    html: `<div style="
      background:#2b6b45; color:white; font-size:16px;
      width:36px; height:36px; border-radius:50% 50% 50% 0;
      transform:rotate(-45deg); display:flex; align-items:center; justify-content:center;
      box-shadow:0 3px 10px rgba(0,0,0,0.3); border:2px solid white;">
      <span style="transform:rotate(45deg)">${pin}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -40]
  });

  const distText = userLat !== null && userLng !== null
    ? `<br><strong>${formatDist(haversine(userLat, userLng, lat, lng))}</strong> straight-line from you`
    : '';

  activeMarker = L.marker([lat, lng], { icon })
    .addTo(communityMap)
    .bindPopup(`
      <div class="community-popup">
        <h4>${name}</h4>
        <div class="popup-tag">${tag}</div>
        <p>${distText}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank">🧭 Open in Google Maps</a>
      </div>`, { maxWidth: 250 })
    .openPopup();

  communityMap.flyTo([lat, lng], 17, { duration: 1.0 });
  setTimeout(() => communityMap.invalidateSize(), 320);

  if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// ─── ROUTING SYSTEM ───────────────────────────────────
export function getRoute(btn: HTMLElement): void {
  if (userLat === null || userLng === null) {
    showToast('📍 Enable location first to get directions.');
    return;
  }

  const card = btn.closest('.card') as HTMLElement | null;
  if (!card) return;

  const cLat = parseFloat(card.dataset.lat || '0');
  const cLng = parseFloat(card.dataset.lng || '0');
  const name = card.dataset.name || 'destination';

  btn.classList.add('loading');
  btn.textContent = '⏳ Loading route…';

  const viewBtn = card.querySelector('.view-map-btn') as HTMLElement | null;
  if (viewBtn) showOnMap(viewBtn);

  const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${cLng},${cLat}?overview=full&geometries=geojson`;

  fetch(url)
    .then(r => r.json())
    .then((data: OSRMRouteResponse) => {
      if (!data.routes || data.routes.length === 0) throw new Error('No route found');

      const route = data.routes[0];
      const coords: Array<[number, number]> = route.geometry.coordinates.map(c => [c[1], c[0]]);
      const distKm = (route.distance / 1000).toFixed(1);
      const mins = Math.round(route.duration / 60);
      const timeStr = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

      initMap();
      if (routeLayer) communityMap.removeLayer(routeLayer);

      routeLayer = L.polyline(coords, {
        color: '#2b6b45',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(communityMap);

      communityMap.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });

      const distEl = document.getElementById('route-dist');
      const timeEl = document.getElementById('route-time');
      const infoEl = document.getElementById('route-info');

      if (distEl) distEl.textContent = distKm + ' km';
      if (timeEl) timeEl.textContent = timeStr;
      if (infoEl) infoEl.classList.add('visible');

      showToast(`🧭 Route to ${name}: ${distKm} km · ${timeStr}`);

      btn.classList.remove('loading');
      btn.textContent = '🧭 Get Directions';
    })
    .catch(() => {
      btn.classList.remove('loading');
      btn.textContent = '🧭 Get Directions';
      showToast('⚠️ Could not load route. Check your internet connection.');
    });
}

export function closeMap(): void {
  const panel = document.getElementById('map-panel');
  const spacer = document.getElementById('map-panel-spacer');
  const routeInfo = document.getElementById('route-info');

  if (panel) panel.classList.remove('active');
  if (spacer) spacer.classList.remove('active');
  if (routeInfo) routeInfo.classList.remove('visible');

  if (routeLayer && mapReady) {
    communityMap.removeLayer(routeLayer);
    routeLayer = null;
  }
}

// ─── MODAL & DOM LISTENERS ────────────────────────────
function setupImageModal(): void {
  const modal = document.getElementById('imageModal') as HTMLDivElement | null;
  const modalImg = document.getElementById('modalImg') as HTMLImageElement | null;
  const closeBtn = document.querySelector('.close');

  if (!modal || !modalImg) return;

  document.querySelectorAll('.card-image img').forEach(img => {
    img.addEventListener('click', () => {
      modal.classList.add('active');
      modalImg.src = (img as HTMLImageElement).src;
    });
  });

  modal.addEventListener('click', e => {
    if (e.target !== modalImg) modal.classList.remove('active');
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') modal.classList.remove('active');
  });
}

function setupEventListeners(): void {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const locBtn = document.getElementById('locate-btn');
  const sortBtn = document.getElementById('sort-btn');

  if (searchInput) {
    searchInput.addEventListener('input', applySortAndFilter);
  }

  if (locBtn) {
    locBtn.addEventListener('click', startLocating);
  }

  if (sortBtn) {
    sortBtn.addEventListener('click', () => {
      if (userLat === null) return;
      sortByNearest = !sortByNearest;
      sortBtn.classList.toggle('active', sortByNearest);
      sortBtn.textContent = sortByNearest ? '✅ Sorted by nearest' : '📶 Sort by nearest';
      applySortAndFilter();
    });
  }

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = (chip as HTMLElement).dataset.filter || 'all';
      applySortAndFilter();
    });
  });
}

// Global binding for inline HTML onclick compatibility
function bindGlobalWindow(): void {
  const w = window as any;
  w.showOnMap = showOnMap;
  w.getRoute = getRoute;
  w.closeMap = closeMap;
  w.showToast = showToast;
}

// ─── INITIALIZATION ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  allCards = Array.from(document.querySelectorAll('.card:not(#empty-state)'));
  bindGlobalWindow();
  setupImageModal();
  setupEventListeners();
  applySortAndFilter();
});
