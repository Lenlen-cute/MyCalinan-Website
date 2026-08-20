// Declare Leaflet globally so TypeScript doesn't throw errors if @types/leaflet isn't installed
declare const L: any;

/* ══════════════════════════════════════════
   STATE & GLOBALS
══════════════════════════════════════════ */
let userLat: number | null = null;
let userLng: number | null = null;
let watchId: number | null = null;
let eduMap: any = null;
let mapReady: boolean = false;
let userMarker: any = null;
let activeEduMarker: any = null; // Renamed from activeClinicMarker for clarity
let routeLayer: any = null;
let activeFilter: string = 'all';
let sortByNearest: boolean = false;
let currentMapsQuery: string = '';

const allCards = Array.from(document.querySelectorAll('.card:not(#empty-state)')) as HTMLElement[];

/* ══════════════════════════════════════════
   IMAGE MODAL
══════════════════════════════════════════ */
const modal = document.getElementById('imageModal') as HTMLElement;
const modalImg = document.getElementById('modalImg') as HTMLImageElement;
const closeBtn = document.querySelector('.close') as HTMLElement;

document.querySelectorAll('.card-image img').forEach(img => {
  img.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLImageElement;
    if (modal && modalImg) {
      modal.classList.add('active');
      modalImg.src = target.src;
    }
  });
});

if (modal) {
  modal.addEventListener('click', (e: Event) => {
    if (e.target !== modalImg) modal.classList.remove('active');
  });
}

if (closeBtn) {
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
}

/* ══════════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════════ */
function showToast(msg: string, duration: number = 3000): void {
  const t = document.getElementById('toast') as HTMLElement;
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

/* ══════════════════════════════════════════
   HAVERSINE DISTANCE (km)
══════════════════════════════════════════ */
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

/* ══════════════════════════════════════════
   LOCATION HANDLING
══════════════════════════════════════════ */
const locBtn = document.getElementById('locate-btn') as HTMLButtonElement;
const locStatus = document.getElementById('location-status') as HTMLElement;
const locDot = document.getElementById('loc-dot') as HTMLElement;
const locText = document.getElementById('loc-text') as HTMLElement;
const sortBtn = document.getElementById('sort-btn') as HTMLButtonElement;

if (locBtn) {
  locBtn.addEventListener('click', startLocating);
}

function startLocating(): void {
  if (!navigator.geolocation) {
    showToast('⚠️ Geolocation is not supported by your browser.');
    return;
  }
  
  if (locBtn && locStatus && locText) {
    locBtn.classList.add('loading');
    locBtn.disabled = true;
    locStatus.classList.add('visible');
    locText.textContent = 'Detecting your location…';
  }

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

  if (locBtn && locDot && locText) {
    locBtn.classList.remove('loading');
    locBtn.disabled = false;
    
    const btnLabel = locBtn.querySelector('.btn-label');
    if (btnLabel) btnLabel.textContent = '📍 Tracking';

    locDot.classList.remove('loc-err');
    locText.textContent = `Location active · ±${Math.round(pos.coords.accuracy)} m accuracy`;
  }

  if (sortBtn) sortBtn.disabled = false;

  updateAllDistances();
  updateUserMarker();
}

function onLocationError(err: GeolocationPositionError): void {
  if (locBtn && locDot && locText) {
    locBtn.classList.remove('loading');
    locBtn.disabled = false;
    locDot.classList.add('loc-err');
    
    const msgs: Record<number, string> = {
      1: 'Location access denied. Please allow it in your browser settings.',
      2: 'Location unavailable. Check your GPS or network.',
      3: 'Location request timed out. Try again.'
    };
    
    locText.textContent = msgs[err.code] || 'Could not get location.';
    showToast('⚠️ ' + locText.textContent);
  }
}

function updateAllDistances(): void {
  if (userLat === null || userLng === null) return;

  allCards.forEach(card => {
    const lat = parseFloat(card.dataset.lat || '0');
    const lng = parseFloat(card.dataset.lng || '0');
    const km = haversine(userLat as number, userLng as number, lat, lng);
    
    card.dataset.dist = km.toString();

    const badge = card.querySelector('.dist-badge') as HTMLElement;
    const distText = badge?.querySelector('.dist-text') as HTMLElement;
    
    if (badge && distText) {
      distText.textContent = formatDist(km);
      badge.classList.add('visible');
    }

    const routeBtn = card.querySelector('.route-btn') as HTMLButtonElement;
    if (routeBtn) routeBtn.classList.add('visible');
  });

  if (sortByNearest) applySortAndFilter();
}

/* ══════════════════════════════════════════
   SEARCH, FILTER & SORT
══════════════════════════════════════════ */
const searchInput = document.getElementById('searchInput') as HTMLInputElement;

if (searchInput) {
  searchInput.addEventListener('input', applySortAndFilter);
}

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLButtonElement;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    target.classList.add('active');
    activeFilter = target.dataset.filter || 'all';
    applySortAndFilter();
  });
});

if (sortBtn) {
  sortBtn.addEventListener('click', () => {
    if (userLat === null) return;
    sortByNearest = !sortByNearest;
    sortBtn.classList.toggle('active', sortByNearest);
    sortBtn.textContent = sortByNearest ? '✅ Sorted by nearest' : '📶 Sort by nearest';
    applySortAndFilter();
  });
}

