(function () {
  'use strict';
  function moneyValue(value) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(value) || 0);
  }
  function addAdvanceLine() {
    const body = document.querySelector('#modalBody');
    const totals = body?.querySelector('.jobBillingTotals');
    if (!totals || !body.querySelector('#advance')) return;
    let line = totals.querySelector('[data-advance-summary]');
    if (!line) {
      line = document.createElement('div');
      line.dataset.advanceSummary = 'true';
      line.className = 'advanceSummaryLine';
      const receipts = Array.from(totals.children).find(el => /Later receipts/i.test(el.textContent || ''));
      (receipts || totals.firstElementChild)?.before(line);
    }
    const nextValue = moneyValue(body.querySelector('#advance')?.value);
    if (line.textContent !== 'Advance payment' + nextValue) line.innerHTML = '<span>Advance payment</span><b>' + nextValue + '</b>';
  }
  const observer = new MutationObserver(addAdvanceLine);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('input', event => { if (event.target?.id === 'advance') addAdvanceLine(); });
  addAdvanceLine();
}());
