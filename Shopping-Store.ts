<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shopping & Store – Calinan</title>
  <link rel="icon" type="image/png" href="image/CALINAN LOGO.png">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <!-- Leaflet Maps CSS & JS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <link rel="stylesheet" href="style/Shopping-Store.css">
</head>

<body>

<!-- HEADER -->
<header class="header">
  <div class="header-left">
    <a href="HomePage.html" class="back-btn" aria-label="Go back to home">← Home</a>
    <h1 class="logo">Shopping &amp; Store</h1>
  </div>
  <div class="search-wrap">
    <div class="search-box">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input type="text" id="searchInput" placeholder="Search store, mall, hardware…" autocomplete="off" aria-label="Search stores">
    </div>
    <button id="locate-btn" title="Find my location" aria-label="Find my location">
      <div class="spinner" id="loc-spinner" style="display: none;"></div>
      <span class="btn-label" id="loc-btn-text">📍 Locate Me</span>
    </button>
  </div>
</header>

<!-- IMAGE MODAL -->
<div class="image-modal" id="imageModal" role="dialog" aria-modal="true" hidden>
  <span class="close" id="closeBtn" tabindex="0" role="button" aria-label="Close modal">&times;</span>
  <img class="modal-content" id="modalImg" alt="Enlarged store view">
</div>

<!-- HERO -->
<section class="hero">
  <h2>Shopping & Stores in Calinan</h2>
  <p>Explore local malls, groceries, hardware, motor shops, and service stores around the Calinan area. Enable location to see distances and get directions.</p>
  <div id="location-status" style="display: none;">
    <div class="loc-dot" id="loc-dot"></div>
    <span id="loc-text" aria-live="polite">Detecting your location…</span>
  </div>
</section>

<!-- TOOLBAR -->
<nav class="toolbar" aria-label="Filter categories">
  <span class="toolbar-label">Filter:</span>
  <button class="filter-chip active" data-filter="all" data-label-en="All" data-label-ceb="Tanan">All</button>
  <button class="filter-chip" data-filter="Mall & Grocery" data-label-en="Mall & Grocery" data-label-ceb="Mall ug Grocery">Mall & Grocery</button>
  <button class="filter-chip" data-filter="General Merchandise" data-label-en="General Merchandise" data-label-ceb="Pangkalahatang Paninda">General Merchandise</button>
  <button class="filter-chip" data-filter="Hardware & Construction" data-label-en="Hardware" data-label-ceb="Hardware">Hardware & Construction</button>
  <button class="filter-chip" data-filter="Motor Parts" data-label-en="Motor Parts" data-label-ceb="Pyesa sa Motor">Motor Parts</button>
  <button class="filter-chip" data-filter="Convenience Store" data-label-en="Convenience" data-label-ceb="Convenience">Convenience</button>
  <button class="filter-chip" data-filter="Electronics & Repair" data-label-en="Electronics" data-label-ceb="Elektroniko">Electronics & Repair</button>
  <button class="filter-chip" data-filter="Printing & Photo" data-label-en="Printing" data-label-ceb="Paimprinta">Printing & Photo</button>
  <button class="sort-btn" id="sort-btn" disabled title="Enable location first">
    📶 Sort by nearest
  </button>
</nav>
<div id="result-count" aria-live="polite"></div>

<!-- CARDS -->
<main class="container" id="cards-container">
  <!-- Cards will be dynamically injected here -->
  <div id="empty-state" style="display: none;">
    <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2e8b57" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
    </svg>
    <h3>No results found</h3>
    <p>Try a different search term or filter.</p>
  </div>
</main>

