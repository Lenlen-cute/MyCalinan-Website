// Interface para sa certification details (kung may dynamic data man sa hinaharap)
interface CertificationRequirement {
  id: number;
  title: string;
  description: string;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Barangay Certification page loaded successfully.');

  // Smooth scroll / highlight logic (kung kailangan sa UI)
  const cards = document.querySelectorAll<HTMLElement>('.doc-card');
  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
    });
  });
});