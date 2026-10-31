/* Parts stock movement columns, matching the demo's stock breakdown. */
function partsPurchaseQty(partId){return round((db.purchases||[]).filter(p=>p.status!=='Cancelled'&&(p.stockLocation||'main')==='main').reduce((sum,p)=>sum+(p.partLines||[]).filter(line=>line.part===partId).reduce((n,line)=>n+Number(line.qty||0),0),0))}
function partsUsedQty(partId){return round([...(db.jobs||[]),...(db.sales||[])].filter(bill=>bill.status!=='Cancelled').reduce((sum,bill)=>sum+(bill.partLines||[]).filter(line=>line.part===partId).reduce((n,line)=>n+Number(line.qty||0),0),0))}
function partsTransferInQty(partId){return round((db.stockMovements||[]).filter(move=>move.kind==='transfer'&&move.part===partId).reduce((sum,move)=>sum+Number(move.qty||0),0))}
const basicPageBeforeStockMovementColumns=basicPage;
basicPage=function(key){
 if(key!=='parts')return basicPageBeforeStockMovementColumns(key);
 const parts=db.parts.filter(p=>matches({...p,vendors:partVendorNames(p.id)})).filter(p=>!filter||stockStatus(p)===filter);
 return summary([['TOTAL SPARE PARTS',db.parts.length],['MAIN STOCK VALUE',money(db.parts.reduce((sum,p)=>sum+stock(p.id)*p.purchase,0))],['LOW STOCK ITEMS',db.parts.filter(p=>stockStatus(p)==='Low Stock').length],['OUT OF STOCK',db.parts.filter(p=>stock(p.id)<=0).length]])+
 toolbar('Add Spare Part',`<select id="stockFilter" aria-label="Stock status"><option value="">All Stock Status</option>${opts(['In Stock','Low Stock','Out of Stock'],filter)}</select>`)+
 table(['Part Code / SKU','Part Name','HSN Code','Category','Part Brand','Vehicle Make','Vehicle Model','Vendor Name(s)','Purchase Date','Purchase Price','Selling Price','Opening Stock','Purchase','Transfer In','Sales / Used','Main Stock','Status','Rack No.','Actions'],parts.map(p=>[
 esc(p.id),`<strong>${esc(p.name)}</strong>`,esc(p.hsn||'—'),esc(p.category),esc(p.brand||'—'),esc(p.vehicleMake||'—'),esc(p.vehicleModel||'—'),partVendorMarkup(p.id),esc(partPurchaseDate(p)||'—'),money(p.purchase),money(p.price),esc(p.opening||0)+' '+esc(p.unit), '+'+partsPurchaseQty(p.id)+' '+esc(p.unit), '+'+partsTransferInQty(p.id)+' '+esc(p.unit), '-'+partsUsedQty(p.id)+' '+esc(p.unit), stock(p.id)+' '+esc(p.unit),badge(stockStatus(p)),esc(p.rack||'—'),actions(key,p.id)
 ]));
};

render();

