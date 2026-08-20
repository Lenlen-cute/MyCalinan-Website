/* ══════════════════════════════════════════
   SCROLL ANIMATIONS (INTERSECTION OBSERVER)
══════════════════════════════════════════ */
// This will make the historical sections and images fade in smoothly as you scroll
const animateOnScroll = (): void => {
  const elementsToAnimate = document.querySelectorAll(
    '.headline-frame, .news-card, .headline-image img, .headline-image-1 img, .headline-image-2 img'
  );

  const observerOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLElement;
        target.style.opacity = '1';
        target.style.transform = 'translateY(0)';
        obs.unobserve(target); // Only animate once
      }
    });
  }, observerOptions);

  // Set initial styles for animation
  elementsToAnimate.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.opacity = '0';
    htmlEl.style.transform = 'translateY(30px)';
    htmlEl.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(htmlEl);
  });
};

/* ══════════════════════════════════════════
   IMAGE MODAL / LIGHTBOX
══════════════════════════════════════════ */
// This creates a popup when users click on the old historical photos
const setupImageModal = (): void => {
  // 1. Create the modal elements dynamically
  const modal = document.createElement('div');
  modal.id = 'historyImageModal';
  Object.assign(modal.style, {
    display: 'none',
    position: 'fixed',
    zIndex: '9999',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'zoom-out',
    opacity: '0',
    transition: 'opacity 0.3s ease'
  });

  const modalImg = document.createElement('img');
  Object.assign(modalImg.style, {
    maxWidth: '90%',
    maxHeight: '90%',
    borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
    objectFit: 'contain'
  });

  modal.appendChild(modalImg);
  document.body.appendChild(modal);

  // 2. Attach click events to all historical images
  const allImages = document.querySelectorAll('img:not(.back-btn img)'); // exclude logo/icons if any
  allImages.forEach(img => {
    const htmlImg = img as HTMLImageElement;
    htmlImg.style.cursor = 'zoom-in'; // Let users know it's clickable

    htmlImg.addEventListener('click', () => {
      modalImg.src = htmlImg.src;
      modal.style.display = 'flex';
      // Slight delay to allow display:flex to apply before animating opacity
      setTimeout(() => {
        modal.style.opacity = '1';
      }, 10);
    });
  });

  // 3. Close modal on click
  modal.addEventListener('click', () => {
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.display = 'none';
      modalImg.src = '';
    }, 300);
  });
};

/* ══════════════════════════════════════════
   INITIALIZATION
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  animateOnScroll();
  setupImageModal();
});s
