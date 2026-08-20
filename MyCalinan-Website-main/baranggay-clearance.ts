// Interface para sa clearance details
interface ClearanceInfo {
  title: string;
  requirements: string[];
  steps: string[];
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Barangay Clearance page loaded successfully.');

  // Subtle interactive hover effect para sa document cards
  const cards = document.querySelectorAll<HTMLElement>('.doc-card');
  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
    });
  });
});