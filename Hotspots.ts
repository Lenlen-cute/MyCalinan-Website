<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotspots – Calinan</title>
  <link rel="icon" type="image/png" href="image/CALINAN LOGO.png">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style/Hotspots.css">
</head>

<body>

<!-- HEADER -->
<header class="header">
  <div class="header-left">
    <a href="HomePage.html" class="back-btn" aria-label="Go back to home">← Home</a>
    <h1 class="logo">Hotspots</h1>
  </div>
  <div class="search-wrap">
    <div class="search-box">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input type="text" id="searchBar" placeholder="Search hotspots, nature, resort…" autocomplete="off" aria-label="Search hotspots">
    </div>
  </div>
</header>

<!-- IMAGE MODAL -->
<div class="image-modal" id="imageModal" role="dialog" aria-modal="true" aria-labelledby="modalCaption" hidden>
  <span class="close" tabindex="0" role="button" aria-label="Close modal">&times;</span>
  <img id="modalImg" class="modal-content" alt="Enlarged hotspot view">
  <p id="modalCaption" class="sr-only">Expanded image viewer</p>
</div>

<!-- HERO -->
<section class="hero">
  <h2>Discover Calinan's Best Spots</h2>
  <p>Popular destinations and must-visit places in the Calinan area — from nature escapes to cultural landmarks.</p>
</section>

<!-- TOOLBAR -->
<nav class="toolbar" aria-label="Filter categories">
  <span class="toolbar-label">Filter:</span>
  <button class="filter-chip active" data-filter="all" data-label-en="All" data-label-ceb="Tanan">All</button>
  <button class="filter-chip" data-filter="Nature Spot" data-label-en="Nature" data-label-ceb="Kinaiyahan">Nature</button>
  <button class="filter-chip" data-filter="Wildlife & Conservation" data-label-en="Wildlife" data-label-ceb="Kahasupan">Wildlife</button>
  <button class="filter-chip" data-filter="Eco Tourism" data-label-en="Eco Tourism" data-label-ceb="Eko Turismo">Eco Tourism</button>
  <button class="filter-chip" data-filter="Cultural Attraction" data-label-en="Cultural" data-label-ceb="Kultura">Cultural</button>
  <button class="filter-chip" data-filter="Spiritual Retreat" data-label-en="Spiritual" data-label-ceb="Espirituhanon">Spiritual</button>
  <button class="filter-chip" data-filter="Resort / Leisure" data-label-en="Resort" data-label-ceb="Bakasyonan">Resort</button>
  <button class="filter-chip" data-filter="Local Market" data-label-en="Market" data-label-ceb="Merkado">Market</button>
  <button class="filter-chip" data-filter="Community Park" data-label-en="Park" data-label-ceb="Parke">Park</button>
  <button class="filter-chip" data-filter="Commercial Hub" data-label-en="Commercial" data-label-ceb="Komersyal">Commercial</button>
</nav>
<div id="result-count" aria-live="polite"></div>

<!-- CARDS CONTAINER -->
<section class="container" id="cards-container">
  <!-- Dynamic cards render here -->
  <div id="empty-state" style="display: none;">
    <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2e8b57" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
    </svg>
    <h3>No results found</h3>
    <p>Try a different search term or filter.</p>
  </div>
</section>

<!-- TOAST -->
<div id="toast" role="status" aria-live="polite"></div>

