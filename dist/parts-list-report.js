/* Current spare-parts inventory report under Finance & Reports. */
(function(){
  if(!reports.some(item=>item[0]==='report-parts-list'))reports.push(['report-parts-list','Existing Spare Parts List']);
  titles['report-parts-list']='Existing Spare Parts List Report';
  const reportPageBeforePartsList=reportPage;
  reportPage=function(){
    if(page!=='report-parts-list')return reportPageBeforePartsList();
    const rows=(db.parts||[]).filter(part=>matches({...part,stock:stock(part.id),vendor:typeof partVendorNames==='function'?partVendorNames(part.id):''}));
    const currentValue=rows.reduce((sum,part)=>sum+Number(stock(part.id)||0)*Number(part.purchase||0),0);
    const lowStock=rows.filter(part=>stockStatus(part)==='Low Stock').length;
    const outOfStock=rows.filter(part=>stock(part.id)<=0).length;
    return `<div class="intro"><h2>Existing Spare Parts List Report</h2><p>Current stock position, prices, vendors and storage details for every spare part.</p></div>`+
      summary([['TOTAL SPARE PARTS',rows.length],['CURRENT STOCK VALUE',money(currentValue)],['LOW STOCK ITEMS',lowStock],['OUT OF STOCK',outOfStock]])+
      `<div class="toolbar"><input id="search" class="search" type="search" inputmode="search" placeholder="Search part, code, vendor or category..." aria-label="Search spare parts report" value="${esc(search)}"><span class="spacer"></span><button type="button" class="btn exportButton" data-action="export">${icon('download')}Export Excel</button></div>`+
      table(['Part Code / SKU','Part Name','Category','Brand','Vendor Name(s)','HSN Code','Purchase Price','Selling Price','Existing Stock','Minimum Stock','Stock Status','Rack No.'],rows.map(part=>[esc(part.id),`<strong>${esc(part.name)}</strong>`,esc(part.category||'—'),esc(part.brand||'—'),typeof partVendorMarkup==='function'?partVendorMarkup(part.id):esc(typeof partVendorNames==='function'?partVendorNames(part.id):'—'),esc(part.hsn||'—'),money(part.purchase),money(part.price),`${stock(part.id)} ${esc(part.unit||'')}`,`${esc(part.min||0)} ${esc(part.unit||'')}`,badge(stockStatus(part)),esc(part.rack||'—')]));
  };
  nav();
})();
