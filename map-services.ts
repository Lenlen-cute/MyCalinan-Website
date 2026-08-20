// ─── TYPINGS & INTERFACES ────────────────────────────────
declare const L: any; // Ambient declaration for Leaflet CDN

interface Place {
  id: number;
  name: string;
  cat: string;
  lat: number;
  lng: number;
  desc?: string;
  icon?: string;
  dist?: number;
}

interface ApiPlaceResponse {
  name?: string;
  category?: string;
  type?: string;
  lat?: string | number;
  latitude?: string | number;
  lng?: string | number;
  longitude?: string | number;
  description?: string;
  desc?: string;
  icon?: string;
}

type CategoryType = 'tourist' | 'hospital' | 'school' | 'restaurant' | 'police' | 'government' | 'fire' | string;

// ─── CONFIG ───────────────────────────────────────────
const API_URL = 'http://localhost:5000/api';

// ─── FALLBACK STATIC DATA ──────────────────────────────
const STATIC_PLACES: Place[] = [
  { id: 1, name: 'Philippine Eagle Center', cat: 'tourist', lat: 7.1860, lng: 125.4550, desc: 'World-class eagle sanctuary and conservation center.', icon: '🦅' },
  { id: 2, name: 'Malagos Garden Resort', cat: 'tourist', lat: 7.1750, lng: 125.4300, desc: 'Eco-resort with gardens, animals, and chocolate farm.', icon: '🌿' },
  { id: 3, name: 'Davao Bamboo Sanctuary', cat: 'tourist', lat: 7.1920, lng: 125.4620, desc: 'Ecological park showcasing native bamboo species.', icon: '🎋' },
  { id: 4, name: 'Calinan Public Market', cat: 'restaurant', lat: 7.1885, lng: 125.4558, desc: 'Central market with fresh produce and local food.', icon: '🛒' },
  { id: 5, name: 'Calinan District Hospital', cat: 'hospital', lat: 7.1870, lng: 125.4530, desc: 'Government hospital serving Calinan district.', icon: '🏥' },
  { id: 6, name: 'Calinan Police Station', cat: 'police', lat: 7.1895, lng: 125.4570, desc: 'PNP Station 10 — Calinan.', icon: '🚔' },
  { id: 7, name: 'Calinan National High School', cat: 'school', lat: 7.1910, lng: 125.4540, desc: 'Public high school in Calinan Poblacion.', icon: '🏫' },
  { id: 8, name: 'Barangay Hall Calinan', cat: 'government', lat: 7.1880, lng: 125.4560, desc: 'Barangay government center for Calinan Poblacion.', icon: '🏛️' },
  { id: 9, name: 'Calinan Fire Station', cat: 'fire', lat: 7.1900, lng: 125.4545, desc: 'BFP Station serving Calinan and nearby barangays.', icon: '🚒' },
  { id: 10, name: 'Malagos Elementary School', cat: 'school', lat: 7.1760, lng: 125.4320, desc: 'Public elementary school in Malagos.', icon: '🏫' },
];

// ─── STATE MANAGEMENT ─────────────────────────────────
let map: any;
let allPlaces: Place[] = [];
let allMarkers: any[] = [];
let userMarker: any = null;
let userLatLng: [number, number] | null = null;
let routingControl: any = null;
let currentCat: string = 'all';
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// ─── MAP INIT ─────────────────────────────────────────
function initMap(): void {
  map = L.map('map').setView([7.1885, 125.4558], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
  }).addTo(map);
}

// ─── HELPER FUNCTIONS ─────────────────────────────────
function categoryColor(cat: CategoryType): string {
  const colors: Record<string, string> = {
    tourist: '#2b6b45',
    hospital: '#d9534f',
    school: '#2b4d8c',
    restaurant: '#e07b39',
    police: '#5a2b8c',
    government: '#8c6b2b',
    fire: '#c0392b',
    default: '#5aa77a'
  };
  return colors[cat] || colors.default;
}

