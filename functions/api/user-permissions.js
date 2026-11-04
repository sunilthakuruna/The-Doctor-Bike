import {snapshotHandler} from '../snapshot-store.js';

const fields=new Set(['id','username','name','role','status','permissions','actionRestrictions']);
const text=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const permissionMap=value=>value===undefined||(value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.values(value).every(actions=>actions&&typeof actions==='object'&&!Array.isArray(actions)&&
 Object.values(actions).every(allowed=>typeof allowed==='boolean')));
const users=value=>Array.isArray(value)&&value.length<=500&&
 value.every(user=>user&&Object.keys(user).every(key=>fields.has(key))&&
  [user.id,user.username,user.name,user.role,user.status].every(text)&&
  permissionMap(user.permissions)&&permissionMap(user.actionRestrictions))&&
 new Set(value.map(user=>user.id)).size===value.length;

export const onRequest=snapshotHandler('user_permissions',['users'],{users});
