/* ══════════════════════════════════════════
   DATA
══════════════════════════════════════════ */
const CALINAN_PLACES = [
  { id: '1', name: 'Philippine Eagle Center', category: 'tourist', lat: 7.1824, lng: 125.4093, address: 'Malagos, Calinan, Davao City', icon: '🦅' },
  { id: '2', name: 'Malagos Garden Resort', category: 'tourist', lat: 7.1833, lng: 125.4132, address: 'Bagkiwet, Malagos, Calinan', icon: '🌺' },
  { id: '3', name: 'Bamboo Sanctuary', category: 'tourist', lat: 7.1700, lng: 125.4200, address: 'Calinan District, Davao City', icon: '🎋' },
  { id: '4', name: 'Isaac T. Robillo Memorial Hospital', category: 'hospital', lat: 7.1662, lng: 125.4590, address: 'McArthur Highway, Calinan', icon: '🏥' },
  { id: '5', name: 'Calinan National High School', category: 'school', lat: 7.1650, lng: 125.4630, address: 'Roman Diaz St, Calinan', icon: '🏫' },
  { id: '6', name: 'Holy Cross College of Calinan', category: 'school', lat: 7.1640, lng: 125.4615, address: 'Villafuerte St, Calinan', icon: '🎓' },
  { id: '7', name: 'Calinan Public Market', category: 'restaurant', lat: 7.1643, lng: 125.4608, address: 'Market Site, Calinan', icon: '🏪' },
  { id: '8', name: 'Calinan Police Station (Station 10)', category: 'police', lat: 7.1635, lng: 125.4621, address: 'Roman Diaz St, Calinan', icon: '🚔' },
  { id: '9', name: 'Calinan Fire Station', category: 'fire', lat: 7.1630, lng: 125.4610, address: 'Central Calinan', icon: '🚒' },
  { id: '10', name: 'Calinan District Hall', category: 'government', lat: 7.1648, lng: 125.4602, address: 'District Center, Calinan', icon: '🏛️' }
];

/* ══════════════════════════════════════════
   APP STATE
══════════════════════════════════════════ */
let map = null;
let userMarker = null;
let userLat = null;
let userLng = null;
let activeCategory = 'all';
let markersGroup = null;
let routingControl = null;

/* ══════════════════════════════════════════
   INITIALIZATION & MAP SETUP
══════════════════════════════════════════ */
function initMap() {
  // Initialize map centered on Calinan, Davao City
  map = L.map('map', { zoomControl: true }).setView([7.1648, 125.4600], 13);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  markersGroup = L.layerGroup().addTo(map);

  populateRouteDropdown();
  renderPlacesOnMap(CALINAN_PLACES);
  updateNearbyList(CALINAN_PLACES);
  startLocationTracking();

  // Search input live lookup
  document.getElementById('searchInput')?.addEventListener('input', handleSearchInput);
}

