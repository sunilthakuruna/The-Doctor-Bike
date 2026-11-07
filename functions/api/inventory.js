import {snapshotHandler} from '../snapshot-store.js';
import {inventoryPolicy} from '../inventory-permissions.js';
const jobs=records=>Array.isArray(records)&&records.every(record=>record&&
 (record.miscellaneousLines===undefined||(Array.isArray(record.miscellaneousLines)&&record.miscellaneousLines.length<=500&&record.miscellaneousLines.every(line=>
  line&&typeof line.name==='string'&&line.name.trim().length>0&&line.name.length<=500&&Number.isSafeInteger(line.qty)&&line.qty>=1&&typeof line.price==='number'&&Number.isFinite(line.price)&&line.price>=0&&Number.isFinite(line.qty*line.price)))));
export const onRequest=snapshotHandler('inventory',['parts','purchases','stockMovements','jobs','sales','receipts','appointments','trash'],{jobs},inventoryPolicy);