function makeIcon(place: Place): any {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${categoryColor(place.cat)};
      color:white; font-size:18px;
      width:36px; height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 3px 10px rgba(0,0,0,0.25);
      border:2px solid white;
    ">
      <span style="transform:rotate(45deg)">${place.icon || '📍'}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38]
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function showToast(msg: string): void {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── MARKER MANAGEMENT ────────────────────────────────
function renderMarkers(places: Place[]): void {
  allMarkers.forEach(m => map.removeLayer(m));
  allMarkers = [];

  places.forEach(place => {
    const safeName = place.name.replace(/'/g, "\\'");
    const marker = L.marker([place.lat, place.lng], { icon: makeIcon(place) })
      .addTo(map)
      .bindPopup(`
        <div class="popup-content">
          <h4>${place.icon || ''} ${place.name}</h4>
          <p>${place.desc || ''}</p>
          <button onclick="window.routeTo(${place.lat},${place.lng},'${safeName}')">
            🧭 Get Directions
          </button>
        </div>
      `);
    allMarkers.push(marker);
  });
}

async function loadPlaces(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/search?q=`, { signal: AbortSignal.timeout(3000) });
    const data: ApiPlaceResponse[] = await res.json();
    
    if (Array.isArray(data) && data.length > 0) {
      allPlaces = data.map((d, i) => ({
        id: i,
        name: d.name || 'Unknown',
        cat: d.category || d.type || 'tourist',
        lat: parseFloat(String(d.lat || d.latitude)) || 7.1885,
        lng: parseFloat(String(d.lng || d.longitude)) || 125.4558,
        desc: d.description || d.desc || '',
        icon: d.icon || '📍'
      })).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
    }
  } catch (e) {
    console.warn('Flask API offline, using static place data.');
  }

  if (allPlaces.length === 0) allPlaces = STATIC_PLACES;

  renderMarkers(allPlaces);
  populateRouteSelect(allPlaces);
  updateNearbyList();
}

export function filterCat(btn: HTMLElement, cat: string): void {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCat = cat;
  const filtered = cat === 'all' ? allPlaces : allPlaces.filter(p => p.cat === cat || p.cat === cat.replace(' ', ''));
  renderMarkers(filtered);
}

// ─── GPS LOCATOR ──────────────────────────────────────
function setGPSStatus(cls: 'ok' | 'waiting' | 'denied', text: string): void {
  const el = document.getElementById('gps-status');
  if (el) {
    el.className = `gps-status ${cls}`;
    el.textContent = text;
  }
}

function initGPS(): void {
  if (!navigator.geolocation) {
    setGPSStatus('denied', 'GPS not supported');
    return;
  }

  navigator.geolocation.watchPosition(
    pos => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      userLatLng = [lat, lng];

      const latEl = document.getElementById('lat');
      const lngEl = document.getElementById('lng');
      const accEl = document.getElementById('acc');

      if (latEl) latEl.textContent = lat.toFixed(6);
      if (lngEl) lngEl.textContent = lng.toFixed(6);
      if (accEl) accEl.textContent = `±${Math.round(accuracy)} m`;
      
      setGPSStatus('ok', 'GPS Active');

      const userIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:18px; height:18px; border-radius:50%;
          background:#2b6b45; border:3px solid white;
          box-shadow:0 0 0 4px rgba(43,107,69,0.3);
        "></div>`,
        iconSize: [18, 18], 
        iconAnchor: [9, 9]
      });

      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup('<b>You are here</b>');
        map.setView([lat, lng], 15);
      }

      updateNearbyList();
    },
    () => setGPSStatus('denied', 'Location denied'),
    { enableHighAccuracy: true, maximumAge: 5000 }
  );
}

export function recenterMap(): void {
  if (userLatLng) {
    map.setView(userLatLng, 16);
    showToast('Re-centered to your location');
  } else {
    showToast('GPS location not available yet');
  }
}

// ─── NEARBY PLACES ────────────────────────────────────
function updateNearbyList(): void {
  const list = document.getElementById('nearbyList');
  if (!list) return;

  const base = userLatLng || [7.1885, 125.4558];

  const sorted = [...allPlaces]
    .map(p => ({ ...p, dist: haversine(base[0], base[1], p.lat, p.lng) }))
    .sort((a, b) => (a.dist || 0) - (b.dist || 0))
    .slice(0, 6);

  list.innerHTML = sorted.map(p => {
    const safeName = p.name.replace(/'/g, "\\'");
    const distText = (p.dist || 0) < 1 ? `${((p.dist || 0) * 1000).toFixed(0)}m` : `${(p.dist || 0).toFixed(1)}km`;
    return `
      <li onclick="window.flyTo(${p.lat},${p.lng},'${safeName}')">
        <span class="nearby-dot" style="background:${categoryColor(p.cat)}"></span>
        <span>
          <b>${p.name}</b><br>
          <span style="font-size:12px;color:var(--text-muted)">${p.icon} ${p.cat} · ${distText}</span>
        </span>
      </li>
    `;
  }).join('');
}

export function flyTo(lat: number, lng: number, name: string): void {
  map.flyTo([lat, lng], 16, { duration: 1.2 });
  allMarkers.forEach(m => {
    if (m.getLatLng().lat.toFixed(4) === Number(lat).toFixed(4)) m.openPopup();
  });
}

// ─── ROUTING ──────────────────────────────────────────
function populateRouteSelect(places: Place[]): void {
  const sel = document.getElementById('routeSelect') as HTMLSelectElement | null;
  if (!sel) return;

  sel.innerHTML = '<option value="">— Choose a destination —</option>';
  places.forEach(p => {
    const opt = document.createElement('option');
    opt.value = `${p.lat},${p.lng}`;
    opt.textContent = `${p.icon} ${p.name}`;
    sel.appendChild(opt);
  });
}

export function routeTo(destLat: number, destLng: number, name: string): void {
  if (!userLatLng) { showToast('GPS location needed for routing'); return; }
  clearRoute();

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(userLatLng[0], userLatLng[1]),
      L.latLng(destLat, destLng)
    ],
    routeWhileDragging: false,
    show: true,
    lineOptions: { styles: [{ color: '#2b6b45', weight: 5, opacity: 0.85 }] },
    createMarker: () => null
  }).addTo(map);

  showToast(`Routing to ${name}…`);
}

