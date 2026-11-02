// Cloud sync bridge for the first migrated module.
document.addEventListener('submit', event => {
  if (event.target?.id !== 'recordForm') return;
  const title = document.querySelector('#modalTitle')?.textContent?.trim() || '';
  if (!title.startsWith('Add New Customer')) return;
  const values = Object.fromEntries(new FormData(event.target));
  setTimeout(async () => {
    if (!document.querySelector('#modal')?.hidden) return;
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
