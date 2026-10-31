/* DD/MM/YYYY presentation; canonical ISO dates remain in records for sorting/calculation. */
function dateInputISO(value){let text=String(value??'').trim();if(!text)return '';let match=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(match)text=match[3]+'-'+match[2]+'-'+match[1];if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(Date.parse(text))||new Date(text+'T00:00:00Z').toISOString().slice(0,10)!==text)throw Error('Use a valid date in DD/MM/YYYY format.');return text}
function displayDate(value){let text=String(value??'');if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return text;try{dateInputISO(text);return text.slice(8,10)+'/'+text.slice(5,7)+'/'+text.slice(0,4)}catch{return text}}
function displayDateTime(value){let date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}):'—'}
function formatDateText(text){return String(text).replace(/\b\d{4}-\d{2}-\d{2}\b/g,value=>displayDate(value))}
function updateDatePresentation(root){
 if(!root||typeof document.createTreeWalker!=='function')return;
 let walker=document.createTreeWalker(root,4),node;while(node=walker.nextNode()){let parent=node.parentElement;if(!parent||parent.closest('script,style,textarea,select,pre,code,[data-preserve-date-text]'))continue;let cell=parent.closest('td');if(cell){let header=cell.closest('table')?.rows[0]?.cells[cell.cellIndex]?.textContent||'';if(/\bSKU\b|\bID\b|\bCode\b|Invoice.*No|Job Card No/i.test(header)&&!/date/i.test(header))continue}node.nodeValue=formatDateText(node.nodeValue)}
 for(let original of root.querySelectorAll('input[type="date"]:not([data-dmy-date])')){
  original.dataset.dmyDate='true';let wrap=document.createElement('span');wrap.className='localDateControl';original.before(wrap);let proxy=document.createElement('input');proxy.type='text';proxy.placeholder='DD/MM/YYYY';proxy.inputMode='numeric';proxy.maxLength=10;proxy.pattern='[0-9]{2}/[0-9]{2}/[0-9]{4}';proxy.dataset.displayDateText='true';proxy.required=original.required;proxy.disabled=original.disabled;proxy.readOnly=original.readOnly;proxy.setAttribute('aria-label',(original.getAttribute('aria-label')||original.name||'Date')+' (DD/MM/YYYY)');let calendar=document.createElement('span');calendar.className='localDateIcon';calendar.innerHTML=icon('calendar');calendar.setAttribute('aria-hidden','true');wrap.append(proxy,calendar,original);original.required=false;original.classList.add('localDateNative');original.title='Choose date';
  let fromOriginal=()=>{if(document.activeElement!==proxy){proxy.value=displayDate(original.value);proxy.setCustomValidity('')}proxy.disabled=original.disabled;proxy.readOnly=original.readOnly};original.addEventListener('input',fromOriginal);original.addEventListener('change',()=>{proxy.value=displayDate(original.value);proxy.setCustomValidity('')});fromOriginal();
  function readProxy(change){if(/^\d{8}$/.test(proxy.value))proxy.value=proxy.value.slice(0,2)+'/'+proxy.value.slice(2,4)+'/'+proxy.value.slice(4);try{let iso=dateInputISO(proxy.value);original.value=iso;proxy.setCustomValidity('');original.dispatchEvent(new Event(change?'change':'input',{bubbles:true}))}catch(error){proxy.setCustomValidity(error.message)}}
  proxy.addEventListener('input',()=>readProxy(false));proxy.addEventListener('change',()=>readProxy(true));original._syncDateDisplay=fromOriginal;
 }
 for(let input of root.querySelectorAll('[data-dmy-date]'))input._syncDateDisplay?.();
}
const renderBeforeDatePresentation=render;
render=function(){renderBeforeDatePresentation();updateDatePresentation($('#content'))};
const modalBeforeDatePresentation=openModal;
openModal=function(title,html){let result=modalBeforeDatePresentation(title,html);updateDatePresentation($('#modalBody'));return result};
const linesBeforeDatePresentation=lineRender;
lineRender=function(){linesBeforeDatePresentation();updateDatePresentation($('#modalBody'))};
for(let event of ['input','change','click'])document.addEventListener(event,()=>Promise.resolve().then(()=>{updateDatePresentation($('#modalBody'));updateDatePresentation($('#content'))}));
auditDisplayDate=displayDateTime;
const exchangeDateBeforeDisplay=exchangeDate;
exchangeDate=function(value,label,optional=false){if(!value){if(optional)return '';throw Error(label+': enter a date in DD/MM/YYYY format')}try{return dateInputISO(value)}catch{throw Error(label+': use a valid DD/MM/YYYY date')}};
const csvCellBeforeDate=csvCell;
csvCell=function(value){return csvCellBeforeDate(typeof value==='string'?displayDate(value):value)};
const messageBeforeDatePresentation=messagePreview;
messagePreview=function(phone,message,bill){return messageBeforeDatePresentation(phone,formatDateText(message),bill)};
render();updateDatePresentation($('#modalBody'));
