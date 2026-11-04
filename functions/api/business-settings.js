import {snapshotHandler} from '../snapshot-store.js';

const settings=value=>value&&typeof value==='object'&&!Array.isArray(value)&&
 (value.name===undefined||(typeof value.name==='string'&&value.name.length<=200));

const invoiceTemplates=value=>Array.isArray(value)&&value.every(template=>
 template&&typeof template.id==='string'&&typeof template.name==='string'&&
 ['regular','thermal'].includes(template.mode));

export const onRequest=snapshotHandler('business_settings',['settings','invoiceTemplates'],{settings,invoiceTemplates});
