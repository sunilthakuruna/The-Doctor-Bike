import {snapshotHandler} from '../snapshot-store.js';

const stockCounts=value=>Array.isArray(value)&&value.every(sheet=>
 sheet&&typeof sheet.id==='string'&&Array.isArray(sheet.lines));

export const onRequest=snapshotHandler('stock_counts',['stockCounts'],{stockCounts});
