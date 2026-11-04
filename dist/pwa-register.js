if('serviceWorker' in navigator){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register('/pwa-worker.js').catch(error=>console.warn('App installation setup failed.',error));
 });
}
