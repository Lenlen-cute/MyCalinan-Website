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
</body>
</html>
