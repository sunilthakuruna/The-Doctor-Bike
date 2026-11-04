const offlinePage=`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bike Doctor is offline</title>
<main style="max-width:32rem;margin:15vh auto;padding:1.25rem;font:1rem system-ui;color:#17283b">
<h1>Bike Doctor is offline</h1>
<p>Reconnect to the internet to sign in and access your garage records.</p>
<a href="/">Try again</a>
</main></html>`;

self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const {request}=event;
 const url=new URL(request.url);
 if(request.method!=='GET'||request.mode!=='navigate'||url.origin!==self.location.origin||
    !['/','/index.html'].includes(url.pathname))return;
 event.respondWith(fetch(request).catch(()=>new Response(offlinePage,{
  status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}
 })));
});
