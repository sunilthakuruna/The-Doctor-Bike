import {snapshotHandler} from '../snapshot-store.js';
export const onRequest=snapshotHandler('inventory',['parts','purchases','stockMovements','jobs','sales','receipts','appointments','trash']);
