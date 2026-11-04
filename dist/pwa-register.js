if('serviceWorker' in navigator){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register('/pwa-worker.js').catch(error=>console.warn('App installation setup failed.',error));
 });
}

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
