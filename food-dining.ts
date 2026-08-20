// Interface para sa Food Place item
interface FoodPlace {
  name: string;
  category: string;
  lat: number;
  lng: number;
  tag: string;
  pin: string;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Food & Dining page loaded successfully.');

  // Subtle interactive hover effect para sa food cards
  const cards = document.querySelectorAll<HTMLElement>('.card');
  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
    });
  });
});
