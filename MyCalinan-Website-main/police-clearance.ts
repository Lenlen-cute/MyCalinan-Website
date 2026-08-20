// ─── TYPINGS & INTERFACES ────────────────────────────────
interface PoliceFeeBreakdown {
  baseFee: number;
  convenienceFee: number;
  totalFee: number;
}

// ─── CONSTANTS ──────────────────────────────────────────
const BASE_POLICE_CLEARANCE_FEE = 150.00; // Standard PNP National Clearance Fee

// ─── LOGIC FUNCTIONS ─────────────────────────────────────

/**
 * Calculates total PNP Clearance cost based on the chosen payment portal convenience fee.
 */
function calculatePoliceFee(convenienceFee: number): PoliceFeeBreakdown {
  const safeConvenience = isNaN(convenienceFee) || convenienceFee < 0 ? 30.00 : convenienceFee;
  const totalFee = BASE_POLICE_CLEARANCE_FEE + safeConvenience;

  return {
    baseFee: BASE_POLICE_CLEARANCE_FEE,
    convenienceFee: safeConvenience,
    totalFee
  };
}

// ─── DOM EVENT HANDLERS ──────────────────────────────────

function setupPoliceCalculator(): void {
  const paymentSelect = document.getElementById('paymentMethod') as HTMLSelectElement | null;
  const calcBtn = document.getElementById('btnCalcPolice') as HTMLButtonElement | null;
  const resultDiv = document.getElementById('policeFeeResult') as HTMLDivElement | null;
  const totalText = document.getElementById('policeTotalText') as HTMLSpanElement | null;
  const breakdownText = document.getElementById('policeBreakdownText') as HTMLParagraphElement | null;

  if (!calcBtn || !paymentSelect || !resultDiv || !totalText || !breakdownText) return;

  calcBtn.addEventListener('click', () => {
    const convenienceFee = parseFloat(paymentSelect.value);
    const result = calculatePoliceFee(convenienceFee);

    totalText.textContent = `₱${result.totalFee.toFixed(2)}`;
    breakdownText.textContent = `Base Clearance Fee: ₱${result.baseFee.toFixed(2)} | Convenience Fee: ₱${result.convenienceFee.toFixed(2)}`;
    
    resultDiv.style.display = 'block';
  });
}

function setupPoliceChecklistTracker(): void {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('.police-req-item');
  const progressText = document.getElementById('policeProgress') as HTMLDivElement | null;

  if (!checkboxes.length || !progressText) return;

  const updateProgress = (): void => {
    let checkedCount = 0;
    checkboxes.forEach(cb => {
      if (cb.checked) checkedCount++;
    });

    progressText.textContent = `Progress: ${checkedCount} / ${checkboxes.length} completed`;
    
    if (checkedCount === checkboxes.length) {
      progressText.style.color = '#1a315d';
      progressText.textContent = `✅ Ready! All requirements & vouchers prepared.`;
    } else {
      progressText.style.color = '#2b4d8c';
    }
  };

  checkboxes.forEach(cb => cb.addEventListener('change', updateProgress));
}

// ─── INITIALIZATION ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupPoliceCalculator();
  setupPoliceChecklistTracker();
});
