/* Add location-specific shortage/excess and value differences. */
(function(){
  function qty(part,location){return typeof locationStock==='function'?Number(locationStock(part,location)||0):location==='main'?Number(stock(part)||0):0}
  function label(value){return value<0?'Short '+Math.abs(value):value>0?'Excess '+value:'Matched'}
  function enhance(){
    if(typeof page==='undefined'||page!=='report-stock')return;
    const table=document.querySelector('#content .tablewrap table');
    if(!table||table.dataset.locationVariance==='1')return;
    const header=table.tHead?.rows[0];if(!header)return;
    const godownPhysical=[...header.cells].find(cell=>cell.textContent.trim()==='Godown Physical');
    const totalVariance=[...header.cells].find(cell=>cell.textContent.trim()==='Shortage / Excess');
    if(!godownPhysical||!totalVariance)return;
    ['Main Shortage / Excess','Godown Shortage / Excess','Main Value Difference','Godown Value Difference'].forEach(labelText=>{
      const cell=document.createElement('th');cell.textContent=labelText;header.insertBefore(cell,totalVariance);
    });
    [...table.tBodies].forEach(body=>[...body.rows].forEach(row=>{
      const id=row.cells[0]?.textContent.trim();const line=stockReportSheet()?.lines?.find(item=>item.part===id);if(!line)return;
      const main=qty(id,'main'),godown=qty(id,'godown');
      const mainPhysical=Number(line.mainPhysical??0),godownPhysicalValue=Number(line.godownPhysical??0),cost=Number(line.cost||0);
      const values=[label(mainPhysical-main),label(godownPhysicalValue-godown),money((mainPhysical-main)*cost),money((godownPhysicalValue-godown)*cost)];
      const varianceIndex=[...header.cells].findIndex(cell=>cell.textContent.trim()==='Shortage / Excess');
      const anchor=row.cells[varianceIndex];values.forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.insertBefore(cell,anchor)});
    }));
    table.dataset.locationVariance='1';
  }
  const originalRender=window.render;
  if(typeof originalRender==='function')window.render=function(){const result=originalRender.apply(this,arguments);enhance();return result};
  document.addEventListener('DOMContentLoaded',enhance);setTimeout(enhance,0);
})();