<script>
  /* ── DATA SOURCE ── */
  const storesData = [
    { name: "Gaisano Grand Calinan", category: "Mall & Grocery", tag: "Mall", lat: 7.1905, lng: 125.4558, mapQuery: "Gaisano+Grand+Calinan+Davao+City", img: "image/Gaisano Grand Calinan.jpg", desc: "Gaisano Grand Calinan is the main shopping mall in Calinan District, serving as a central hub for shopping, dining, and everyday services.", loc: "Davao–Bukidnon Highway, Calinan Poblacion, Davao City" },
    { name: "NCCC Calinan", category: "Mall & Grocery", tag: "Department Store", lat: 7.1897, lng: 125.4548, mapQuery: "NCCC+Calinan+Davao+City", img: "image/NCCC Calinan.jpg", desc: "NCCC Calinan is a small community shopping center in Calinan Poblacion that provides basic shopping, groceries, and everyday services.", loc: "Davao–Bukidnon Highway, Calinan Poblacion, Davao City" },
    { name: "Lots For Less", category: "Mall & Grocery", tag: "Supermarket", lat: 7.1890, lng: 125.4530, mapQuery: "Lots+For+Less+Calinan+Davao+City", img: "image/Lots For Less.jpg", desc: "Lots for Less is a budget-friendly grocery store in Calinan known for affordable products, discounted prices, and value-for-money essentials.", loc: "De Lara St, Calinan District, Davao City" },
    { name: "Felcris Supermarket Inc.", category: "Mall & Grocery", tag: "Supermarket", lat: 7.1885, lng: 125.4525, mapQuery: "Felcris+Supermarket+Calinan+Davao+City", img: "image/Felcris Supermarket Inc..jpg", desc: "Felcris Supermarket Calinan offers groceries, snacks, household items, and clothing at affordable prices.", loc: "De Lara St, Calinan District, Davao City" },
    { name: "Multiple-Eight Merchandise", category: "General Merchandise", tag: "General Merchandise", lat: 7.1910, lng: 125.4560, mapQuery: "Multiple+Eight+Merchandise+Davao-Bukidnon+Hwy+Calinan+Davao+City", img: "image/Multiple-Eight Merchandise.png", desc: "A budget-friendly general grocery store in Calinan known for selling affordable items such as snacks, foods and household goods.", loc: "Bukidnon Hwy, Calinan Poblacion, Calinan District, Davao City" },
    { name: "Four Star Merchandise", category: "General Merchandise", tag: "General Merchandise", lat: 7.1902, lng: 125.4542, mapQuery: "Four+Star+Merchandise+Purok+30+Calinan+Poblacion+Davao+City", img: "image/Four Star Merchandise.png", desc: "Four Stars General Merchandise is a general merchandise and school supply store in Calinan Poblacion.", loc: "Purok 30, Calinan Poblacion, Calinan, Davao City" },
    { name: "Rillan Trading", category: "General Merchandise", tag: "Trading Store", lat: 7.1895, lng: 125.4535, mapQuery: "Rillan+Trading+Villafuerte+St+Calinan+Davao+City", img: "image/Rillan Trading.png", desc: "A small local trading store in Calinan Poblacion that sells a mix of general merchandise, school supplies, and everyday items.", loc: "Villafuerte Street, Calinan Poblacion, Davao City" },
    { name: "Ploya Marketing", category: "General Merchandise", tag: "School & Office Supplies", lat: 7.1893, lng: 125.4533, mapQuery: "Ploya+Marketing+Villafuerte+St+Calinan+Davao+City", img: "image/Ploya Marketing.png", desc: "Specializing in school supplies, office materials, and assorted retail items — a go-to place for students and parents.", loc: "Villafuerte Street, Calinan Poblacion, Davao City" },
    { name: "KSC Calinan", category: "Mall & Grocery", tag: "Department Store", lat: 7.1891, lng: 125.4531, mapQuery: "KSC+Calinan+Villafuerte+St+Calinan+Davao+City", img: "image/KSC Calinan.jpg", desc: "KSC (Kristine Shopping Center) in Calinan is a local department-style store offering clothing, footwear, school supplies, and accessories.", loc: "Villafuerte Street, Calinan Poblacion, Davao City" },
    { name: "BCG Trading", category: "General Merchandise", tag: "Utility Supply Store", lat: 7.1912, lng: 125.4562, mapQuery: "BCG+Trading+Purok+13+Davao-Bukidnon+Road+Calinan+Davao+City", img: "image/BCG Trading.jpg", desc: "A local supply and trading store focusing on store equipment, containers, ice chests, fish boxes, and household-use utility items.", loc: "Purok 13, Davao–Bukidnon Road, Calinan, Davao City" },
    { name: "D & D Calinan Plasticware", category: "General Merchandise", tag: "Plasticware Store", lat: 7.1913, lng: 125.4563, mapQuery: "D+%26+D+Calinan+Plasticware+Purok+13+Davao-Bukidnon+Road+Calinan+Davao+City", img: "image/D & D Calinan Plasticware.png", desc: "Specializes in plastic household items and utility products — affordable containers, kitchenware, and storage supplies.", loc: "Purok 13, Davao–Bukidnon Road, Calinan, Davao City" },
    { name: "A.L. Calinan Trading", category: "Mall & Grocery", tag: "Department Store", lat: 7.1894, lng: 125.4534, mapQuery: "A.L.+Calinan+Trading+Villafuerte+St+Calinan+Davao+City", img: "image/A.L. Calinan Trading.jpg", desc: "A popular general merchandise store known for school supplies, toys, party materials, decorations, and household goods.", loc: "Villafuerte Street, Calinan Poblacion, Davao City" },
    { name: "JW KIMHIM Trading", category: "General Merchandise", tag: "Wholesale Trading", lat: 7.1915, lng: 125.4565, mapQuery: "JW+KIMHIM+Trading+Davao-Bukidnon+Hwy+Calinan+Davao+City", img: "image/JW KIMHIM Trading.png", desc: "A local trading and distribution store dealing in plastic products and wholesale goods for vendors.", loc: "Davao - Bukidnon Hwy, Calinan District, Davao City" },
    { name: "Calinan Skylight Hardware", category: "Hardware & Construction", tag: "Hardware Store", lat: 7.1888, lng: 125.4528, mapQuery: "Calinan+Skylight+Hardware+R.+Magsaysay+St+Calinan+Davao+City", img: "image/Calinan Skylight Hardware.jpg", desc: "A locally owned hardware store known for its comprehensive range of construction, electrical, and plumbing supplies.", loc: "R. Magsaysay St, Calinan, Davao City" },
    { name: "Calinan Blue Star Hardware", category: "Hardware & Construction", tag: "Hardware Store", lat: 7.1886, lng: 125.4526, mapQuery: "Calinan+Blue+Star+Hardware+R.+Magsaysay+St+Calinan+Davao+City", img: "image/Calinan Blue Star Hardware.jpg", desc: "Supplying construction and household maintenance materials to residents and contractors in the Calinan district.", loc: "R. Magsaysay St, Calinan, Davao City" },
    { name: "Edaka Hardware", category: "Hardware & Construction", tag: "Hardware Store", lat: 7.1892, lng: 125.4532, mapQuery: "Edaka+Hardware+Villafuerte+St+Calinan+Davao+City", img: "image/Edaka Hardware.jpg", desc: "A neighborhood hardware store serving local residents and contractors with retail and wholesale construction supplies.", loc: "Villafuerte St, Calinan District, Davao City" },
    { name: "Polycrop Marketing", category: "Hardware & Construction", tag: "Hardware Store", lat: 7.1890, lng: 125.4530, mapQuery: "Polycrop+Marketing+Villafuerte+St+Calinan+Davao+City", img: "image/POLYCROP MARKETING.jpg", desc: "A key supplier of materials and tools for residential and commercial construction projects in the Calinan District.", loc: "Villafuerte St, Calinan District, Davao City" },
    { name: "KCT Motor Vehicle Parts", category: "Motor Parts", tag: "Motorshop", lat: 7.1878, lng: 125.4518, mapQuery: "KCT+Motor+Vehicle+Parts+%26+Accessories+Shop+Roman+Diaz+St+Calinan+Davao+City", img: "image/KCT Motor Vehicle Parts & Accessories Shop.jpg", desc: "A local motorcycle parts store and repair shop selling motor vehicle parts and offering basic repair services.", loc: "Roman Diaz St, Calinan, Davao City" },
    { name: "LYR Motorparts Calinan", category: "Motor Parts", tag: "Motorshop", lat: 7.1880, lng: 125.4520, mapQuery: "LYR+Motorparts+Calinan+32+Malanos+St+Calinan+Davao+City", img: "image/LYR Motorparts Calinan.jpg", desc: "A motorcycle parts and accessories retailer, part of the LYR Marketing Corporation network.", loc: "Roman Diaz St, Calinan, Davao City" },
    { name: "Motohub Davao Calinan", category: "Motor Parts", tag: "Motorshop", lat: 7.1908, lng: 125.4555, mapQuery: "Motohub+Davao+Calinan+Branch+Davao-Bukidnon+Rd+Calinan+Davao+City", img: "image/Motohub Davao Calinan Branch.png", desc: "Offers premium motorcycle gear, riding equipment, accessories, and parts along Davao–Bukidnon Road.", loc: "Davao-Bukidnon Rd, Calinan District, Davao City" },
    { name: "Roan Parts And Accessories", category: "Motor Parts", tag: "Motorshop Branch", lat: 7.1876, lng: 125.4516, mapQuery: "Roan+Parts+And+Accessories+Purok+32+Roman+Diaz+St+Calinan+Davao+City", img: "image/Roan Parts And Accessories.png", desc: "A local motor-parts retailer providing parts, accessories, and maintenance items for motorcycle owners.", loc: "Purok 32 Roman Diaz St, Calinan, Davao City" },
    { name: "Roan Parts And Acc (Main)", category: "Motor Parts", tag: "Motorshop Main Branch", lat: 7.1874, lng: 125.4514, mapQuery: "Roan+Parts+And+Accessories+H.+Quiambao+St+Roman+Diaz+St+Calinan+Davao+City", img: "image/Roan Parts And Accessories.jpg", desc: "A key stop for riders in Calinan seeking maintenance essentials and aftermarket parts.", loc: "H. Quiambao St, corner Roman Diaz St, Calinan Poblacion" },
    { name: "Pagaran Motor Parts", category: "Motor Parts", tag: "Motorshop", lat: 7.1872, lng: 125.4512, mapQuery: "Pagaran+Motor+Parts+Datu+Abing+St+Calinan+Davao+City", img: "image/Pagaran Motor Parts.jpg", desc: "Automotive parts retailer providing motorcycle and vehicle spare parts for repair shops and vehicle owners.", loc: "Datu Abing St, Calinan District, Davao City" },
    { name: "OEM Auto Parts Supply", category: "Motor Parts", tag: "Motorshop", lat: 7.1906, lng: 125.4553, mapQuery: "OEM+AUTO+PARTS+SUPPLY+Davao-Bukidnon+Rd+Calinan+Davao+City", img: "image/OEM AUTO PARTS SUPPLY.jpg", desc: "Local automotive parts retailer offering replacement components, accessories, and maintenance essentials.", loc: "Davao-Bukidnon Rd, Calinan District, Davao City" },
    { name: "LSAC Enterprises", category: "General Merchandise", tag: "General Merchandise", lat: 7.1896, lng: 125.4536, mapQuery: "LSAC+Enterprises+Calinan+Davao+City", img: "image/Brows1.png", desc: "A trusted local merchandise provider offering a variety of dry goods, household supplies, and daily retail needs.", loc: "Calinan Poblacion, Davao City" }
  ];

  /* ── DOM & STATE ── */
  let activeFilter = 'all';
  let userLat = null, userLng = null;
  const container = document.getElementById('cards-container');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('searchInput');
  const resultCount = document.getElementById('result-count');
  const sortBtn = document.getElementById('sort-btn');
  const locateBtn = document.getElementById('locate-btn');
  
  // Modal State
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImg');

  /* ── RENDER CARDS ── */
  function renderCards(dataToRender) {
    container.querySelectorAll('.card').forEach(el => el.remove());

    dataToRender.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.name = item.name;
      card.dataset.category = item.category;
      
      // Calculate distance if available
      let distanceHTML = '';
      if (userLat && userLng) {
        const dist = getDistanceFromLatLonInKm(userLat, userLng, item.lat, item.lng).toFixed(2);
        distanceHTML = `<div class="dist-badge"><div class="dot" style="background:var(--primary)"></div><span class="dist-text">${dist} km away</span></div>`;
      }

      card.innerHTML = `
        <div class="card-image">
          <img src="${item.img}" alt="${item.name}" loading="lazy" tabindex="0">
        </div>
        <div class="card-content">
          <h3>
            <a href="https://www.google.com/maps/search/?api=1&query=${item.mapQuery}" target="_blank" rel="noopener noreferrer">${item.name}</a>
          </h3>
          <p>${item.desc}<br><br>Location: ${item.loc}</p>
          <span class="tag">${item.tag}</span>
          ${distanceHTML}
          <div class="card-actions">
            <a href="https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}" target="_blank" class="view-map-btn" style="text-decoration:none; text-align:center;">📍 View on Map</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" class="route-btn" style="text-decoration:none; text-align:center;">🧭 Get Directions</a>
          </div>
        </div>
      `;

      // Image modal event
      const img = card.querySelector('img');
      img.addEventListener('click', () => openModal(item.img));
      img.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(item.img); });

      container.insertBefore(card, emptyState);
    });
  }

  /* ── FILTERING & SORTING LOGIC ── */
  function applyFilter() {
    const query = searchInput.value.toLowerCase().trim();
    
    let filteredData = storesData.filter(item => {
      const matchSearch = !query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query);
      const matchCategory = activeFilter === 'all' || item.category === activeFilter;
      return matchSearch && matchCategory;
    });

    // If geolocation is active and sorting is enabled
    if (userLat && userLng && sortBtn.classList.contains('active')) {
      filteredData.sort((a, b) => {
        return getDistanceFromLatLonInKm(userLat, userLng, a.lat, a.lng) - getDistanceFromLatLonInKm(userLat, userLng, b.lat, b.lng);
      });
    }

    renderCards(filteredData);
    
    resultCount.textContent = filteredData.length > 0 ? `Showing ${filteredData.length} stores` : '';
    emptyState.style.display = filteredData.length === 0 ? 'flex' : 'none';
  }

  /* ── GEOLOCATION ── */
  locateBtn.addEventListener('click', () => {
    const spinner = document.getElementById('loc-spinner');
    const statusDiv = document.getElementById('location-status');
    const statusText = document.getElementById('loc-text');

    spinner.style.display = 'inline-block';
    statusDiv.style.display = 'flex';
    statusText.textContent = "Detecting your location...";

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
          
          spinner.style.display = 'none';
          statusText.textContent = "Location enabled. Distances are now visible.";
          document.getElementById('loc-dot').style.background = '#28a745';
          
          sortBtn.disabled = false;
          sortBtn.title = "Click to sort by nearest";
          
          applyFilter();
        },
        (error) => {
          spinner.style.display = 'none';
          document.getElementById('loc-dot').style.background = '#dc3545';
          statusText.textContent = "Location access denied or unavailable.";
        }
      );
    } else {
      spinner.style.display = 'none';
      statusText.textContent = "Geolocation is not supported by your browser.";
    }
  });

  sortBtn.addEventListener('click', () => {
    if (sortBtn.disabled) return;
    sortBtn.classList.toggle('active');
    applyFilter();
  });

  /* ── MATH LOGIC (Haversine Formula) ── */
  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
  }

  /* ── MODAL & EVENT LISTENERS ── */
  function openModal(src) {
    modal.hidden = false;
    modal.classList.add('active');
    modalImg.src = src;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.hidden = true;
    document.body.style.overflow = 'auto';
  }

  document.getElementById('closeBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target !== modalImg) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilter, 200);
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      applyFilter();
    });
  });

  /* ── INIT ── */
  applyFilter();
</script>

</body>
</html>
