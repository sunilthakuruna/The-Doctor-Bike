'use strict';
// Lets the owner move the browser-local prototype from imported sample records
// to an empty workspace without losing settings, lists, or user access.
const freshWorkspaceStore=typeof STORE==='string'?STORE:'bike-doctor-prototype-v1';
function freshWorkspaceRecordCollections(){
  return Object.entries(db).filter(([key,value])=>Array.isArray(value)&&!/(^users?$|role|permission|session)/i.test(key));
}
function freshWorkspaceSummary(){
  const entries=freshWorkspaceRecordCollections().filter(([,rows])=>rows.length);
  const total=entries.reduce((sum,[,rows])=>sum+rows.length,0);
  return {entries,total};
}
function freshWorkspacePanel(){
  const {entries,total}=freshWorkspaceSummary();
  const isFresh=db.importInfo?.source==='fresh-workspace';
  const sampleState=db.sampleDataInfo?.createdAt?'Two sample entries already added':'No sample entries added yet';
  const detail=entries.length?entries.map(([key,rows])=>`${key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}: ${rows.length}`).join(' · '):'No business records are currently saved.';
  return `<section class="panel freshWorkspacePanel" style="margin-top:20px"><div class="panelhead"><h2>${icon('box')}Workspace Data</h2><span class="badge ${isFresh?'good':'info'}">${isFresh?'Fresh workspace':'Current records: '+total}</span></div><div class="panelbody"><p style="color:#64748b;line-height:1.7">${isFresh?'The demo business records have been cleared. You can enter your own records or add clearly labelled sample entries for a walkthrough.':'Manage the current records or add clearly labelled sample entries for a walkthrough.'}</p><p class="notice">${esc(detail)}</p><p style="color:#64748b;font-size:12px;line-height:1.7">${esc(sampleState)}. Sample data is additive and linked across operational modules; settings, user accounts and permissions are left unchanged. Only the two sample AMC plan names are added to the AMC plan choices. A backup is downloaded before sample entries are added.</p><div class="toolbar"><button class="btn" id="addSampleEntries" ${db.sampleDataInfo?.createdAt?'disabled':''}>Add 2 Sample Entries per Module</button>${isFresh?'':`<button class="btn danger" id="startFreshWorkspace">Download Backup &amp; Start Fresh</button>`}</div></div></section>`;
}
function sampleEntryNextId(key){
  const setting={customers:'customerPrefix',bikes:'vehiclePrefix',services:'servicePrefix',staff:'mechanicPrefix',parts:'partPrefix',jobs:'jobPrefix',sales:'salesPrefix',purchases:'purchasePrefix',appointments:'appointmentPrefix',insurance:'insurancePrefix',accounts:'accountPrefix',receipts:'transactionPrefix',expenses:'expensePrefix'}[key];
  const prefix=String(db.settings?.[setting]||prefixes[key]||('BD-'+key.toUpperCase())).trim(),separator=prefix.endsWith('-')?'':'-';
  const highest=(db[key]||[]).reduce((max,row)=>Math.max(max,Number(String(row.id||'').split('~')[0].match(/(\d+)$/)?.[1])||1000),1000);
  return `${prefix}${separator}${highest+1}`;
}
function sampleDateOffset(days){const date=new Date();date.setDate(date.getDate()+days);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Calcutta',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
function addTwoSampleEntries(){
  if(db.sampleDataInfo?.createdAt)return toast('Sample entries have already been added to this workspace.');
  const previous=structuredClone(db);
  try{
    const now=today(), created=[];
    const uniqueName=(base,rows)=>{let value=base,suffix=2;while(rows.some(row=>String(row.name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-IN')===value.toLocaleLowerCase('en-IN')))value=`${base} ${suffix++}`;return value};
    const add=(key,row)=>{row.id=sampleEntryNextId(key);db[key].push(row);created.push(key);return row};
    const customers=[1,2].map(i=>add('customers',{name:uniqueName(`Sample Customer ${i}`,db.customers),mobile:`90000000${String(20+i).padStart(2,'0')}`,alt:'',email:'',address:`Sample Address ${i}`,city:'Gorakhpur',state:'Uttar Pradesh',pin:'',gst:'',type:'Regular',dob:''}));
    const services=[1,2].map(i=>add('services',{name:uniqueName(`Sample Service ${i} — ${i===1?'General Service':'Brake Service'}`,db.services),category:i===1?'General Service':'Mechanical Repair',charge:i===1?450:250,status:'Active',description:'Clearly labelled sample service entry.'}));
    const staff=[1,2].map(i=>add('staff',{name:uniqueName(`Sample Mechanic ${i}`,db.staff),mobile:`90000000${String(30+i).padStart(2,'0')}`,designation:'Mechanic',skills:i===1?'General Service':'Brake Service',experience:1,address:'',joining:now,salaryType:'Per Job',salary:10,status:'Active',remarks:'Sample record; not a real staff member.'}));
    const bikes=customers.map((customer,i)=>add('bikes',{customer:customer.id,number:(()=>{let value=`SAMPLE-BIKE-${i+1}`,suffix=2;while(db.bikes.some(b=>String(b.number||'').toUpperCase()===value))value=`SAMPLE-BIKE-${i+1}-${suffix++}`;return value})(),type:i?'Scooter':'Bike',brand:i?'Honda':'Hero',model:i?'Activa 6G':'Splendor Plus',variant:'Sample',year:String(new Date().getFullYear()),fuel:'Petrol',transmission:i?'Automatic':'Manual',lastServiceDate:now,nextServiceDate:sampleDateOffset(30+i*15),nextServiceType:'Sample scheduled service',serviceReminderNotes:'Sample reminder entry',amcScope:'none'}));
    const parts=[1,2].map(i=>add('parts',{name:uniqueName(`Sample Part ${i} — ${i===1?'Engine Oil':'Brake Shoe Set'}`,db.parts),hsn:'',category:i===1?'Oil & Lubricants':'Brake',brand:i===1?'Sample Brand A':'Sample Brand B',unit:i===1?'Litre':'Set',purchase:i===1?270:180,price:i===1?350:260,gst:0,opening:4,min:1,rack:`S-${i}`,notes:'Sample record; no real inventory purchase.'}));
    const accounts=[1,2].map(i=>add('accounts',{name:uniqueName(`Sample Account ${i} — ${i===1?'Cash':'UPI'}`,db.accounts),type:i===1?'Cash in Hand':'UPI / Digital Wallet',opening:0,status:'Active',description:'Sample account'}));
    const plans=[];
    db.amcPlans=Array.isArray(db.amcPlans)?db.amcPlans:[];
    db.lists['AMC Types']=Array.isArray(db.lists['AMC Types'])?db.lists['AMC Types']:[];
    for(let i=1;i<=2;i++){let name=uniqueName(`Sample AMC Plan ${i}`,db.amcPlans.map(p=>({name:p.name})));const plan={id:`AMC-PLAN-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}`,name,months:i===1?12:24,coverage:`Sample coverage ${i}`};db.amcPlans.push(plan);if(!db.lists['AMC Types'].some(v=>String(v).toLowerCase()===plan.name.toLowerCase()))db.lists['AMC Types'].push(plan.name);plans.push(plan)}
    bikes.forEach((bike,i)=>Object.assign(bike,{amcScope:'vehicle',amcType:plans[i].name,amcPlanId:plans[i].id,amcStart:now,amcExpiry:sampleDateOffset(120+i*30),amcNotes:'Sample AMC contract'}));
    const jobs=customers.map((customer,i)=>add('jobs',{date:now,customer:customer.id,bike:bikes[i].id,work:i?'Repair':'General Service',status:i?'Completed':'In Progress',mechanic:staff[i].id,complaint:'Sample job card entry',odometer:1000+i*500,delivery:sampleDateOffset(2+i),invoiceType:'non-gst',tax:0,discount:0,advance:i?460:100,account:accounts[i].id,mode:i?'UPI / QR Code':'Cash',serviceLines:[{service:services[i].id,charge:services[i].charge,gst:0,discount:0}],partLines:[{part:parts[i].id,qty:1,price:parts[i].price,gst:0}],notes:'Sample data'}));
    const purchases=parts.map((part,i)=>add('purchases',{date:now,supplier:`Sample Supplier ${i+1}`,invoice:`SAMPLE-BILL-${i+1}`,status:'Completed',invoiceType:'gst',tax:0,discount:0,advance:0,account:accounts[i].id,mode:'Cash',stockLocation:'godown',serviceLines:[],partLines:[{part:part.id,qty:1,price:part.purchase,gst:0,vendor:`Sample Supplier ${i+1}`,brand:part.brand,hsn:''}],notes:'Sample purchase; received into Godown.'}));
    db.stockMovements=Array.isArray(db.stockMovements)?db.stockMovements:[];
    let movementNo=1;const nextMovement=()=>{while(db.stockMovements.some(m=>m.id===`MOV-${String(movementNo).padStart(5,'0')}`))movementNo++;return `MOV-${String(movementNo++).padStart(5,'0')}`};
    for(let i=0;i<2;i++)db.stockMovements.push({id:nextMovement(),kind:'opening',part:parts[i].id,qty:2,date:now,note:`Sample Godown opening ${i+1}`,unitCost:parts[i].purchase,purchaseDate:now,createdAt:new Date().toISOString()});
    for(let i=0;i<2;i++)db.stockMovements.push({id:nextMovement(),kind:'transfer',part:parts[i].id,qty:1,date:now,note:`Sample Godown transfer ${i+1}`,createdAt:new Date().toISOString()});
    const sales=parts.map((part,i)=>add('sales',{date:now,walkin:`Sample Counter Customer ${i+1}`,status:'Completed',invoiceType:'non-gst',tax:0,discount:0,advance:part.price,account:accounts[i].id,mode:i?'UPI / QR Code':'Cash',serviceLines:[],partLines:[{part:part.id,qty:1,price:part.price,gst:0}],notes:'Sample counter sale'}));
    const receipts=jobs.map((job,i)=>add('receipts',{bill:job.id,date:now,amount:i?50:100,mode:i?'UPI / QR Code':'Cash',account:accounts[i].id,ref:`SAMPLE-RECEIPT-${i+1}`,remarks:'Sample later payment'}));
    for(let i=0;i<2;i++)add('expenses',{category:'Miscellaneous',amount:i?100:50,date:now,mode:i?'UPI / QR Code':'Cash',account:accounts[i].id,staff:'',description:`Sample operating expense ${i+1}`});
    for(let i=0;i<2;i++)add('appointments',{date:sampleDateOffset(i+1),slot:i?'10:00 AM - 11:00 AM':'09:00 AM - 10:00 AM',status:'Confirmed',name:customers[i].name,mobile:customers[i].mobile,number:bikes[i].number,brand:bikes[i].brand,model:bikes[i].model,complaint:'Sample appointment request',notes:'Sample booking'});
    for(let i=0;i<2;i++)add('insurance',{bike:bikes[i].id,issue:now,expiry:sampleDateOffset(180+i*30),provider:`Sample Insurance Provider ${i+1}`,policy:`SAMPLE-POL-${i+1}`,premium:0,notes:'Sample insurance record'});
    db.attendance=db.attendance&&typeof db.attendance==='object'?db.attendance:{};
    db.attendance[now]={...(db.attendance[now]||{}),[staff[0].id]:{status:'Present',note:'Sample attendance'},[staff[1].id]:{status:'Present',note:'Sample attendance'}};
    for(let i=1;i<=2;i++)audit('Sample Data',`Sample entry set ${i} added across linked modules`);
    db.sampleDataInfo={createdAt:new Date().toISOString(),entrySets:2,source:'workspace sample data action'};
    if(save('Added two linked sample entries per data module. Settings, users and list options were retained.')===false){db=previous;return}
    closeModal();render();
  }catch(error){db=previous;console.error('Could not add sample records',error);toast(error.message||'Sample entries could not be added. Existing records were kept.');}
}
function reviewAddSampleEntries(){
  if(db.sampleDataInfo?.createdAt)return toast('Sample entries have already been added to this workspace.');
  openModal('Add Sample Entries',`<div class="formbody"><div class="notice"><strong>This adds data; it does not clear or overwrite anything.</strong> Two clearly labelled records will be added to customers, vehicles, services, staff, spare parts, jobs, sales, purchases, expenses, appointments, insurance, accounts and payment history. It also creates linked attendance, AMC, service reminder and godown stock examples for the derived modules and reports.</div><p>Configured ID prefixes will be used. User accounts, permissions and business settings are left unchanged. The two AMC plan names are added to the AMC plan choices so the sample contracts work.</p><p>Sample transactions affect dashboard, balances and report totals. A JSON backup will be downloaded before saving.</p></div><div class="formactions">${btn('Cancel','cancel','secondary')}<button class="btn" id="confirmAddSampleEntries">Download Backup &amp; Add Samples</button></div>`);
  $('#confirmAddSampleEntries').onclick=()=>{
    try{const oldDownload=localStorage.getItem(freshWorkspaceStore+'-last-download');downloadBackup();if(localStorage.getItem(freshWorkspaceStore+'-last-download')===oldDownload)throw Error('Backup download could not be started. No sample entries were added.');addTwoSampleEntries()}catch(error){toast(error.message||'Could not start the backup. No sample entries were added.')}
  };
}
function reviewFreshWorkspaceReset(){
  const {entries,total}=freshWorkspaceSummary();
  if(!total)return toast('There are no saved business records to clear.');
  const lines=entries.map(([key,rows])=>`<li>${esc(key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()))}: ${rows.length}</li>`).join('');
  openModal('Review Fresh Workspace',`<div class="formbody"><div class="notice"><strong>${total} business records</strong> will be cleared from this browser after a backup is downloaded.</div><ul style="line-height:1.8">${lines}</ul><p>Garage and invoice settings, dropdown lists, user accounts and permissions will remain. To undo the clear later, restore the downloaded JSON backup from Business Settings.</p><p><strong>This action cannot be undone without that backup.</strong></p></div><div class="formactions">${btn('Cancel','cancel','secondary')}<button class="btn danger" id="confirmFreshWorkspace">Download Backup &amp; Clear Records</button></div>`);
  $('#confirmFreshWorkspace').onclick=()=>{
    const previous=db;
    try{
      const oldDownload=localStorage.getItem(freshWorkspaceStore+'-last-download');
      downloadBackup();
      if(localStorage.getItem(freshWorkspaceStore+'-last-download')===oldDownload)throw Error('Backup download could not be started. No records were cleared.');
      const cleared=structuredClone(db);
      for(const [key] of freshWorkspaceRecordCollections())cleared[key]=[];
      cleared.attendance={};
      delete cleared.sampleDataInfo;
      cleared.importInfo={source:'fresh-workspace',clearedAt:new Date().toISOString()};
      db=cleared;
      if(!save()){db=previous;return}
      closeModal();
      page='dashboard';search='';filter='';
      render();
      toast('Fresh workspace ready. Your settings and user access were kept.');
    }catch(error){db=previous;toast(error.message||'Could not start the backup. No records were cleared.')}
  };
}
const renderBeforeFreshWorkspaceReset=render;
render=function(){
  renderBeforeFreshWorkspaceReset();
  if(page!=='settings')return;
  const content=$('#content');
  const oldPanel=[...content.querySelectorAll('section.panel')].find(section=>section.querySelector('.panelhead h2')?.textContent.includes('Imported Demo Business Records'));
  oldPanel?.remove();
};
render();
