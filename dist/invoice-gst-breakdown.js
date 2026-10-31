(function () {
  'use strict';
  const originalInvoice = invoice;
  function gstRows(record) {
    const services = (record.serviceLines || []).map(line => ({
      group: 'Service / Labour', name: line.name || name('services', line.service),
      base: Number(line.charge || 0), rate: record.invoiceType === 'non-gst' ? 0 : Number(line.gst ?? line.tax ?? record.tax ?? 0)
    }));
    const parts = (record.partLines || []).map(line => ({
      group: 'Spare Part', name: line.name || name('parts', line.part),
      base: Number(line.qty || 0) * Number(line.price || 0), rate: record.invoiceType === 'non-gst' ? 0 : Number(line.gst || 0)
    }));
    return [...services, ...parts].map(row => ({ ...row, tax: row.base * row.rate / 100 }));
  }
  invoice = function (key, id) {
    originalInvoice(key, id);
    const record = find(key, id), sheet = document.querySelector('#modalBody .invoice');
    if (!record || !sheet || sheet.querySelector('[data-invoice-gst-breakdown]')) return;
    const rows = gstRows(record);
    const serviceTax = rows.filter(row => row.group === 'Service / Labour').reduce((sum, row) => sum + row.tax, 0);
    const partTax = rows.filter(row => row.group === 'Spare Part').reduce((sum, row) => sum + row.tax, 0);
    const section = document.createElement('section');
    section.dataset.invoiceGstBreakdown = 'true';
    section.className = 'invoiceGstBreakdown';
    section.innerHTML = '<h4>GST Details</h4>' +
      '<table><thead><tr><th>Category</th><th>GST rate</th><th>GST amount</th></tr></thead><tbody>' +
      rows.map(row => `<tr><td>${esc(row.group + ' — ' + row.name)}</td><td>${row.rate.toFixed(2)}%</td><td>${money(row.tax)}</td></tr>`).join('') +
      `<tr class="invoiceGstSubtotal"><td>Service / Labour GST total</td><td>—</td><td>${money(serviceTax)}</td></tr>` +
      `<tr class="invoiceGstSubtotal"><td>Spare Parts GST total</td><td>—</td><td>${money(partTax)}</td></tr>` +
      '</tbody></table>';
    const total = sheet.querySelector('.invoicetotal');
    (total || sheet.lastElementChild)?.before(section);
  };
}());
