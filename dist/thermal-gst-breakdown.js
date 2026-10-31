(function () {
  'use strict';
  const originalThermalReceiptMarkup = thermalReceiptMarkup;
  thermalReceiptMarkup = function (key, id, width) {
    const html = originalThermalReceiptMarkup(key, id, width);
    const record = find(key, id);
    if (!record || !html || html.includes('thermalGstBreakdown')) return html;
    const rows = [
      ...(record.serviceLines || []).map(line => ({ group: 'Service / Labour', name: line.name || name('services', line.service), base: Number(line.charge || 0), rate: record.invoiceType === 'non-gst' ? 0 : Number(line.gst ?? line.tax ?? record.tax ?? 0) })),
      ...(record.partLines || []).map(line => ({ group: 'Spare Part', name: line.name || name('parts', line.part), base: Number(line.qty || 0) * Number(line.price || 0), rate: record.invoiceType === 'non-gst' ? 0 : Number(line.gst || 0) }))
    ];
    const serviceTax = rows.filter(row => row.group === 'Service / Labour').reduce((sum, row) => sum + row.base * row.rate / 100, 0);
    const partTax = rows.filter(row => row.group === 'Spare Part').reduce((sum, row) => sum + row.base * row.rate / 100, 0);
    const details = rows.map(row => `<div><dt>${esc(row.group)}: ${esc(row.name)}</dt><dd>${row.rate.toFixed(2)}% · ${money(row.base * row.rate / 100)}</dd></div>`).join('');
    const block = `<section class="thermalGstBreakdown"><hr><strong>GST DETAILS</strong><dl>${details}<div><dt>Service / Labour GST total</dt><dd>${money(serviceTax)}</dd></div><div><dt>Spare Parts GST total</dt><dd>${money(partTax)}</dd></div></dl></section>`;
    return html.replace('</article>', block + '</article>');
  };
}());
