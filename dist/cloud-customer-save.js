// Cloud sync bridge for the first migrated module.
document.addEventListener('submit', event => {
  if (event.target?.id !== 'recordForm') return;
  const title = document.querySelector('#modalTitle')?.textContent?.trim() || '';
  if (!title.includes('Customer') || !title.startsWith('Add')) return;
  const values = Object.fromEntries(new FormData(event.target));
  // The customer form uses customerName, while the D1 API expects name.
  // Normalize it before posting so the API does not reject the save as missing.
  if (!values.name && values.customerName) values.name = values.customerName;
  setTimeout(async () => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`HTTP ${response.status}: ${detail}`);
      }
      if (typeof toast === 'function') toast('Customer saved to Cloudflare D1.');
    } catch (error) {
      console.warn('Cloud customer save unavailable', error);
      if (typeof toast === 'function') toast('Customer saved locally; cloud sync failed.');
    }
  }, 0);
}, true);
