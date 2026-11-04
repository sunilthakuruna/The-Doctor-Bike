import {snapshotHandler} from '../snapshot-store.js';

const text=value=>typeof value==='string'&&value.length<=1000;
const lists=value=>value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.entries(value).every(([name,options])=>text(name)&&Array.isArray(options)&&options.every(text));
const vehicleModels=value=>Array.isArray(value)&&value.every(model=>model&&text(model.make)&&text(model.model));

export const onRequest=snapshotHandler('lists',['lists','vehicleModels'],{lists,vehicleModels});
