'use strict';
/* One place for shared AMC plans, linked contracts and expiry reminders. */
(function(){
  const operations=groups.find(group=>group[0]==='OPERATIONS')?.[1];
  const oldReminderIndex=operations?.findIndex(item=>item[0]==='amc-reminders');
  if(oldReminderIndex>=0)operations.splice(oldReminderIndex,1);
  const master=groups.find(group=>group[0]==='MASTER MANAGEMENT')?.[1];
  const module=master?.find(item=>item[0]==='amc-plans');
  if(module)module[1]='AMC Management / Reminder';
  const serviceReminderIndex=operations?.findIndex(item=>item[0]==='service-reminders');
  if(serviceReminderIndex>=0&&master){
    const [serviceReminder]=operations.splice(serviceReminderIndex,1);
    const amcIndex=master.findIndex(item=>item[0]==='amc-plans');
    master.splice(amcIndex>=0?amcIndex+1:master.length,0,serviceReminder);
  }
  titles['amc-plans']='AMC Management / Reminder';
  delete titles['amc-reminders'];

  const serviceRemindersBeforeAmcManagement=serviceRemindersPage;
  serviceRemindersPage=function(){
    const savedView=reminderView;
    reminderView='service';
    const html=serviceRemindersBeforeAmcManagement();
    reminderView=savedView;
    return html.replace(/<div class="tabs reminderTabs">[\s\S]*?<\/div>/,'');
  };

  const plansPageBeforeManagement=amcPlansPage;
  function reminderStatus(entry){
    const days=amcExpiryDays(entry);
    return days===null?'Expiry date missing':days<0?Math.abs(days)+' days expired':days===0?'Expires today':days+' days remaining';
  }
  function exportAmcManagement(){
    const safe=value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'};
    const rows=[['AMC PLAN MASTER'],['Plan Name','Default Validity (Months)','Coverage / Notes','Linked Customers','Linked Vehicles']];
    for(const plan of db.amcPlans||[]){const usage=amcPlanUsage(plan);rows.push([plan.name,plan.months,plan.coverage||'',usage.linkedCustomers,usage.linkedVehicles])}
    rows.push([],['AMC EXPIRY REMINDERS'],['Customer','Vehicle','AMC Plan','Valid From','Valid Until','Status','Reminder Status','Last Reminder Recorded']);
    for(const entry of amcContractEntries()){const last=contractReminderLog(entry);rows.push([entry.name,entry.vehicleNumbers||'',entry.amcType,entry.amcStart||'',entry.amcExpiry||'',customerAmcStatus(entry),reminderStatus(entry),last?uiDateTime(last.at):''])}
    download('\ufeff'+rows.map(row=>row.map(safe).join(',')).join('\r\n'),'BIKE-DOCTOR-AMC-Management-'+today()+'.csv','text/csv;charset=utf-8');
    toast('AMC Management export downloaded');
  }
  function amcManagementReminderMarkup(){
    const entries=amcContractEntries().filter(matches).filter(entry=>{
      const days=amcExpiryDays(entry);
      return amcReminderFilter==='all'||amcReminderFilter==='due'&&days!==null&&days<=0||amcReminderFilter==='expired'&&days!==null&&days<0||amcReminderFilter==='today'&&days===0||amcReminderFilter==='upcoming'&&days!==null&&days>0&&days<=Number(amcReminderWindow)||amcReminderFilter==='incomplete'&&days===null;
    });
    return `<div class="toolbar"><select id="amcReminderFilter" aria-label="AMC reminder filter">${opts([{value:'due',label:'Expired & Today'},{value:'expired',label:'Expired'},{value:'today',label:'Expires Today'},{value:'upcoming',label:'Expiring Soon'},{value:'all',label:'All AMC Contracts'},{value:'incomplete',label:'Missing Expiry'}],amcReminderFilter)}</select><select id="amcReminderWindow" aria-label="AMC reminder window">${opts([{value:'7',label:'Next 7 Days'},{value:'30',label:'Next 30 Days'},{value:'90',label:'Next 90 Days'}],amcReminderWindow)}</select><button type="button" class="btn" data-amc-manage-add>Add / Edit Vehicle AMC</button><button type="button" class="btn secondary" data-amc-manage-export>Export Excel</button></div>`+table(['Customer','Vehicle','AMC Plan','Valid Until','Status','Reminder Status','Actions'],entries.map(entry=>{const days=amcExpiryDays(entry),last=contractReminderLog(entry),value=entry.contractKey+'|'+entry.contractId;return [esc(entry.name),esc(entry.vehicleNumbers||'—'),esc(entry.amcType),esc(entry.amcExpiry||'—'),badge(customerAmcStatus(entry)),`${esc(reminderStatus(entry))}${last?'<small>Last recorded: '+esc(uiDateTime(last.at))+'</small>':''}`,`<div class="rowactions"><button type="button" class="btn small extraAction green" data-amc-manage-message="${esc(value)}" ${days===null?'disabled':''}>${whatsappIcon()}</button><button type="button" class="btn small editButton" data-amc-manage-edit="${esc(value)}">${icon('edit')}</button><button type="button" class="btn small secondary" data-amc-manage-renew="${esc(value)}">Renew</button></div>`]}));
  }
  amcPlansPage=function(){
    return `<div class="amcManagementPage">${plansPageBeforeManagement()}<section class="panel"><div class="panelhead"><h2>AMC Expiry Reminders</h2></div><div class="panelbody"><p>Review expiry, prepare the WhatsApp reminder, and record it after it has been sent.</p>${amcManagementReminderMarkup()}</div></section></div>`;
  };

  function bindAmcManagement(){
    if(page!=='amc-plans')return;
    const reminderPanel=[...$$('.amcManagementPage .panel')].find(panel=>panel.querySelector('h2')?.textContent==='AMC Expiry Reminders');
    const reminderTable=reminderPanel?.querySelector('table');
    if(reminderTable){
      const header=[...reminderTable.querySelectorAll('thead th')].find(cell=>cell.textContent.trim()==='Actions');
      if(header){const cell=document.createElement('th');cell.textContent='Last Reminder Sent';header.before(cell)}
      for(const row of reminderTable.querySelectorAll('tbody tr')){
        const action=row.querySelector('[data-amc-manage-message]');
        if(!action)continue;
        const entry=amcContractByKey(action.dataset.amcManageMessage);
        const log=entry&&contractReminderLog(entry);
        const cell=document.createElement('td');cell.textContent=log?uiDateTime(log.at)+' (manual)':'—';
        const actionsCell=action.closest('td');actionsCell?.before(cell);
        const sent=document.createElement('button');sent.type='button';sent.className='btn small extraAction blue';sent.textContent='Mark Sent';sent.title='Record AMC reminder sent';sent.onclick=()=>performAmcAction('sent',action.dataset.amcManageMessage);actionsCell?.querySelector('.rowactions')?.append(sent);
      }
    }
    const filter=$('#amcReminderFilter'),windowSelect=$('#amcReminderWindow');
    if(filter)filter.onchange=event=>{amcReminderFilter=event.target.value;render()};
    if(windowSelect)windowSelect.onchange=event=>{amcReminderWindow=event.target.value;render()};
    for(const button of $$('[data-amc-manage-export]'))button.onclick=exportAmcManagement;
    for(const button of $$('[data-amc-manage-add]'))button.onclick=openReminderAmcRecord;
    for(const button of $$('[data-amc-manage-message]'))button.onclick=()=>performAmcAction('whatsapp',button.dataset.amcManageMessage);
    for(const button of $$('[data-amc-manage-edit]'))button.onclick=()=>performAmcAction('edit',button.dataset.amcManageEdit);
    for(const button of $$('[data-amc-manage-renew]'))button.onclick=()=>performAmcAction('renew',button.dataset.amcManageRenew);
  }
  const renderBeforeAmcManagement=render;
  render=function(){renderBeforeAmcManagement();bindAmcManagement()};
  const goBeforeAmcManagement=go;
  go=function(key){return goBeforeAmcManagement(key==='amc-reminders'?'amc-plans':key)};
  if(location.hash==='#amc-reminders'){page='amc-plans';history.replaceState(null,'','#amc-plans')}
  render();
})();
