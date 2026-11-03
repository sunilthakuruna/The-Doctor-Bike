// Cloud sync bridge for the first migrated module.
document.addEventListener('submit', async event => {
  const form = event.target;
  // A form control named "id" shadows form.id with the input element.
  // Read the HTML attribute so customer ID fields cannot disable cloud saving.
  if (form?.getAttribute('id') !== 'recordForm' || typeof editing === 'undefined' || editing?.key !== 'customers') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const editId = editing.id;
  const values = Object.fromEntries(new FormData(form));
  if (editId) values.id = editId;
  if (!editId && db.customers.some(customer => customer.id === values.id)) {
    toast('This customer ID already exists. Choose a unique ID.');
    return;
  }
  const button = form.querySelector('[type="submit"]');
  if (button) button.disabled = true;
    try {
      const response = await fetch('/api/customers', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values)
      });
      const result = await response.json();
      if (!response.ok || !result.data?.id) throw new Error(result.error || `HTTP ${response.status}`);
      const customer = { ...result.data, alt: result.data.alt_mobile || '' };
      const index = db.customers.findIndex(item => item.id === customer.id);
      if (index >= 0) db.customers[index] = { ...db.customers[index], ...customer };
      else db.customers.push(customer);
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

const deleteRecordBeforeCloudCustomers = deleteRecord;
deleteRecord = function(key, id) {
  deleteRecordBeforeCloudCustomers(key, id);
  if (key !== 'customers') return;
  const button = document.querySelector('#modalBody [data-action="confirmDelete"]');
  if (!button) return;
  button.onclick = async () => {
    button.disabled = true;
    try {
      const response = await fetch('/api/customers?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      db.customers = db.customers.filter(customer => customer.id !== id);
      save();
      closeModal();
      render();
      toast('Customer deleted from Cloudflare D1.');
    } catch (error) {
      console.warn('Cloud customer deletion failed', error);
      toast('Customer could not be deleted from the cloud. Please try again.');
      button.disabled = false;
    }
  };
};
