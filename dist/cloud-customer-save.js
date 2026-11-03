// Cloud sync bridge for the first migrated module.
document.addEventListener('submit', event => {
  if (event.target?.id !== 'recordForm') return;
  // Identify the customer form by its field, not by the modal title. The
  // title can vary between Add/Edit/related-record flows and previously
  // prevented the D1 request from being sent at all.
  if (!event.target.querySelector('[name="customerName"]')) return;
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
