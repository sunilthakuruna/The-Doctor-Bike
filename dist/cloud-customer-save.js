// Cloud sync bridge for the first migrated module.
document.addEventListener('submit', async event => {
  const form = event.target;
  // A form control named "id" shadows form.id with the input element.
  // Read the HTML attribute so customer ID fields cannot disable cloud saving.
  if (form?.getAttribute('id') !== 'recordForm' || typeof editing === 'undefined' || editing?.key !== 'customers') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (editing.id) {
    toast('Editing cloud customers is not available yet. No changes were saved.');
    return;
  }
  const values = Object.fromEntries(new FormData(form));
  if (db.customers.some(customer => customer.id === values.id)) {
    toast('This customer ID already exists. Choose a unique ID.');
    return;
  }
  const button = form.querySelector('[type="submit"]');
  if (button) button.disabled = true;
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values)
      });
      const result = await response.json();
      if (!response.ok || !result.data?.id) throw new Error(result.error || `HTTP ${response.status}`);
      db.customers.push({ ...result.data, alt: result.data.alt_mobile || '' });
      save();
      closeModal();
      render();
      toast('Customer saved to Cloudflare D1.');
    } catch (error) {
      console.warn('Cloud customer save unavailable', error);
      toast('Customer was not saved to the cloud. Please try again.');
      if (button) button.disabled = false;
    }
}, true);