export function getDirections(): void {
  const sel = document.getElementById('routeSelect') as HTMLSelectElement | null;
  if (!sel || !sel.value) { showToast('Please choose a destination first'); return; }
  if (!userLatLng) { showToast('Waiting for your GPS location…'); return; }

  const [destLat, destLng] = sel.value.split(',').map(Number);
  const selectedText = sel.options[sel.selectedIndex].textContent || '';
  routeTo(destLat, destLng, selectedText);
}

export function clearRoute(): void {
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
}

// ─── EMERGENCY ────────────────────────────────────────
export function findNearest(type: 'hospital' | 'police' | 'fire'): void {
  const base = userLatLng || [7.1885, 125.4558];

  const candidates = allPlaces
    .filter(p => p.cat === type)
    .map(p => ({ ...p, dist: haversine(base[0], base[1], p.lat, p.lng) }))
    .sort((a, b) => (a.dist || 0) - (b.dist || 0));

  if (candidates.length === 0) { showToast(`No ${type} found in directory`); return; }

  const nearest = candidates[0];
  map.flyTo([nearest.lat, nearest.lng], 16, { duration: 1.2 });

  const typeLabel: Record<string, string> = { hospital: 'Hospital', police: 'Police Station', fire: 'Fire Station' };
  const distText = (nearest.dist || 0) < 1 ? `${((nearest.dist || 0) * 1000).toFixed(0)}m` : `${(nearest.dist || 0).toFixed(1)}km`;
  
  showToast(`Nearest ${typeLabel[type]}: ${nearest.name} (${distText})`);

  if (userLatLng) routeTo(nearest.lat, nearest.lng, nearest.name);
}

// ─── SEARCH SYSTEM ────────────────────────────────────
async function liveSearch(q: string): Promise<void> {
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;

  searchResults.style.display = 'block';
  searchResults.innerHTML = '<div class="sr-loading">Searching…</div>';

  let results: Place[] = [];

  try {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(3000) });
    const data: ApiPlaceResponse[] = await res.json();
    if (Array.isArray(data)) {
      results = data.map((d, i) => ({
        id: i,
        name: d.name || 'Unknown',
        cat: d.category || 'tourist',
        lat: Number(d.lat || d.latitude),
        lng: Number(d.lng || d.longitude),
        desc: d.description || d.desc || '',
        icon: d.icon || '📍'
      })).slice(0, 8);
    }
  } catch (e) {
    results = allPlaces.filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      (p.desc && p.desc.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 8);
  }

  if (results.length === 0) {
    searchResults.innerHTML = `<div class="sr-loading">No results found for "${q}"</div>`;
    return;
  }

  searchResults.innerHTML = results.map(r => {
    const safeName = r.name.replace(/'/g, "\\'");
    return `
      <div class="sr-item" onclick="window.selectResult(${r.lat},${r.lng},'${safeName}')">
        <span class="sr-icon">${r.icon}</span>
        <div>
          <div class="sr-name">${r.name}</div>
          ${r.desc ? `<div class="sr-desc">${r.desc.substring(0, 80)}…</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

export function selectResult(lat: number, lng: number, name: string): void {
  const searchResults = document.getElementById('search-results');
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;

  if (searchResults) searchResults.style.display = 'none';
  if (searchInput) searchInput.value = name;

  map.flyTo([lat, lng], 16, { duration: 1.2 });
  showToast(`Showing: ${name}`);
}

export function doSearch(): void {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  if (!searchInput) return;
  const q = searchInput.value.trim();
  if (!q) return;
  liveSearch(q);
}

// ─── INITIALIZATION & LISTENERS ───────────────────────
function setupEventListeners(): void {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const searchResults = document.getElementById('search-results');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      const q = searchInput.value.trim();
      if (q.length < 2) {
        if (searchResults) searchResults.style.display = 'none';
        return;
      }
      searchTimer = setTimeout(() => liveSearch(q), 300);
    });

    searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') doSearch();
      if (e.key === 'Escape' && searchResults) searchResults.style.display = 'none';
    });
  }

  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (searchResults && !target.closest('#searchWrap')) {
      searchResults.style.display = 'none';
    }
  });
}

// Attach all public functions to `window` for HTML inline calls
function bindGlobalWindow(): void {
  const w = window as any;
  w.filterCat = filterCat;
  w.recenterMap = recenterMap;
  w.getDirections = getDirections;
  w.clearRoute = clearRoute;
  w.findNearest = findNearest;
  w.doSearch = doSearch;
  w.flyTo = flyTo;
  w.routeTo = routeTo;
  w.selectResult = selectResult;
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  bindGlobalWindow();
  setupEventListeners();
  loadPlaces();
  initGPS();
});
