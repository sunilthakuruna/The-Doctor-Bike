const offlinePage=`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bike Doctor is offline</title>
<main style="max-width:32rem;margin:15vh auto;padding:1.25rem;font:1rem system-ui;color:#17283b">
<h1>Bike Doctor is offline</h1>
<p>Reconnect to the internet to sign in and access your garage records.</p>
<a href="/">Try again</a>
</main></html>`;

const shellCache='bike-doctor-offline-shell-v2';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(shellCache);
 const response=await fetch('/index.html',{cache:'reload'});
 if(!response.ok)throw new Error('App shell unavailable');
 const html=await response.clone().text();
 const assets=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match=>new URL(match[1],self.location.origin))
  .filter(url=>url.origin===self.location.origin&&/\.(?:js|css|png|svg|ico|webmanifest)$/.test(url.pathname));
 await cache.addAll([...new Set(assets.map(url=>url.href))]);
 await cache.put('/index.html',response.clone());await cache.put('/',response);
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const {request}=event;
 const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode!=='navigate'&&!/\.(js|css|png|jpg|svg|ico|woff2?)(\?|$)/i.test(url.pathname))return;
 event.respondWith(fetch(request).then(async response=>{
  if(response.ok){const cache=await caches.open(shellCache);await cache.put(request,response.clone())}return response;
 }).catch(async()=> (await caches.match(request)) || (request.mode==='navigate'&&await caches.match('/')) || new Response(offlinePage,{
  status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}
 })));
});
