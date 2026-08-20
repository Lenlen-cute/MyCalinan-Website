// ─── TYPINGS & INTERFACES ────────────────────────────────
interface CedulaFeeBreakdown {
  basicFee: number;
  additionalFee: number;
  totalFee: number;
}

// ─── CONSTANTS ──────────────────────────────────────────
const BASIC_CEDULA_FEE = 5.00; // Standard Philippine Basic CTC Fee

// ─── LOGIC FUNCTIONS ─────────────────────────────────────

/**
 * Calculates the total CTC (Cedula) fee based on gross income.
 * Formula: Basic ₱5.00 + ₱1.00 per every ₱1,000 gross earnings.
 */
function calculateFee(grossIncome: number): CedulaFeeBreakdown {
  if (isNaN(grossIncome) || grossIncome < 0) {
    return { basicFee: BASIC_CEDULA_FEE, additionalFee: 0, totalFee: BASIC_CEDULA_FEE };
  }

  // ₱1 for every ₱1,000 of gross income
  const additionalFee = Math.floor(grossIncome / 1000) * 1.00;
  const totalFee = BASIC_CEDULA_FEE + additionalFee;

  return {
    basicFee: BASIC_CEDULA_FEE,
    additionalFee,
    totalFee
  };
}

// ─── DOM EVENT HANDLERS ──────────────────────────────────

function setupCalculator(): void {
  const incomeInput = document.getElementById('grossIncome') as HTMLInputElement | null;
  const calcBtn = document.getElementById('btnCalculate') as HTMLButtonElement | null;
  const resultDiv = document.getElementById('calcResult') as HTMLDivElement | null;
  const totalText = document.getElementById('totalFeeText') as HTMLSpanElement | null;
  const breakdownText = document.getElementById('feeBreakdownText') as HTMLParagraphElement | null;

  if (!calcBtn || !incomeInput || !resultDiv || !totalText || !breakdownText) return;

  calcBtn.addEventListener('click', () => {
    const rawValue = parseFloat(incomeInput.value);
    const result = calculateFee(rawValue);

    totalText.textContent = `₱${result.totalFee.toFixed(2)}`;
    breakdownText.textContent = `Basic: ₱${result.basicFee.toFixed(2)} | Additional (Gross Income): ₱${result.additionalFee.toFixed(2)}`;
    
    resultDiv.style.display = 'block';
  });
}

function setupChecklistTracker(): void {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('.req-item');
  const progressText = document.getElementById('checklistProgress') as HTMLDivElement | null;

  if (!checkboxes.length || !progressText) return;

  const updateProgress = (): void => {
    let checkedCount = 0;
    checkboxes.forEach(cb => {
      if (cb.checked) checkedCount++;
    });

    progressText.textContent = `Progress: ${checkedCount} / ${checkboxes.length} completed`;
    
    if (checkedCount === checkboxes.length) {
      progressText.style.color = '#1f4d33';
      progressText.textContent = `✅ Ready! All requirements completed.`;
    } else {
      progressText.style.color = '#2b6b45';
    }
  };

  checkboxes.forEach(cb => cb.addEventListener('change', updateProgress));
}

// ─── INITIALIZATION ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupCalculator();
  setupChecklistTracker();
});
