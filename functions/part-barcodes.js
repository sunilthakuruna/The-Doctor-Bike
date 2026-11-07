// Inventory is saved with optimistic version checks, so barcode uniqueness is atomic.
export function validatePartBarcodes(current,incoming,{requireHsn=true}={}){
 const seen=new Map(),previous=new Map((current.parts||[]).map(part=>[part.id,part]));
 const identity=['name','brand','vehicleMake','vehicleModel','partType','barcode','hsn','category'];
 for(const part of incoming.parts||[]){
  if(part.barcode!==undefined&&typeof part.barcode!=='string')throw Error('Manufacturer barcode must be text to preserve leading zeroes.');
  const code=String(part.barcode||'').trim();
  if(code.length>128||/[\x00-\x1f\x7f]/.test(code))throw Error('Enter a valid manufacturer barcode of up to 128 characters.');
  if(code){
   if(seen.has(code)&&seen.get(code)!==part.id)throw Error('This manufacturer barcode is already assigned to another spare part.');
   seen.set(code,part.id);
  }
  const prior=previous.get(part.id),changed=!prior||identity.some(key=>String(part[key]??'').trim()!==String(prior[key]??'').trim());
  // Existing legacy parts can still be consumed by bills without rewriting their master.
  if(requireHsn&&changed&&!String(part.hsn||'').trim())throw Error('Enter the HSN code when adding or editing a spare part.');
 }
}
