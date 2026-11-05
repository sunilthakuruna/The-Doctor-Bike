const encoder=new TextEncoder();
export const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export const digest=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
export async function hashPassword(password,salt){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:encoder.encode(salt)},key,256));
}
export function publicUser(user){return {id:user.id,username:user.username,name:user.name,role:user.role,status:user.status,permissions:JSON.parse(user.permissions),actionRestrictions:JSON.parse(user.action_restrictions)}}
export async function identity(request,DB){
 const token=request.headers.get('cookie')?.split(';').map(value=>value.trim()).find(value=>value.startsWith('__Host-app='))?.slice(11);
 if(!token)return null;
 return DB.prepare('SELECT u.* FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND s.revoked_at IS NULL AND s.credential_version=u.credential_version AND u.status=?').bind(await digest(token),Date.now(),'Active').first();
}
