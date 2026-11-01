'use strict';
/* Location snapshots and counts are kept with the verification sheet. */
{
  const originalNewSheet = newStockSheet;
  newStockSheet = function () {
    const sheet = originalNewSheet();
    sheet.lines.forEach(line => {
      line.mainSystem = typeof locationStock === 'function' ? Number(locationStock(line.part, 'main')) : Number(line.system);
      line.godownSystem = typeof locationStock === 'function' ? Number(locationStock(line.part, 'godown')) : 0;
      line.mainPhysical = null; line.godownPhysical = null;
      const part = find('parts', line.part) || {};
      line.brand = part.brand || ''; line.partType = part.partType || part.type || '';
    });
    return sheet;
  };
  const blank = value => value === null || value === undefined || value === '';
  const variance = (line, location) => blank(line[location+'Physical']) || blank(line[location+'System']) ? null : round(Number(line[location+'Physical']) - Number(line[location+'System']));
  const description = value => value === null ? 'Not counted' : value < 0 ? 'Short ' + Math.abs(value) : value > 0 ? 'Excess ' + value : 'Matched';
  stockReportLines = sheet => sheet.lines.filter(l => matches(l)).filter(l => {
    const values = [variance(l,'main'), variance(l,'godown')];
    if (stockVarianceFilter === 'all') return true;
    if (stockVarianceFilter === 'uncounted') return values.some(v => v === null);
    if (stockVarianceFilter === 'shortage') return values.some(v => v !== null && v < 0);
    if (stockVarianceFilter === 'excess') return values.some(v => v !== null && v > 0);
    return values.some(v => v !== null && v !== 0);
  });
  stockCountSummary = sheet => {
    let counted = 0, shortage = 0, excess = 0;
    sheet.lines.forEach(l => { const vs = [variance(l,'main'), variance(l,'godown')]; if (vs.every(v => v !== null)) counted++; vs.forEach(v => { if (v < 0) shortage -= v * l.cost; if (v > 0) excess += v * l.cost; }); });
    return summary([['PARTS IN SHEET',sheet.lines.length],['FULLY COUNTED / REMAINING',counted+' / '+(sheet.lines.length-counted)],['SHORTAGE VALUE (AT COST)',money(shortage)],['EXCESS VALUE (AT COST)',money(excess)]]);
  };
  stockCountTable = (sheet, editable) => table(['Part / SKU','Part Name','Vehicle Make','Vehicle Model','Brand Name','Part Type','Rack','Unit','Main Stock','Main Physical','Main Shortage / Excess','Main Value Difference','Godown Stock','Godown Physical','Godown Shortage / Excess','Godown Value Difference','Count Note'], stockReportLines(sheet).map(l => {
    const count = loc => editable && !blank(l[loc+'System']) ? `<input type="number" min="0" step="1" data-location-physical="${loc}" data-part="${esc(l.part)}" aria-label="${loc} physical count for ${esc(l.name)}" value="${blank(l[loc+'Physical'])?'':esc(l[loc+'Physical'])}" placeholder="Not counted">` : blank(l[loc+'Physical']) ? 'Not counted' : esc(l[loc+'Physical']);
    const cells = loc => { const v = variance(l,loc); return [blank(l[loc+'System'])?'Unavailable':l[loc+'System'],count(loc),`<span data-location-result="${loc}" data-part="${esc(l.part)}">${description(v)}</span>`,`<span data-location-value="${loc}" data-part="${esc(l.part)}">${v===null?'—':money(v*l.cost)}</span>`]; };
    return [esc(l.part),esc(l.name),esc(l.make||'—'),esc(l.model||'—'),esc(l.brand||'—'),esc(l.partType||'—'),esc(l.rack||'—'),esc(l.unit),...cells('main'),...cells('godown'),editable?`<input data-count-note="${esc(l.part)}" value="${esc(l.note||'')}" maxlength="300" aria-label="Count note">`:esc(l.note||'—')];
  }));
  document.addEventListener('input', e => {
    const input=e.target.closest('[data-location-physical]'); if (!input || page!=='report-stock' || stockSheetView) return;
    const line=stockReportSheet().lines.find(l=>l.part===input.dataset.part); if(!line)return;
    const loc=input.dataset.locationPhysical, value=input.value;
    if(value!=='' && (!Number.isInteger(Number(value)) || Number(value)<0)){input.setCustomValidity('Enter a non-negative whole number');return;}
    input.setCustomValidity(''); line[loc+'Physical']=value===''?null:Number(value);
    line.physical = blank(line.mainPhysical) && blank(line.godownPhysical) ? null : (blank(line.mainPhysical)?0:Number(line.mainPhysical))+(blank(line.godownPhysical)?0:Number(line.godownPhysical));
    const v=variance(line,loc), row=input.closest('tr');
    row.querySelector(`[data-location-result="${loc}"]`).textContent=description(v);
    row.querySelector(`[data-location-value="${loc}"]`).textContent=v===null?'—':money(v*line.cost);
    document.querySelector('#stockCountSummary').innerHTML=stockCountSummary(stockReportSheet());
  },true);
  const previousRender=render;
  render=function(){ previousRender(); if(page!=='report-stock')return;
    const exportButton=document.querySelector('#exportStockCount');
    if(exportButton) exportButton.onclick=()=>{const sheet=stockReportSheet();const rows=[['Count ID','Snapshot Time','Part / SKU','Part Name','Make','Model','Brand','Part Type','Rack','Unit','Main Stock','Main Physical','Main Difference','Main Value Difference','Godown Stock','Godown Physical','Godown Difference','Godown Value Difference','Note'],...stockReportLines(sheet).map(l=>{const m=variance(l,'main'),g=variance(l,'godown');return [sheet.id,sheet.asOf,l.part,l.name,l.make,l.model,l.brand,l.partType,l.rack,l.unit,l.mainSystem,l.mainPhysical,m,m===null?'':round(m*l.cost),l.godownSystem,l.godownPhysical,g,g===null?'':round(g*l.cost),l.note]})]; download('\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),'BIKE-DOCTOR-stock-count-'+today()+'.csv','text/csv;charset=utf-8');};
  };
  if (stockSheet && stockSheet.lines.every(l => l.physical === null && l.mainSystem === undefined)) stockSheet = newStockSheet();
  if(page==='report-stock') render();
}
