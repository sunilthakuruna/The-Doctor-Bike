/* Vehicle billing history is useful; duplicate customer contact recap is not. */
(function(){
  const editBeforeRemovingVehicleSavedDetails=editRecord;
  editRecord=function(key,id,initial){
    editBeforeRemovingVehicleSavedDetails(key,id,initial);
    if(key==='bikes')$('#recordForm .savedBillingDetails')?.remove();
  };
})();
