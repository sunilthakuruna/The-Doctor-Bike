/* Retain imported payment history while accounting for edits to its initial advance. */
const paidBeforeEditedImportAdvance=paid;
paid=function(b){
  const recorded=paidBeforeEditedImportAdvance(b);
  if(!b.imported||b.importedAdvanceBaseline===undefined)return recorded;
  return round(recorded+Number(b.advance||0)-Number(b.importedAdvanceBaseline||0));
};
const formBeforeEditedImportAdvance=billForm;
billForm=function(key,id,initial){
  const result=formBeforeEditedImportAdvance(key,id,initial);
  if(key==='jobs'&&jobDraft?.record.imported){
    const saved=id?find(key,id):jobDraft.record;
    jobDraft.record.importedAdvanceBaseline=Number(saved.importedAdvanceBaseline??saved.advance??0);
  }
  return result;
};
