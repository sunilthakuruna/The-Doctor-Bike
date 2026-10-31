(function () {
  'use strict';
  const configuredInputs = new WeakSet();
  function configure(root = document) {
    root.querySelectorAll('[data-partfield$="|qty"], [data-purchase-number$="|qty"]').forEach(input => {
      if (configuredInputs.has(input)) return;
      configuredInputs.add(input);
      input.type = 'number';
      input.step = '1';
      input.min = '1';
      input.inputMode = 'numeric';
      input.setAttribute('pattern', '[0-9]*');
      input.addEventListener('change', () => {
        const value = Math.max(1, Math.round(Number(input.value) || 1));
        input.value = String(value);
      }, { once: true });
    });
  }
  const observer = new MutationObserver(() => configure());
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('[data-partfield$="|qty"], [data-purchase-number$="|qty"]')) {
      const quantity = Math.max(1, Math.round(Number(input.value) || 1));
      input.value = String(quantity);
      const field = input.dataset.partfield || input.dataset.purchaseNumber;
      const index = Number(field?.split('|')[0]);
      if (Number.isInteger(index) && jobDraft?.record?.partLines?.[index]) {
        jobDraft.record.partLines[index].qty = quantity;
        updateBillTotals();
      }
    }
  }, true);
  const originalSaveBill = saveBill;
  saveBill = function (event) {
    if (jobDraft && (jobDraft.key === 'jobs' || jobDraft.key === 'sales' || jobDraft.key === 'purchases')) {
      const invalid = (jobDraft.record.partLines || []).some(line => !Number.isInteger(Number(line.qty)) || Number(line.qty) < 1);
      if (invalid) {
        event.preventDefault();
        toast('Part quantity must be a whole number (1, 2, 3…).');
        return;
      }
    }
    return originalSaveBill(event);
  };
  configure();
}());
