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

let installPrompt;
const installButton=document.createElement('button');
installButton.type='button';
installButton.className='btn secondary small';
installButton.textContent='Install Bike Doctor';
installButton.hidden=true;
document.querySelector('#workspace > header')?.append(installButton);

window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 installPrompt=event;
 installButton.hidden=false;
});

installButton.addEventListener('click',async()=>{
 const prompt=installPrompt;
 if(!prompt)return;
 installPrompt=null;
 installButton.hidden=true;
 try{await prompt.prompt()}
 catch(error){console.warn('Bike Doctor installation prompt failed.',error)}
});

window.addEventListener('appinstalled',()=>{
 installPrompt=null;
 installButton.hidden=true;
});