/* ══════════════════════════════════════════
   GEOLOCATION TRACKING
══════════════════════════════════════════ */
function startLocationTracking() {
  const statusEl = document.getElementById('gps-status');

  if (!navigator.geolocation) {
    if (statusEl) {
      statusEl.textContent = 'GPS Unsupported';
      statusEl.className = 'gps-status denied';
    }
    return;
  }

  navigator.geolocation.watchPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      
      document.getElementById('lat').textContent = userLat.toFixed(5);
      document.getElementById('lng').textContent = userLng.toFixed(5);
      document.getElementById('acc').textContent = `±${Math.round(pos.coords.accuracy)}m`;

      if (statusEl) {
        statusEl.textContent = 'GPS Active';
        statusEl.className = 'gps-status ok';
      }

      // Update User Marker
      const customIcon = L.divIcon({
        className: 'user-gps-marker',
        html: `<div style="background:#2b6b45; width:18px; height:18px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 8px rgba(0,0,0,0.4);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (userMarker) {
        userMarker.setLatLng([userLat, userLng]);
      } else {
        userMarker = L.marker([userLat, userLng], { icon: customIcon })
          .addTo(map)
          .bindPopup('<b>Your Current Location</b>');
      }

      updateNearbyList(getFilteredPlaces());
    },
    (err) => {
      console.warn(`GPS Error: ${err.message}`);
      if (statusEl) {
        statusEl.textContent = 'GPS Signal Weak / Denied';
        statusEl.className = 'gps-status denied';
      }
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
}

window.recenterMap = function() {
  if (userLat !== null && userLng !== null) {
    map.flyTo([userLat, userLng], 15);
    showToast('Recentered to your location');
  } else {
    showToast('GPS position not acquired yet');
  }
};

/* ══════════════════════════════════════════
   MARKERS & POPUPS
══════════════════════════════════════════ */
function renderPlacesOnMap(places) {
  markersGroup.clearLayers();

  places.forEach((place) => {
    const marker = L.marker([place.lat, place.lng]);
    const popupContent = `
      <div class="popup-content">
        <h4>${place.icon} ${place.name}</h4>
        <p>${place.address}</p>
        <button onclick="directRouteTo('${place.name.replace(/'/g, "\\'")}')">Directions</button>
      </div>
    `;
    marker.bindPopup(popupContent);
    markersGroup.addLayer(marker);
  });
}

/* ══════════════════════════════════════════
   CATEGORY FILTERING
══════════════════════════════════════════ */
window.filterCat = function(btn, category) {
  document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');

  activeCategory = category;
  const filtered = getFilteredPlaces();

  renderPlacesOnMap(filtered);
  updateNearbyList(filtered);

  if (filtered.length > 0) {
    const group = L.featureGroup(markersGroup.getLayers());
    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds(), { padding: [40, 40] });
    }
  }
};

function getFilteredPlaces() {
  if (activeCategory === 'all') return CALINAN_PLACES;
  return CALINAN_PLACES.filter((p) => p.category === activeCategory);
}

/* ══════════════════════════════════════════
   NEARBY LIST
══════════════════════════════════════════ */
function updateNearbyList(places) {
  const listEl = document.getElementById('nearbyList');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (places.length === 0) {
    listEl.innerHTML = `<li>No locations found</li>`;
    return;
  }

  const sorted = places.map((p) => {
    let dist = userLat && userLng ? calculateDistance(userLat, userLng, p.lat, p.lng) : null;
    return { ...p, dist };
  });

  if (userLat && userLng) sorted.sort((a, b) => a.dist - b.dist);

  sorted.slice(0, 5).forEach((item) => {
    const li = document.createElement('li');
    const distText = item.dist !== null ? ` (${item.dist.toFixed(1)} km)` : '';
    li.innerHTML = `<span class="nearby-dot"></span>${item.icon} ${item.name}${distText}`;
    li.onclick = () => {
      map.flyTo([item.lat, item.lng], 16);
      showToast(`Panned to ${item.name}`);
    };
    listEl.appendChild(li);
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* ══════════════════════════════════════════
   SEARCH
══════════════════════════════════════════ */
function handleSearchInput(e) {
  const query = e.target.value.toLowerCase().trim();
  const resultsContainer = document.getElementById('search-results');

  if (query.length < 2) {
    resultsContainer.style.display = 'none';
    return;
  }

  const matches = CALINAN_PLACES.filter(p => p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query));

  if (matches.length === 0) {
    resultsContainer.innerHTML = `<div class="sr-loading">No results found</div>`;
  } else {
    resultsContainer.innerHTML = matches.map(m => `
      <div class="sr-item" onclick="selectSearchResult('${m.id}')">
        <span class="sr-icon">${m.icon}</span>
        <div>
          <div class="sr-name">${m.name}</div>
          <div class="sr-desc">${m.address}</div>
        </div>
      </div>
    `).join('');
  }
  resultsContainer.style.display = 'block';
}

window.doSearch = function() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  if (!query) return;

  const matches = CALINAN_PLACES.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
  
  renderPlacesOnMap(matches);
  updateNearbyList(matches);
  document.getElementById('search-results').style.display = 'none';

  if (matches.length > 0) {
    map.flyTo([matches[0].lat, matches[0].lng], 15);
    showToast(`Found ${matches.length} matching location(s)`);
  } else {
    showToast('No locations matched your query');
  }
};

window.selectSearchResult = function(id) {
  const place = CALINAN_PLACES.find(p => p.id === id);
  document.getElementById('search-results').style.display = 'none';
  if (place) {
    map.flyTo([place.lat, place.lng], 16);
    showToast(`Navigated to ${place.name}`);
  }
};

/* ══════════════════════════════════════════
   ROUTING SERVICES
══════════════════════════════════════════ */
function populateRouteDropdown() {
  const select = document.getElementById('routeSelect');
  CALINAN_PLACES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = `${p.icon} ${p.name}`;
    select.appendChild(opt);
  });
}

window.directRouteTo = function(destinationName) {
  document.getElementById('routeSelect').value = destinationName;
  window.getDirections();
};

window.getDirections = function() {
  if (userLat === null || userLng === null) {
    showToast('Waiting for your GPS location...');
    return;
  }

  const destName = document.getElementById('routeSelect').value;
  if (!destName) {
    showToast('Please select a destination first');
    return;
  }

  const target = CALINAN_PLACES.find(p => p.name === destName);
  if (!target) return;

  window.clearRoute();

  if (typeof L.Routing !== 'undefined') {
    routingControl = L.Routing.control({
      waypoints: [L.latLng(userLat, userLng), L.latLng(target.lat, target.lng)],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      show: true,
      lineOptions: { styles: [{ color: '#2b6b45', weight: 6, opacity: 0.85 }] }
    }).addTo(map);
    showToast(`Calculating route to ${target.name}`);
  }
};

window.clearRoute = function() {
  if (routingControl) {
    routingControl.remove ? routingControl.remove() : map.removeLayer(routingControl);
    routingControl = null;
    showToast('Route cleared');
  }
};

/* ══════════════════════════════════════════
   EMERGENCY SEARCH
══════════════════════════════════════════ */
window.findNearest = function(type) {
  const matches = CALINAN_PLACES.filter(p => p.category === type);
  if (matches.length > 0) {
    const target = matches[0];
    renderPlacesOnMap(matches);
    map.flyTo([target.lat, target.lng], 16);
    window.directRouteTo(target.name);
    showToast(`Found nearest ${type}: ${target.name}`);
  } else {
    showToast(`No ${type} services found in database`);
  }
};

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

window.addEventListener('DOMContentLoaded', initMap);
