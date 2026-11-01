/* Final Job Card spare-part GST synchronization. */
(function(){
  function netSalesBreakdown(b){
    const totals=billTotals(b),net=Math.max(0,round(Number(totals.total||0)-Number(totals.tax||0)-Number(b.paymentRoundOff||0)));
    const labourBase=(b.serviceLines||[]).reduce((s,l)=>s+Math.max(0,Number(l.charge||0)-(typeof itemDiscount==='function'?itemDiscount(l,'service'):0)),0);
    const partsBase=(b.partLines||[]).reduce((s,l)=>s+Math.max(0,Number(l.qty||0)*Number(l.price||0)-(typeof itemDiscount==='function'?itemDiscount(l,'part'):0)),0);
    const d=typeof splitDiscounts==='function'?splitDiscounts(b):{service:0,part:0};
    const labourAfter=Math.max(0,labourBase-Number(d.service||0)),partsAfter=Math.max(0,partsBase-Number(d.part||0));
    const labour=labourAfter+partsAfter?round(net*labourAfter/(labourAfter+partsAfter)):0;
    return {labour,parts:round(net-labour),total:net};
  }
  function addTodaySalesTile(){
    const cards=document.querySelector('#content .cards');
    if(!cards||cards.querySelector('[data-today-sales-tile]'))return;
    const bills=[...db.jobs,...db.sales].filter(b=>b.status!=='Cancelled'&&b.date===today()),parts=bills.reduce((s,b)=>s+netSalesBreakdown(b).parts,0),labour=bills.reduce((s,b)=>s+netSalesBreakdown(b).labour,0),total=round(parts+labour);
    const tile=document.createElement('article');tile.className='stat teal';tile.dataset.todaySalesTile='1';tile.innerHTML=`<div class="statmain"><div class="statlabel">${icon('wallet')}TODAY'S NET SALES</div><div class="statvalue">${money(total)}</div><div class="statdesc">Parts: ${money(parts)} · Labour: ${money(labour)} · excl. GST</div></div><div class="watermark">${icon('wallet')}</div><button class="statmore" data-page="report-sales">View details <span>➜</span></button>`;cards.appendChild(tile);
  }
  addTodaySalesTile();
  function addPeriodSalesTiles(){
    const cards=document.querySelector('#content .cards');
    if(!cards)return;
    const end=today(),now=new Date(end+'T12:00:00Z'),startWeekDate=new Date(now);startWeekDate.setUTCDate(now.getUTCDate()-((now.getUTCDay()+6)%7));
    const startWeek=startWeekDate.toISOString().slice(0,10),startMonth=end.slice(0,7)+'-01';const periods=[['week','THIS WEEK\'S NET SALES',startWeek,'#1d4ed8','#3b82f6'],['month','THIS MONTH\'S NET SALES',startMonth,'#7c2d12','#f97316']];
    periods.forEach(([key,label,start,color,accent])=>{if(cards.querySelector(`[data-period-sales="${key}"]`))return;const bills=[...db.jobs,...db.sales].filter(b=>b.status!=='Cancelled'&&b.date>=start&&b.date<=end),parts=bills.reduce((s,b)=>s+netSalesBreakdown(b).parts,0),labour=bills.reduce((s,b)=>s+netSalesBreakdown(b).labour,0),total=round(parts+labour),tile=document.createElement('article');tile.className='stat';tile.dataset.periodSales=key;tile.style.background=`linear-gradient(135deg,${color},${accent})`;tile.innerHTML=`<div class="statmain"><div class="statlabel">${icon('wallet')}${label}</div><div class="statvalue">${money(total)}</div><div class="statdesc">Parts: ${money(parts)} · Labour: ${money(labour)} · excl. GST</div></div><div class="watermark">${icon('wallet')}</div><button class="statmore" data-page="report-sales">View details <span>➜</span></button>`;cards.appendChild(tile)});
  }
  addPeriodSalesTiles();
  function addDashboardHints(){
    const content=document.querySelector('#content'),cards=content?.querySelector('.cards');
    if(!content||!cards||content.querySelector('[data-dashboard-hints]'))return;
    const hints=document.createElement('section');hints.dataset.dashboardHints='1';hints.className='dashboardHints';hints.innerHTML='<h3>Dashboard Hints</h3><p>Today, weekly, and monthly sales tiles show total sales split into Spare Parts and Labour / Service. Job Status shows the number of jobs in each stage. Monthly Revenue shows billed totals over the last six months. Gross Margin shows revenue after estimated spare-part cost. Cancelled records are excluded from sales, stock usage, and chart totals.</p>';content.appendChild(hints);
  }
  addDashboardHints();
  new MutationObserver(()=>{addTodaySalesTile();addPeriodSalesTiles();addDashboardHints()}).observe(document.querySelector('#content')||document.body,{childList:true,subtree:true});
  const rates=()=>[...new Set((db.lists?.['GST Rates']||[0,5,10,12,18,24,28]).map(Number).filter(Number.isFinite))].sort((a,b)=>a-b);
  const defaultSelling=()=>Number(db.settings?.defaultSellingGstRate??db.settings?.defaultGstRate??0);
  const oldAutofill=autofillPartLine;
  autofillPartLine=function(part,line,id,key,invoiceType){
    const next=oldAutofill.apply(this,arguments);
    if(jobDraft?.key==='jobs'||jobDraft?.key==='sales')next.gst=Number(line?.gst||0)>0?Number(line.gst):defaultSelling();
    return next;
  };
  const oldLineRender=lineRender;
  function searchableRows(root,selector,kind){
    document.querySelectorAll(selector).forEach(select=>{
      if(select.closest('.selectWrap'))return;
      const index=Number(select.dataset.line.split('|')[1]);
const selected=select.value;
const options=kind==='part'?partOptions().map(item=>{const part=find('parts',item.value);return {value:item.value,label:[part?.name,part?.id,part?.brand,part?.vehicleMake,part?.vehicleModel,'Stock: '+stock(item.value,jobDraft.id)].filter(Boolean).join(' / ')}}):reference('services').map(item=>{const service=find('services',item.value);return {value:item.value,label:[service?.name,service?.category,service?.description,'Charge: ₹'+Number(service?.charge||0)].filter(Boolean).join(' — ')}});
      select.innerHTML='<option value="">-- Select '+(kind==='part'?'Part':'Service')+' --</option>'+options.map(option=>`<option value="${esc(option.value)}">${esc(option.label)}</option>`).join('');
      select.value=selected;
      makeSearchSelect(select);
      addDropdownPaging(select.closest('.selectWrap'));
    });
  }
  function addDropdownPaging(wrap){
    if(!wrap||wrap.dataset.paged==='1')return;
    const list=wrap.querySelector('.selectOptions'),search=wrap.querySelector('.selectSearch input');
    if(!list||!search)return;
    wrap.dataset.paged='1';
    let page=0;
    const footer=document.createElement('div');
    footer.className='selectPaging';
    footer.innerHTML='<button type="button" data-page="prev">Previous</button><span></span><button type="button" data-page="next">Next</button>';
    wrap.querySelector('.selectDropdown').appendChild(footer);
    const paintPage=()=>{
      const buttons=[...list.querySelectorAll('.selectOption')],pages=Math.max(1,Math.ceil(buttons.length/10));
      page=Math.min(page,pages-1);
      buttons.forEach((button,index)=>{button.hidden=index<page*10||index>=(page+1)*10});
      footer.querySelector('span').textContent=buttons.length?`Page ${page+1} of ${pages}`:'Page 1 of 1';
      footer.querySelector('[data-page="prev"]').disabled=page===0;
      footer.querySelector('[data-page="next"]').disabled=page>=pages-1;
      footer.hidden=buttons.length<=10;
    };
    new MutationObserver(paintPage).observe(list,{childList:true});
    search.addEventListener('input',()=>{page=0;requestAnimationFrame(paintPage)});
    footer.addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(!button||button.disabled)return;page+=button.dataset.page==='next'?1:-1;paintPage()});
    paintPage();
  }
  lineRender=function(){
    if(jobDraft?.key==='jobs'||jobDraft?.key==='sales'){
      (jobDraft.record.partLines||[]).forEach(line=>{
        if(!line.part&&!Number(line.gst))line.gst=defaultSelling();
      });
    }
    const result=oldLineRender.apply(this,arguments);
    searchableRows('#serviceLines','select[data-line^="service|"]','service');
    searchableRows('#partLines','select[data-line^="part|"]','part');
    refreshExistingPartLabels();
    syncJobGstColumnVisibility();
    if(jobDraft?.key==='jobs'||jobDraft?.key==='sales'){
      document.querySelectorAll('[data-partfield$="|gst"]').forEach(select=>{
        const current=select.value,available=rates();
        select.innerHTML=available.map(rate=>`<option value="${rate}" ${String(rate)===String(current)?'selected':''}>${rate}%</option>`).join('');
        if(!available.some(rate=>String(rate)===String(current)))select.value=String(defaultSelling());
      });
    }
    return result;
  };
  function syncJobGstColumnVisibility(){
    const nonGst=document.querySelector('#billForm [name="invoiceType"]')?.value==='non-gst';
    ['#serviceLines table','#partLines table'].forEach(selector=>document.querySelectorAll(selector).forEach(table=>{
      const headers=[...table.querySelectorAll('thead th')],index=headers.findIndex(cell=>/GST/i.test(cell.textContent));
      if(index<0)return;
      if(nonGst)headers[index].style.setProperty('display','none','important');else headers[index].style.removeProperty('display');
      table.querySelectorAll('tbody tr').forEach(row=>{if(row.cells[index]){if(nonGst)row.cells[index].style.setProperty('display','none','important');else row.cells[index].style.removeProperty('display')}});
    }));
  }
  document.addEventListener('change',event=>{if(event.target.matches('#billForm [name="invoiceType"]'))syncJobGstColumnVisibility()},true);
  const gstVisibilityObserver=new MutationObserver(()=>{if(document.querySelector('#partLines table'))syncJobGstColumnVisibility()});
  gstVisibilityObserver.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(syncJobGstColumnVisibility,0),true);
  document.addEventListener('change',event=>{
    if(jobDraft?.key!=='jobs'||!event.target.matches('[data-line^="part|"]'))return;
    const index=Number(event.target.dataset.line.split('|')[1]),line=jobDraft.record.partLines[index],part=find('parts',event.target.value);
    if(!line||!part)return;
    if(!Number.isFinite(Number(line.price))||Number(line.price)<=0)line.price=Number(part.price||0);
    if(!Number.isFinite(Number(line.gst))||Number(line.gst)===0)line.gst=defaultSelling();
    updateBillTotals();
  },true);
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action="addPart"]');
    if(!button||!jobDraft||!['jobs','sales','purchases'].includes(jobDraft.key)||jobDraft.id)return;
    const line=jobDraft.record.partLines?.at(-1);if(!line)return;
    line.gst=defaultSelling();
    const select=document.querySelector('[data-partfield="'+(jobDraft.record.partLines.length-1)+'|gst"]');
    if(select)select.value=String(line.gst);
    updateBillTotals();
  },false);
  function repositionLineDropdown(trigger){
    const wrap=trigger?.closest('.selectWrap'),dropdown=wrap?.querySelector('.selectDropdown');
    if(!wrap||!dropdown||dropdown.hidden||!wrap.classList.contains('expanded'))return;
    const rect=trigger.getBoundingClientRect(),width=Math.max(rect.width,280),gap=5;
    const left=Math.max(8,Math.min(rect.left,window.innerWidth-width-8));
    const height=Math.min(dropdown.scrollHeight||480,window.innerHeight-16);
    let top=rect.bottom+gap;
    if(top+height>window.innerHeight-8)top=Math.max(8,rect.top-height-gap);
    Object.assign(dropdown.style,{position:'fixed',left:left+'px',top:top+'px',width:width+'px',zIndex:'20000'});
  }
  function refreshExistingPartLabels(){
    document.querySelectorAll('#partLines select[data-line^="part|"]').forEach(select=>{
      [...select.options].forEach(option=>{
        if(!option.value)return;
        const part=find('parts',option.value);
        if(part)option.textContent=[part.name,part.id,part.brand,part.vehicleMake,part.vehicleModel,'Stock: '+stock(option.value,jobDraft.id)].filter(Boolean).join(' / ');
      });
      const trigger=select.closest('.selectWrap')?.querySelector('.selectTrigger span');
      if(trigger)trigger.textContent=select.selectedOptions[0]?.textContent||'Select...';
    });
  }
  function compactDiscountControls(){
    document.querySelectorAll('.discountModeToggle').forEach(group=>{
      if(group.dataset.compact==='1')return;
      const button=group.querySelector('button[data-item-discount]');
      if(!button)return;
      const [kind,index]=button.dataset.itemDiscount.split('|');
      const line=jobDraft?.record?.[kind==='part'?'partLines':'serviceLines']?.[Number(index)];
      if(!line)return;
      const select=document.createElement('select');
      select.className='discountModeSelect';
      select.dataset.itemDiscount=`${kind}|${index}|discountType`;
      select.setAttribute('aria-label',`${kind} ${Number(index)+1} discount type`);
      select.innerHTML=`<option value="amount">₹</option><option value="percent">%</option>`;
      select.value=line.discountType==='percent'?'percent':'amount';
      select.addEventListener('change',()=>{line.discountType=select.value;updateBillTotals()});
      group.replaceWith(select);
    });
  }
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('#partLines .selectTrigger, #serviceLines .selectTrigger');
    if(trigger)requestAnimationFrame(()=>repositionLineDropdown(trigger));
  },false);
  const repositionOpenDropdown=()=>{
    const trigger=document.querySelector('#partLines .selectWrap.expanded .selectTrigger, #serviceLines .selectWrap.expanded .selectTrigger');
    if(trigger)repositionLineDropdown(trigger);
  };
  window.addEventListener('resize',repositionOpenDropdown);
  window.addEventListener('scroll',repositionOpenDropdown,true);
})();