<script>
  /* ── DATA SOURCE ── */
  const hotspotsData = [
    {
      id: "bamboo-sanctuary",
      name: "Bamboo Sanctuary",
      category: "Nature Spot",
      image: "image/bamboo-sanctuary-and-ecological-park.webp",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Bamboo+Sanctuary+Tamayong+Davao+City",
      desc: "A peaceful eco-tourism spot in Calinan, Davao City, known for its relaxing bamboo scenery, fresh air, and calm natural surroundings. Popular for nature walks, scenic photos, and quiet relaxation away from the busy city.",
      location: "Sitio Sto. Niño, Barangay Tamayong, Calinan District, Davao City"
    },
    {
      id: "philippine-eagle-center",
      name: "Philippine Eagle Center (PEC)",
      category: "Wildlife & Conservation",
      image: "image/PhpEagleCenter.png",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Philippine+Eagle+Center+Malagos+Davao+City",
      desc: "A conservation and education facility in Malagos, Davao City, dedicated to protecting the critically endangered Philippine Eagle. Home to the country's national bird and other wildlife — great for families, nature lovers, and visitors.",
      location: "Purok 5, Malagos-Baguio District, Davao City"
    },
    {
      id: "malagos-garden-resort",
      name: "Malagos Garden Resort",
      category: "Eco Tourism",
      image: "image/Malagos Garden Resort.jpg",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Malagos+Garden+Resort+Davao+City",
      desc: "A 12-hectare eco-tourism destination in Malagos, Davao City, known for its lush gardens, nature attractions, and award-winning Malagos Chocolate. Offers a relaxing and educational experience promoting sustainable tourism.",
      location: "Malagos-Baguio District, Davao City"
    },
    {
      id: "malagos-chocolate-museum",
      name: "Malagos Chocolate Museum",
      category: "Cultural Attraction",
      image: "image/Malagos Chocolate Museum.jpg",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Malagos+Chocolate+Museum+Davao+City",
      desc: "The first chocolate museum in the Philippines, inside Malagos Garden Resort in Davao City. An interactive attraction showcasing the country's growing cacao industry and the award-winning chocolates of Malagos.",
      location: "Malagos-Baguio District, Davao City"
    },
    {
      id: "tamayong-prayer-mountain",
      name: "Tamayong Prayer Mountain",
      category: "Spiritual Retreat",
      image: "image/Tamayong Prayer Mountain.jpg",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Tamayong+Prayer+Mountain+Calinan+Davao+City",
      desc: "Also known as the Garden of Eden Restored, this private spiritual retreat in Tamayong, Calinan serves as a place for prayer, meditation, worship, and spiritual reflection in a serene highland setting.",
      location: "Tamayong, Calinan District, Davao City"
    },
    {
      id: "lantaw-bukid-resort",
      name: "Lantaw Bukid Resort",
      category: "Resort / Leisure",
      image: "image/Lantaw Bukid Resort.jpg",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Lantaw+Bukid+Resort+Davao+City",
      desc: "A family-friendly inland resort known for its peaceful countryside atmosphere, open green spaces, pools, cottages, and relaxing nature views. A popular budget-friendly getaway for outings, reunions, and weekend swimming.",
      location: "Campo Cienco Road, Barangay Los Amigos, Tugbok District, Davao City"
    },
    {
      id: "calinan-public-market",
      name: "Calinan Public Market",
      category: "Local Market",
      image: "image/Calinan Public Market.jpg",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Calinan+Public+Market+Calinan+Davao+City",
      desc: "The main marketplace in Calinan where locals and farmers trade fresh produce and daily goods. Known for experiencing local life and buying fresh fruits, vegetables, durian, souvenirs, and local snacks.",
      location: "Calinan District, Davao City"
    },
    {
      id: "calinan-park",
      name: "Calinan Park",
      category: "Community Park",
      image: "image/Calinan Park.png",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Calinan+Park+Calinan+Davao+City",
      desc: "A small community park in the heart of Calinan offering a quiet green space where locals can relax, socialize, or take a break. A common meeting spot for commuters, students, and families in the poblacion area.",
      location: "H Quiambao St, Calinan District, Davao City"
    },
    {
      id: "calinan-commercial-center",
      name: "Calinan Commercial Center",
      category: "Commercial Hub",
      image: "image/Brows1.png",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Calinan+Commercial+Center+Calinan+Davao+City",
      desc: "A local hub in Calinan where people gather for daily needs, small businesses, and community activities. Reflects the active local life in the district and serves nearby residents and visitors passing through the area.",
      location: "H Quiambao St, Calinan District, Davao City"
    }
  ];

  /* ── DOM ELEMENTS & STATE ── */
  let activeFilter = 'all';
  const container = document.getElementById('cards-container');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('searchBar');
  const resultCount = document.getElementById('result-count');
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImg');

  /* ── RENDER CARDS ── */
  function renderCards() {
    // Clear existing cards (except empty state element)
    container.querySelectorAll('.card').forEach(el => el.remove());

    hotspotsData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.name = item.name;
      card.dataset.category = item.category;
      card.dataset.tag = item.category;

      card.innerHTML = `
        <div class="card-image">
          <img src="${item.image}" alt="${item.name}" loading="lazy" tabindex="0">
        </div>
        <div class="card-content">
          <h3>
            <a href="${item.mapUrl}" target="_blank" rel="noopener noreferrer">${item.name}</a>
          </h3>
          <p>${item.desc}<br><br>📍 ${item.location}</p>
          <span class="tag">${item.category}</span>
        </div>
      `;

      // Modal listener for image click/keypress
      const img = card.querySelector('.card-image img');
      const openModal = () => {
        modal.hidden = false;
        modal.classList.add('active');
        modalImg.src = item.image;
        document.body.style.overflow = 'hidden';
      };

      img.addEventListener('click', openModal);
      img.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(); });

      container.insertBefore(card, emptyState);
    });
  }

  /* ── MODAL CONTROLS ── */
  function closeModal() {
    modal.classList.remove('active');
    modal.hidden = true;
    document.body.style.overflow = 'auto';
  }

  modal.addEventListener('click', e => { if (e.target !== modalImg) closeModal(); });
  document.querySelector('.close').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ── FILTERING LOGIC ── */
  function applyFilter() {
    const query = searchInput.value.toLowerCase().trim();
    const cards = Array.from(container.querySelectorAll('.card'));

    let visibleCount = 0;

    cards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const category = (card.dataset.category || '').toLowerCase();
      const bodyText = (card.querySelector('p')?.textContent || '').toLowerCase();

      const matchSearch = !query || name.includes(query) || category.includes(query) || bodyText.includes(query);
      const matchFilter = activeFilter === 'all' || category === activeFilter.toLowerCase();

      if (matchSearch && matchFilter) {
        card.classList.remove('hidden');
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.classList.add('hidden');
        card.style.display = 'none';
      }
    });

    resultCount.textContent = visibleCount > 0 ? `Showing ${visibleCount} of ${cards.length} hotspots` : '';
    emptyState.style.display = visibleCount === 0 ? 'flex' : 'none';
  }

  /* ── EVENT LISTENERS ── */
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilter, 150);
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
  renderCards();
  applyFilter();
</script>

</body>
</html>
