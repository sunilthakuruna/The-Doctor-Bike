if('serviceWorker' in navigator){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register('/pwa-worker.js').catch(error=>console.warn('App installation setup failed.',error));
 });
}

const connectionNotice=document.createElement('div');
connectionNotice.className='notice';
connectionNotice.setAttribute('role','status');
connectionNotice.textContent='You are offline. Supported changes are saved on this device and queued for sync. Keep this browser data until sync completes.';
document.querySelector('#content')?.before(connectionNotice);

function updateConnectionNotice(){
 connectionNotice.hidden=navigator.onLine!==false;
}
window.addEventListener('online',updateConnectionNotice);
window.addEventListener('offline',updateConnectionNotice);
updateConnectionNotice();
