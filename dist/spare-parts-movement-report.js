/* Full physical inventory movement report: opening, purchase, godown transfer and issue. */
(function(){
  let selectedMovementPart='',movementFrom='',movementTo='';
  if(!reports.some(item=>item[0]==='report-stock-movements'))reports.push(['report-stock-movements','Spare Parts Movement History']);
  titles['report-stock-movements']='Spare Parts Movement History Report';
  const financeGroup=groups.find(group=>group[0]==='FINANCE & REPORTS');
  if(financeGroup&&!financeGroup[1].some(item=>item[0]==='report-stock-movements')){
    const reportIndex=financeGroup[1].findIndex(item=>item[0]==='reports');
    financeGroup[1].splice(reportIndex<0?financeGroup[1].length:reportIndex+1,0,['report-stock-movements','Spare Parts Movement Report','chart']);
  }
  const reportPageBeforeMovement=reportPage;

  function partMovements(){
    const movements=[];
    for(const part of db.parts||[]){
      const opening=Number(part.opening||0);
      if(opening>0)movements.push({part:part.id,date:part.purchaseDate||'0000-00-00',order:0,type:'Opening Stock',from:'Opening Balance',to:'Main Stock',inQty:opening,outQty:0,reference:'Part Master',details:'Opening stock entered in Spare Parts Master'});
    }
    for(const movement of db.stockMovements||[]){
      if(Number(movement.qty||0)<=0)continue;
      movements.push({part:movement.part,date:movement.date||'0000-00-00',order:movement.kind==='opening'?1:2,type:movement.kind==='opening'?'Godown Opening Stock':'Godown Transfer',from:movement.kind==='opening'?'Opening Balance':'Godown',to:movement.kind==='opening'?'Godown':'Main Stock',inQty:movement.kind==='opening'?Number(movement.qty):0,outQty:0,reference:movement.id,details:movement.note||'—',transferQty:movement.kind==='transfer'?Number(movement.qty):0});
    }
    for(const purchase of db.purchases||[]){
      if(purchase.status==='Cancelled')continue;
      for(const line of purchase.partLines||[])if(line.part&&Number(line.qty)>0)movements.push({part:line.part,date:purchase.date||'0000-00-00',order:3,type:'Purchase Receipt',from:purchase.supplier||'Supplier / Vendor',to:purchase.stockLocation==='godown'?'Godown':'Main Stock',inQty:Number(line.qty),outQty:0,reference:purchase.id,details:`Invoice: ${purchase.invoice||'—'} · Paid: ${money(purchase.advance||0)}`});
    }
    for(const job of db.jobs||[]){
      if(job.status==='Cancelled')continue;
      for(const line of job.partLines||[])if(line.part&&Number(line.qty)>0)movements.push({part:line.part,date:job.date||'0000-00-00',order:4,type:'Issued on Job Card',from:'Main Stock',to:job.customer?name('customers',job.customer):(job.walkin||'Customer'),inQty:0,outQty:Number(line.qty),reference:job.id,details:`Vehicle: ${number(job.bike)||'—'}`});
    }
    for(const sale of db.sales||[]){
      if(sale.status==='Cancelled')continue;
      for(const line of sale.partLines||[])if(line.part&&Number(line.qty)>0)movements.push({part:line.part,date:sale.date||'0000-00-00',order:5,type:'Counter Sale',from:'Main Stock',to:sale.customer?name('customers',sale.customer):(sale.walkin||'Walk-in Customer'),inQty:0,outQty:Number(line.qty),reference:sale.id,details:'Counter sale invoice'});
    }
    return movements.sort((a,b)=>a.part.localeCompare(b.part)||a.date.localeCompare(b.date)||a.order-b.order||a.reference.localeCompare(b.reference));
  }

  reportPage=function(){
    if(page!=='report-stock-movements')return reportPageBeforeMovement();
    const all=partMovements();
    const visible=all.filter(movement=>(!selectedMovementPart||movement.part===selectedMovementPart)&&(!movementFrom||movement.date>=movementFrom)&&(!movementTo||movement.date<=movementTo)&&matches({...movement,partName:name('parts',movement.part),partCode:movement.part}));
    const balances={};
    const rows=visible.map(movement=>{
      if(balances[movement.part]===undefined){
        balances[movement.part]=0;
        for(const earlier of all){if(earlier.part!==movement.part)continue;if(earlier===movement)break;balances[movement.part]+=earlier.inQty-earlier.outQty}
      }
      balances[movement.part]+=movement.inQty-movement.outQty;
      const part=find('parts',movement.part);
      const quantity=movement.transferQty?movement.transferQty:movement.inQty||movement.outQty;
      const direction=movement.transferQty?'Transfer':movement.inQty?'Stock In':'Stock Out';
      return [esc(movement.date==='0000-00-00'?'—':movement.date),`<strong>${esc(part?.name||'Removed Part')}</strong><small>${esc(movement.part)}</small>`,badge(movement.type),esc(movement.from),esc(movement.to),`${direction}: ${quantity} ${esc(part?.unit||'PCS')}`,movement.inQty?`+${movement.inQty}`:'—',movement.outQty?`−${movement.outQty}`:'—',`${balances[movement.part]} ${esc(part?.unit||'PCS')}`,esc(movement.reference),esc(movement.details)];
    });
    const stockIn=visible.reduce((sum,movement)=>sum+movement.inQty,0),stockOut=visible.reduce((sum,movement)=>sum+movement.outQty,0),transfers=visible.filter(movement=>movement.transferQty).length;
    return `<div class="intro"><h2>Spare Parts Movement History Report</h2><p>Track every physical stock movement: main opening stock, godown opening stock, purchase receipt, godown-to-main transfer, job-card issue and counter sale.</p></div>`+
      summary([['MOVEMENT ENTRIES',visible.length],['STOCK IN',stockIn],['STOCK OUT',stockOut],['GODOWN TRANSFERS',transfers]])+
      `<div class="movementReportNotice">Payment Audit History records money movement. This report records physical stock movement; purchase-payment details appear as a reference on purchase receipts.</div>`+
      `<div class="toolbar"><input id="search" class="search" type="search" inputmode="search" placeholder="Search part, movement type, source or reference..." aria-label="Search spare part movements" value="${esc(search)}"><select id="stockMovementPart" aria-label="Filter spare part"><option value="">All Spare Parts</option>${opts((db.parts||[]).map(part=>({value:part.id,label:part.name+' — '+part.id})),selectedMovementPart)}</select><label class="movementDateFilter"><span>From</span><input id="movementFrom" type="date" aria-label="Movement date from" value="${esc(movementFrom)}"></label><label class="movementDateFilter"><span>To</span><input id="movementTo" type="date" aria-label="Movement date to" value="${esc(movementTo)}"></label><span class="spacer"></span><button type="button" class="btn exportButton" data-action="export">${icon('download')}Export Excel</button></div>`+
      table(['Date','Spare Part','Movement Type','From','To','Quantity','Stock In','Stock Out','Running Balance','Reference','Notes'],rows);
  };
  const renderBeforeMovementReport=render;
  render=function(){renderBeforeMovementReport();const filter=$('#stockMovementPart'),from=$('#movementFrom'),to=$('#movementTo');if(filter)filter.onchange=event=>{selectedMovementPart=event.target.value;render()};if(from)from.onchange=event=>{movementFrom=event.target.value;render()};if(to)to.onchange=event=>{movementTo=event.target.value;render()}};
  nav();
})();