function applySortAndFilter(): void {
  const query = searchInput?.value.toLowerCase().trim() || '';
  const emptyState = document.getElementById('empty-state') as HTMLElement;

  let visibleCards = allCards.filter(card => {
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
  const resultCount = document.getElementById('result-count');
  if (resultCount) {
    resultCount.textContent = count > 0 ? `Showing ${count} of ${allCards.length} institutions` : '';
  }

  if (emptyState) {
    emptyState.style.display = count === 0 ? 'flex' : 'none';
  }
}

/* ══════════════════════════════════════════
   MAP INTEGRATION
══════════════════════════════════════════ */
function initMap(): void {
  if (mapReady) return;
  eduMap = L.map('edu-map', { zoomControl: true }).setView([7.1885, 125.4558], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
  }).addTo(eduMap);
  mapReady = true;
  if (userLat !== null) updateUserMarker();
}

function updateUserMarker(): void {
  if (!mapReady || userLat === null || userLng === null) return;
  if (userMarker) eduMap.removeLayer(userMarker);

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
    .addTo(eduMap)
    .bindPopup('<div class="user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>');
}

// Exposed to window so inline HTML onclick handlers still work
(window as any).showOnMap = function(btn: HTMLButtonElement): void {
  const card = btn.closest('.card') as HTMLElement;
  if (!card) return;

  const lat = parseFloat(card.dataset.lat || '0');
  const lng = parseFloat(card.dataset.lng || '0');
  const name = card.dataset.name || '';
  const tag = card.dataset.tag || '';
  const query = card.dataset.mapsQuery || '';
  currentMapsQuery = query;

  const panel = document.getElementById('map-panel');
  const spacer = document.getElementById('map-panel-spacer');
  const title = document.getElementById('map-panel-title');
  const subtitle = document.getElementById('map-panel-subtitle');
  const dirLink = document.getElementById('map-directions-link') as HTMLAnchorElement;
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

  if (activeEduMarker) eduMap.removeLayer(activeEduMarker);
  if (routeLayer) { eduMap.removeLayer(routeLayer); routeLayer = null; }

  const icon = L.divIcon({
    className: '',
    html: `<div style="
      background:#2b6b45; color:white; font-size:16px;
      width:36px; height:36px; border-radius:50% 50% 50% 0;
      transform:rotate(-45deg); display:flex; align-items:center; justify-content:center;
      box-shadow:0 3px 10px rgba(0,0,0,0.3); border:2px solid white;">
      <span style="transform:rotate(45deg)">🏫</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -40]
  });

  const distText = userLat !== null
    ? `<br><strong>${formatDist(haversine(userLat, userLng as number, lat, lng))}</strong> straight-line from you`
    : '';

  activeEduMarker = L.marker([lat, lng], { icon })
    .addTo(eduMap)
    .bindPopup(`
      <div class="edu-popup">
        <h4>${name}</h4>
        <div class="popup-tag">${tag}</div>
        <p>${distText}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank">🧭 Open in Google Maps</a>
      </div>`, { maxWidth: 250 })
    .openPopup();

  eduMap.flyTo([lat, lng], 17, { duration: 1.0 });
  setTimeout(() => eduMap.invalidateSize(), 320);
  
  if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'end' });
};

// Exposed to window so inline HTML onclick handlers still work
(window as any).getRoute = function(btn: HTMLButtonElement): void {
  if (userLat === null || userLng === null) {
    showToast('📍 Enable location first to get directions.');
    return;
  }

  const card = btn.closest('.card') as HTMLElement;
  if (!card) return;

  const cLat = parseFloat(card.dataset.lat || '0');
  const cLng = parseFloat(card.dataset.lng || '0');
  const name = card.dataset.name || '';

  btn.classList.add('loading');
  btn.textContent = '⏳ Loading route…';

  const viewMapBtn = card.querySelector('.view-map-btn') as HTMLButtonElement;
  if (viewMapBtn) {
    (window as any).showOnMap(viewMapBtn);
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${cLng},${cLat}?overview=full&geometries=geojson`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (!data.routes || data.routes.length === 0) throw new Error('No route found');

      const route = data.routes[0];
      const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
      const distKm = (route.distance / 1000).toFixed(1);
      const mins = Math.round(route.duration / 60);
      const timeStr = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

      initMap();
      if (routeLayer) eduMap.removeLayer(routeLayer);

      routeLayer = L.polyline(coords, {
        color: '#2b6b45', weight: 5, opacity: 0.85,
        lineCap: 'round', lineJoin: 'round'
      }).addTo(eduMap);

      eduMap.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });

      const routeDist = document.getElementById('route-dist');
      const routeTime = document.getElementById('route-time');
      const routeInfo = document.getElementById('route-info');

      if (routeDist) routeDist.textContent = distKm + ' km';
      if (routeTime) routeTime.textContent = timeStr;
      if (routeInfo) routeInfo.classList.add('visible');

      showToast(`🧭 Route to ${name}: ${distKm} km · ${timeStr}`);

      btn.classList.remove('loading');
      btn.textContent = '🧭 Get Directions';
    })
    .catch(() => {
      btn.classList.remove('loading');
      btn.textContent = '🧭 Get Directions';
      showToast('⚠️ Could not load route. Check your internet connection.');
    });
};

// Exposed to window so inline HTML onclick handlers still work
(window as any).closeMap = function(): void {
  const panel = document.getElementById('map-panel');
  const spacer = document.getElementById('map-panel-spacer');
  const routeInfo = document.getElementById('route-info');

  if (panel) panel.classList.remove('active');
  if (spacer) spacer.classList.remove('active');
  if (routeInfo) routeInfo.classList.remove('visible');

  if (routeLayer && mapReady) {
    eduMap.removeLayer(routeLayer);
    routeLayer = null;
  }
};

/* ══════════════════════════════════════════
   INITIALIZATION
══════════════════════════════════════════ */
applySortAndFilter();
