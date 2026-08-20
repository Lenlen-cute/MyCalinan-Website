// Interface para sa Emergency Contact
interface HotlineContact {
  name: string;
  number: string;
  location: string;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Emergency Hotlines page loaded successfully.');

  // Function para madaling ma-copy ang hotline numbers kapag cliniclick
  const phoneNumbers = document.querySelectorAll<HTMLElement>('.column p b, .column p');

  phoneNumbers.forEach((element) => {
    element.style.cursor = 'pointer';
    element.addEventListener('click', () => {
      const text = element.innerText.replace(/[^0-9/-]/g, '');
      if (text) {
        navigator.clipboard.writeText(text);
        alert(`Copied number: ${text}`);
      }
    });
  });
});