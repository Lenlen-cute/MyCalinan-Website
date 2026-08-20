// Interface para sa Barangay Update data
interface BarangayUpdate {
  title: string;
  category: string;
  date: string;
  description: string;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Barangay Updates page loaded successfully.');

  // Interactive hover effect para sa announcement cards
  const cards = document.querySelectorAll<HTMLElement>('.announcement-card');
  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
    });
  });
});
