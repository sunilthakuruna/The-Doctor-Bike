/* Central in-app notification centre for reminders, pending work and critical alerts. */
(function(){
  const day=value=>value?Math.round((Date.parse(value+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000):null;
  const notice=(level,title,detail,target)=>({level,title,detail,target});
  const sentToday=log=>{if(!log?.at)return false;const date=new Date(log.at);if(Number.isNaN(date.getTime()))return false;const now=new Date();return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth()&&date.getDate()===now.getDate()};
  function items(){
    const list=[];
    const openJobs=(db.jobs||[]).filter(job=>!['Completed','Delivered','Cancelled'].includes(job.status));
    if(openJobs.length)list.push(notice('action','Pending job cards',`${openJobs.length} job card${openJobs.length===1?' is':'s are'} still open.`, 'jobs'));
    const customerDues=[...(db.jobs||[]),...(db.sales||[])].filter(bill=>bill.status!=='Cancelled'&&due(bill)>0);
    if(customerDues.length)list.push(notice('critical','Customer payments due',`${customerDues.length} bill${customerDues.length===1?' has':'s have'} an outstanding balance.`, 'payments'));
    const supplierDues=(db.purchases||[]).filter(bill=>bill.status!=='Cancelled'&&due(bill)>0);
    if(supplierDues.length)list.push(notice('critical','Supplier payments due',`${supplierDues.length} purchase bill${supplierDues.length===1?' is':'s are'} unpaid or partly paid.`, 'payments'));
    const stockAlerts=(db.parts||[]).filter(part=>stock(part.id)<=Number(part.min||0));
    if(stockAlerts.length)list.push(notice(stockAlerts.some(part=>stock(part.id)<=0)?'critical':'action','Stock alert',`${stockAlerts.length} spare part${stockAlerts.length===1?' is':'s are'} at or below the minimum stock level.`, 'parts'));
    const insurance=(db.insurance||[]).filter(record=>{const remaining=day(record.expiry);return remaining!==null&&remaining<=30});
    if(insurance.length)list.push(notice(insurance.some(record=>day(record.expiry)<0)?'critical':'reminder','Insurance expiry',`${insurance.length} vehicle insurance polic${insurance.length===1?'y is':'ies are'} expired or due within 30 days.`, 'insurance'));
    const service=(db.bikes||[]).filter(bike=>{const remaining=day(bike.nextServiceDate),sent=typeof serviceReminderLastLog==='function'?serviceReminderLastLog(bike):null;return remaining!==null&&remaining<=10&&!sentToday(sent)});
    if(service.length)list.push(notice(service.some(bike=>day(bike.nextServiceDate)<0)?'critical':'reminder','Vehicle service reminder',`${service.length} vehicle service${service.length===1?' is':'s are'} overdue or due within 10 days. Alerts repeat daily until the due date is updated.`, 'service-reminders'));
    if(typeof amcContractEntries==='function'&&typeof amcExpiryDays==='function'){
      const amc=amcContractEntries().filter(contract=>{const remaining=amcExpiryDays(contract),sent=typeof contractReminderLog==='function'?contractReminderLog(contract):null;return remaining!==null&&remaining<=10&&!sentToday(sent)});
      if(amc.length)list.push(notice(amc.some(contract=>amcExpiryDays(contract)<0)?'critical':'reminder','AMC expiry reminder',`${amc.length} AMC contract${amc.length===1?' is':'s are'} expired or due within 10 days. Alerts repeat daily until the expiry date is updated.`, 'amc-plans'));
    }
    const appointments=(db.appointments||[]).filter(appointment=>appointment.status==='Confirmed'&&appointment.date<=today());
    if(appointments.length)list.push(notice('action','Appointments requiring action',`${appointments.length} confirmed appointment${appointments.length===1?' is':'s are'} due today or pending from an earlier date.`, 'appointments'));
    return list;
  }
  function updateBell(){
    const bell=$('#notifications');if(!bell)return;
    const current=items(),critical=current.filter(item=>item.level==='critical').length;
    bell.classList.add('notificationBell');bell.title=`Notifications: ${current.length} pending`;
    let count=$('#notificationCount');if(!count){count=document.createElement('span');count.id='notificationCount';bell.appendChild(count)}
    count.textContent=current.length>99?'99+':current.length;count.hidden=!current.length;count.classList.toggle('critical',critical>0);
    bell.onclick=openNotifications;
  }
  function openNotifications(){
    const current=items(),critical=current.filter(item=>item.level==='critical').length;
    openModal('Notifications & Critical Actions',`<section class="notificationCentre"><div class="notificationSummary"><strong>${current.length}</strong><span>Pending notification${current.length===1?'':'s'}</span><b>${critical?`${critical} critical`:'No critical alerts'}</b></div><p class="notificationIntro">Review these reminders and pending actions from across the workspace. They update automatically as records are completed.</p><div class="notificationList">${current.length?current.map((item,index)=>`<button type="button" class="notificationItem ${item.level}" data-notification-target="${esc(item.target)}"><span class="notificationLevel">${item.level==='critical'?'!':item.level==='reminder'?'◷':'•'}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span><em>Open ›</em></button>`).join(''):`<div class="notificationEmpty">✓ All clear. There are no critical reminders or pending actions at this time.</div>`}</div></section><div class="formactions">${btn('Close','cancel','secondary')}</div>`);
    $$('[data-notification-target]').forEach(button=>button.onclick=()=>{closeModal();go(button.dataset.notificationTarget)});
  }
  const renderBeforeNotifications=render;
  render=function(){const result=renderBeforeNotifications();updateBell();return result};
  updateBell();
})();
