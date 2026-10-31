/* Use the shorter, clearer module name without changing payment behaviour. */
(function(){
  for(const group of groups){
    const item=group[1].find(entry=>entry[0]==='payments');
    if(item)item[1]='Payment Details';
  }
  titles.payments='Payment Details';
  nav();
  if(page==='payments'){
    $('#pageTitle').textContent='Payment Details';
    $('#crumb').textContent='Payment Details';
  }
})();
