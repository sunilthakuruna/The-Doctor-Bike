import {snapshotHandler} from '../snapshot-store.js';

const settings=value=>value&&typeof value==='object'&&!Array.isArray(value)&&
 (value.name===undefined||(typeof value.name==='string'&&value.name.length<=200));

export const onRequest=snapshotHandler('business_settings',['settings'],{settings});
