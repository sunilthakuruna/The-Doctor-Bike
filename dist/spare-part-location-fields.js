/* Spare Parts Master: classify each part and record its exact rack/shelf location. */
(function(){
  const partSchema=schemas?.parts;
  if(partSchema&&!partSchema.some(f=>f.key==='partType')){
    const brandIndex=partSchema.findIndex(f=>f.key==='brand');
    partSchema.splice(brandIndex<0?2:brandIndex+1,0,{key:'partType',label:'Part Type'});
  }
  const previousBasicPage=basicPage;
  basicPage=function(key){
    if(key!=='parts')return previousBasicPage(key);
    const parts=db.parts.filter(p=>matches({...p,vendors:partVendorNames(p.id)})).filter(p=>!filter||stockStatus(p)===filter);
    return summary([['TOTAL SPARE PARTS',db.parts.length],['MAIN STOCK VALUE',money(db.parts.reduce((sum,p)=>sum+stock(p.id)*p.purchase,0))],['LOW STOCK ITEMS',db.parts.filter(p=>stockStatus(p)==='Low Stock').length],['OUT OF STOCK',db.parts.filter(p=>stock(p.id)<=0).length]])+
      toolbar('Add Spare Part',`<select id="stockFilter" aria-label="Stock status"><option value="">All Stock Status</option>${opts(['In Stock','Low Stock','Out of Stock'],filter)}</select>`)+
      table(['Part Code / SKU','Part Name','HSN Code','Category','Part Brand','Part Type','Vehicle Make','Vehicle Model','Vendor Name(s)','Purchase Date','Purchase Price','Selling Price','Opening Stock','Purchase','Transfer In','Sales / Used','Main Stock','Status','Rack / Shelf Number','Actions'],parts.map(p=>[
        esc(p.id),`<strong>${esc(p.name)}</strong>`,esc(p.hsn||'—'),esc(p.category),esc(p.brand||'—'),esc(p.partType||'—'),esc(p.vehicleMake||'—'),esc(p.vehicleModel||'—'),esc(partVendorNames(p.id)||'—'),esc(partPurchaseDate(p)||'—'),money(p.purchase),money(p.price),esc(p.opening||0)+' '+esc(p.unit),'+'+partsPurchaseQty(p.id)+' '+esc(p.unit),'+'+partsTransferInQty(p.id)+' '+esc(p.unit),'-'+partsUsedQty(p.id)+' '+esc(p.unit),stock(p.id)+' '+esc(p.unit),badge(stockStatus(p)),esc(p.rack||'—'),actions(key,p.id)
      ]));
  };
  render();
})();
