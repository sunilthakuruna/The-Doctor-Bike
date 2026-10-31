/* Shared Vendor List for Purchase and Spare Parts forms. */
(function(){
  const clean=value=>String(value||'').trim().replace(/\s+/g,' ');
  const unique=values=>[...new Map(values.map(clean).filter(Boolean).map(value=>[value.toLocaleLowerCase(),value])).values()].sort((a,b)=>a.localeCompare(b));
  const existing=Array.isArray(db.lists?.Vendors)?db.lists.Vendors:[];
  const discovered=[...(db.purchases||[]).map(entry=>entry.supplier),...(db.parts||[]).map(part=>part.preferredVendor)];
  const vendors=unique([...existing,...discovered]);
  if(!db.lists)db.lists={};
  if(!Array.isArray(db.lists.Vendors)||vendors.length!==existing.length){db.lists.Vendors=vendors;save('Vendor list initialized from saved records')}
  const preferredVendor=(schemas.parts||[]).find(field=>field.key==='preferredVendor');
  if(preferredVendor)preferredVendor.options=()=>db.lists.Vendors||[];
})();
