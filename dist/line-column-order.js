/* Job Card line-table order: item discount, GST, then the final amount column. */
(function(){
  const before=lineRender;

  function netService(line){
    if(!line)return 0;
    if(typeof itemNet==='function')return Number(itemNet(line,'service'));
    const base=Number(line.charge||0);
    const discount=Number(line.discount||0);
    return Math.max(0,base-discount);
  }

  function reorder(){
    if(!jobDraft||!['jobs','sales'].includes(jobDraft.key))return;

    const partTable=document.querySelector('#partLines table');
    if(partTable){
      const order=[0,1,2,3,4,5,8,6,7,9];
      for(const row of partTable.rows){
        const cells=[...row.cells];
        if(cells.length<10)continue;
        for(const index of order)row.append(cells[index]);
      }
    }

    const serviceTable=document.querySelector('#serviceLines table');
    if(!serviceTable)return;
    const header=serviceTable.tHead?.rows[0]||serviceTable.rows[0];
    if(!header)return;
    if(!header.querySelector('[data-service-amount]')){
      const th=document.createElement('th');
      th.dataset.serviceAmount='1';
      th.textContent='AMOUNT (₹)';
      header.insertBefore(th,header.lastElementChild);
    }

    const lines=jobDraft.record.serviceLines||[];
    const rows=serviceTable.tBodies?.[0]?.rows||[];
    [...rows].forEach((row,i)=>{
      if(row.classList.contains('empty'))return;
      let cell=row.querySelector('[data-service-amount]');
      if(!cell){
        cell=document.createElement('td');
        cell.dataset.serviceAmount='1';
        row.insertBefore(cell,row.lastElementChild);
      }
      cell.textContent=money(netService(lines[i]));
    });
  }

  lineRender=function(){
    const result=before.apply(this,arguments);
    reorder();
    return result;
  };

  const beforeTotals=updateBillTotals;
  updateBillTotals=function(){
    const result=beforeTotals.apply(this,arguments);
    if(jobDraft?.key==='jobs'){
      const lines=jobDraft.record.serviceLines||[];
      document.querySelectorAll('#serviceLines [data-service-amount]').forEach((cell,i)=>{
        cell.textContent=money(netService(lines[i]));
      });
    }
    return result;
  };
})();

