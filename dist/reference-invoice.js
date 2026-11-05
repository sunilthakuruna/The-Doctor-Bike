/* The uploaded invoice reference, rendered consistently for preview, printing and PDF sharing. */
const referenceInvoiceImageCache=new Map();
function saveReferenceInvoiceDefault(enabled){
  const before=structuredClone(db.settings);
  db.settings.defaultRegularInvoiceLayout=enabled?'reference':'custom';
  db.settings.referenceInvoiceDefaultVersion=1;
  if(save()===false){db.settings=before;return false;}
  return true;
}
if(db.settings.referenceInvoiceDefaultVersion!==1)saveReferenceInvoiceDefault(true);
let useReferenceInvoiceLayout=db.settings.defaultRegularInvoiceLayout!=='custom';
const referenceEsc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function referenceDate(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(value||'—');}
function referenceAmountWords(amount){
  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function words(n){if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');for(const [size,label] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand'],[100,'Hundred']])if(n>=size)return words(Math.floor(n/size))+' '+label+(n%size?' '+words(n%size):'');return '';}
  const paise=Math.round(Math.abs(Number(amount)||0)*100),whole=Math.floor(paise/100);return 'Rupees '+(words(whole)||'Zero')+(paise%100?' and '+words(paise%100)+' Paise':'')+' Only';
}
function referenceInvoiceModel(key,id){
  const b=find(key,id);if(!b)throw Error('Invoice not found');
  const s=db.settings,c=find('customers',b.customer)||{},vehicle=find('bikes',b.bike)||{},totals=billTotals(b),discounts=splitDiscounts(b),nonGst=invoiceTypeOf(b)==='non-gst';
  const item=(line,kind)=>{const part=kind==='part',master=find(part?'parts':'services',part?line.part:line.service)||{},qty=part?Number(line.qty||0):1,rate=Number(part?line.price:line.charge)||0,discount=itemDiscount(line,kind),gst=nonGst?0:Number(part?line.gst:(typeof serviceGstRate==='function'?serviceGstRate(line,b):b.tax))||0;return {name:line.name||master.name||name(part?'parts':'services',part?line.part:line.service)||'Item',code:part?(master.code||line.part||''):'',hsn:part?(master.hsn||line.hsn||''):'',qty,unit:part?(master.unit||master.uom||'Pcs'):'Job',rate,discount,discountType:line.discountType,discountValue:Number(line.discount||0),amount:round(qty*rate-discount),gst};};
  const parts=(b.partLines||[]).map(l=>item(l,'part')),services=(b.serviceLines||[]).map(l=>item(l,'service'));
  const gross=round(Number(totals.labour||0)+Number(totals.parts||0)),discount=round(Number(discounts.service||0)+Number(discounts.part||0)+Number(b.discount||0)),rounding=Number(b.paymentRoundOff||0),tax=nonGst?0:Number(totals.tax||0),adjustment=round(Number(totals.total)-gross+discount-tax-rounding)||0;
  const image=value=>typeof validInvoiceImage==='function'&&validInvoiceImage(value)?value:'';
  const receipts=(db.receipts||[]).filter(r=>r.bill===id&&(!b.imported||!r.historical));
  return {title:nonGst?'NON-GST INVOICE':'TAX INVOICE',business:{name:s.name||'BIKE DOCTOR',address:s.address||'',phone:s.phone||'',email:s.email||'',gst:nonGst?'':s.gst||'',state:s.state||'',upi:s.upiId||'',logo:image(s.logo||s.logoImage),qr:image(s.upiQrImage),stamp:image(s.stampImage),stampCaption:s.stampCaption||'Authorized Signatory',bankName:s.bankName||'',bankAccount:s.bankAccount||'',bankIfsc:s.bankIfsc||'',bankHolder:s.bankHolder||'',footer:s.footer||'Thanks for doing business with us!',terms:s.invoiceTerms||s.terms||'Goods once sold will not be taken back.\nVehicle parked and driven at owner\'s risk.\nSubject to local jurisdiction.'},invoice:b.invoiceNumber||b.invoiceNo||b.invoice||b.sourceId||b.id,job:b.sourceId||b.id,date:referenceDate(b.date),vehicle:b.vehicleNumber||vehicle.number||'—',model:[vehicle.brand||vehicle.make,vehicle.model].filter(Boolean).join(' ')||'—',odometer:b.odometer?b.odometer+' km':'—',mechanic:b.mechanicName||name('staff',b.mechanic)||'—',customer:{name:c.name||b.customerName||b.walkin||'Walk-in Customer',address:[c.address,c.city,c.state,c.pin].filter(Boolean).join(', '),mobile:c.mobile||b.mobile||'',gst:nonGst?'':(b.customerGst??c.gst??'')},parts,services,gross,discount,serviceDiscount:Number(discounts.service||0),partsDiscount:Number(discounts.part||0),tax,rounding,adjustment,total:Number(totals.total||0),received:Number(paid(b)||0),balance:Number(due(b)||0),advance:Number(b.advance||0),receipts,mode:b.mode||b.paymentMode||'Not recorded',words:referenceAmountWords(totals.total),nonGst};
}
function referenceWrap(value,width,font=10){
  const result=[];for(const paragraph of String(value??'').split('\n')){let row='';for(let word of paragraph.split(/\s+/)){while(word.length*font*.52>width){const length=Math.max(1,Math.floor(width/(font*.52)));if(row){result.push(row);row='';}result.push(word.slice(0,length));word=word.slice(length);}const next=row?row+' '+word:word;if(next.length*font*.52>width&&row){result.push(row);row=word;}else row=next;}if(row)result.push(row);}return result.length?result:[''];
}
function referenceInvoiceScene(m,options={}){
  const width=Number(options.width||794),height=Number(options.height||1123),margin=32,w=width-2*margin,pages=[],columns=[.035,.525,.068,.055,.105,.10,.112],xs=[margin];for(const ratio of columns)xs.push(xs[xs.length-1]+w*ratio);
  let commands=[],y=0,pageNumber=0;
  function rect(x,y,w,h,fill='none'){commands.push({type:'rect',x,y,w,h,fill});}
  function line(x,y,x2,y2,dashed=false){commands.push({type:'line',x,y,x2,y2,dashed});}
  function text(value,x,y,size=9,bold=false,align='left',color='#111'){commands.push({type:'text',value:String(value??''),x,y,size,bold,align,color});}
  function image(src,x,y,w,h){if(src)commands.push({type:'image',src,x,y,w,h});}
  function paragraph(value,x,y,width,font=9,bold=false,maxLines=100){const lines=referenceWrap(value,width,font).slice(0,maxLines);for(const row of lines){text(row,x,y,font,bold);y+=font+3;}return y;}
  function page(){commands=[];pages.push(commands);pageNumber++;text(m.title,width/2,30,16,true,'center');text('ORIGINAL FOR RECIPIENT',width-margin,30,7,false,'right','#173b8a');
    const top=42,left=w*.5,cellWidth=(w-left)/2,companyX=margin+(m.business.logo?68:10),companyWidth=left-(companyX-margin)-9,companyEntries=[m.business.phone?'Phone: '+m.business.phone:'',m.business.email?'Email: '+m.business.email:'',!m.nonGst?'GST No. (GSTIN): '+(m.business.gst||'—'):'',m.business.state?'State: '+m.business.state:'',m.business.upi?'UPI: '+m.business.upi:''].filter(Boolean),companyAddressLines=referenceWrap(m.business.address,companyWidth,7.5).length,headerHeight=Math.max(124,Math.ceil(45+companyAddressLines*10.5+companyEntries.length*10));rect(margin,top,w,headerHeight);line(margin+left,top,margin+left,top+headerHeight);image(m.business.logo,margin+9,top+10,50,50);text(m.business.name,companyX,top+20,14,true);
    let companyY=paragraph(m.business.address,companyX,top+35,companyWidth,7.5);for(const entry of companyEntries){text(entry,companyX,companyY,7.3,entry.startsWith('GST No.'));companyY+=10;}
    const cells=[['Invoice No.',m.invoice],['Date',m.date],['Transport / Job Card No.',m.job],['Vehicle Number',m.vehicle],['Model / Odometer',m.model+' ('+m.odometer+')'],['Service Consultant',m.mechanic]];
    for(let i=0;i<cells.length;i++){const cx=margin+left+(i%2)*cellWidth,cy=top+Math.floor(i/2)*(headerHeight/3);if(i%2)line(cx,cy,cx,cy+headerHeight/3);if(i>=2)line(cx,cy,cx+cellWidth,cy);text(cells[i][0],cx+8,cy+12,7);paragraph(cells[i][1],cx+8,cy+25,cellWidth-16,8,true,2);}
    y=top+headerHeight;const customerAddressLines=referenceWrap(m.customer.address,w-20,8).length,billToHeight=Math.max(m.customer.gst?84:70,Math.ceil(61+Math.max(0,customerAddressLines-1)*11+(m.customer.gst?14:0)));rect(margin,y,w,billToHeight);text('BILL TO',margin+10,y+14,8);text(m.customer.name,margin+10,y+30,11,true);let customerY=paragraph(m.customer.address,margin+10,y+43,w-20,8);text('Contact No.: '+(m.customer.mobile||'—'),margin+10,customerY+3,8);if(m.customer.gst)text('Customer GST No. (GSTIN): '+m.customer.gst,margin+10,customerY+17,8,true);y+=billToHeight;
    tableRow(['#','Item Name','Quantity','Unit','Price/Unit','Discount','Amount'],23,true);
  }
  function tableRow(values,rowHeight=22,header=false){rect(margin,y,w,rowHeight);for(let i=1;i<xs.length-1;i++)line(xs[i],y,xs[i],y+rowHeight);values.forEach((value,i)=>{const align=i===1?'left':i<4?'center':'right',x=i===1?xs[i]+6:align==='right'?xs[i+1]-6:(xs[i]+xs[i+1])/2;const available=xs[i+1]-xs[i]-9;const size=Math.max(6.5,Math.min(header?8:8.6,available/(Math.max(1,String(value).length)*.53)));text(value,x,y+14,size,header||i===6,align);});y+=rowHeight;}
  function group(title){text('-- '+title+' --',margin+6,y+12,7.5,false,'left','#173b8a');y+=18;}
  page();
  for(const [title,rows] of [['SPARE PARTS & MATERIALS',m.parts],['LABOUR & SERVICE CHARGES',m.services],['Miscellaneous Items',m.miscellaneous||[]]]){
    if(!rows.length)continue;if(y+45>height-45){page();}group(title);
    rows.forEach((item,index)=>{const notes=[item.code,item.hsn?'HSN: '+item.hsn:'',item.gst?'GST: '+item.gst+'%':''].filter(Boolean).join(' | '),nameLines=referenceWrap(item.name+(notes?'  '+notes:''),xs[2]-xs[1]-12,8.5),notesLines=[],rowHeight=Math.max(22,7+nameLines.length*11+notesLines.length*9);if(y+rowHeight>height-45){page();group(title+' (CONTINUED)');}const top=y;
      tableRow([index+1,'',item.qty,item.unit,'₹ '+item.rate.toFixed(2),(item.discountType==='percent'?item.discountValue+'% / ':'')+'₹ '+item.discount.toFixed(2),'₹ '+item.amount.toFixed(2)],rowHeight);
      let nameY=top+12;for(const str of nameLines){text(str,xs[1]+6,nameY,8.5,true);nameY+=11;}for(const str of notesLines){text(str,xs[1]+6,nameY,6.8,false,'left','#555');nameY+=9;}
    });
  }
  const summary=[['Sub Total',m.gross],['Labour / Service discount',-m.serviceDiscount],['Spare parts discount',-m.partsDiscount],['Other discount',-round(m.discount-m.serviceDiscount-m.partsDiscount)],...(!m.nonGst?[['GST Tax',m.tax]]:[]),...(m.adjustment?[['Saved bill adjustment',m.adjustment]]:[]),...(m.rounding?[['Rounding adjustment',m.rounding]]:[]),['Total',m.total],['Initial advance',m.advance],['Total received',m.received],['Balance',m.balance]];
  const bankWidth=w*.4,termsWidth=w*.32,signWidth=w-bankWidth-termsWidth;
  const bankEntries=[m.business.bankName?'Bank: '+m.business.bankName:'',m.business.bankAccount?'Account No.: '+m.business.bankAccount:'',m.business.bankIfsc?'IFSC: '+m.business.bankIfsc:'',m.business.bankHolder?'Account Holder: '+m.business.bankHolder:'',m.business.upi?'UPI: '+m.business.upi:''].filter(Boolean);
  const bankLines=bankEntries.reduce((sum,value)=>sum+referenceWrap(value,bankWidth-(m.business.qr?78:9)-9,6.8).length,0),footerLines=referenceWrap(m.business.footer,termsWidth-16,7.2).length,termsLines=referenceWrap(m.business.terms,termsWidth-16,6.8).length;
  const bankHeight=Math.max(108,30+bankLines*9.8,38+footerLines*10.2+termsLines*9.8),summaryHeight=24+summary.length*17,footerHeight=summaryHeight+bankHeight+18;
  if(y+24+footerHeight>height-margin){page();group('INVOICE TOTALS (CONTINUED)');}
  if(y+22+footerHeight<height-margin)tableRow(['','','','','','',''],20);
  tableRow(['','Total',m.parts.reduce((sum,row)=>sum+row.qty,0)+m.services.length,'','','₹ '+m.discount.toFixed(2),'₹ '+m.total.toFixed(2)],22,true);
  const split=margin+w*.58,summaryTop=y;rect(margin,y,w,summaryHeight);line(split,y,split,y+summaryHeight);text('INVOICE AMOUNT IN WORDS',margin+9,y+15,7);paragraph(m.words,margin+9,y+30,split-margin-18,9,true,3);line(margin,y+64,split,y+64);text('PAYMENT MODE',margin+9,y+79,7);text(m.mode,margin+9,y+95,9,true);if(m.receipts.length){text('Payments against due: '+m.receipts.length+' receipt(s)',margin+9,y+111,8);let paymentY=y+125;for(const receipt of m.receipts.slice(-3)){text(referenceDate(receipt.date)+' | '+(receipt.mode||'Payment')+' | ₹ '+Number(receipt.amount).toFixed(2),margin+9,paymentY,7.5);paymentY+=12;}}
  text('Amounts',split+8,y+15,8);for(let i=0;i<summary.length;i++){const [label,value]=summary[i],top=summaryTop+24+i*17,important=['Total','Balance'].includes(label);if(important)line(split,top-4,margin+w,top-4);text(label,split+8,top+8,8.5,important);text('₹ '+Number(value).toFixed(2),margin+w-8,top+8,8.5,important,'right',label==='Balance'&&value>0?'#b91c1c':/discount/i.test(label)?'#15803d':'#111');}
  y+=summaryHeight;rect(margin,y,w,bankHeight);line(margin+bankWidth,y,margin+bankWidth,y+bankHeight);line(margin+bankWidth+termsWidth,y,margin+bankWidth+termsWidth,y+bankHeight);image(m.business.qr,margin+8,y+13,62,62);const bankX=margin+(m.business.qr?78:9),bankTextWidth=bankWidth-(bankX-margin)-9;let by=y+15;text('Bank Details',bankX,by,8,true);by+=13;for(const value of [m.business.bankName?'Bank: '+m.business.bankName:'',m.business.bankAccount?'Account No.: '+m.business.bankAccount:'',m.business.bankIfsc?'IFSC: '+m.business.bankIfsc:'',m.business.bankHolder?'Account Holder: '+m.business.bankHolder:'',m.business.upi?'UPI: '+m.business.upi:''].filter(Boolean)){by=paragraph(value,bankX,by,bankTextWidth,6.8,false,2);}
  const termsX=margin+bankWidth+8;text('Terms and conditions',termsX,y+15,8,true);let ty=paragraph(m.business.footer,termsX,y+29,termsWidth-16,7.2,true);paragraph(m.business.terms,termsX,ty+4,termsWidth-16,6.8);
  const signX=margin+bankWidth+termsWidth;text('FOR '+m.business.name,signX+signWidth/2,y+18,7.5,true,'center');image(m.business.stamp,signX+signWidth/2-29,y+26,58,47);line(signX+10,y+80,margin+w-10,y+80,true);text(m.business.stampCaption,signX+signWidth/2,y+94,7,true,'center');
  for(let i=0;i<pages.length;i++)if(pages.length>1){commands=pages[i];text('Page '+(i+1)+' of '+pages.length,width-margin,height-15,7,false,'right');}
  return {width,height,pages};
}
function referenceSceneSvg(scene,page){const svg=scene.pages[page].map(c=>{if(c.type==='rect')return '<rect x="'+c.x+'" y="'+c.y+'" width="'+c.w+'" height="'+c.h+'" fill="'+c.fill+'" stroke="#111" stroke-width="0.8"/>';if(c.type==='line')return '<line x1="'+c.x+'" y1="'+c.y+'" x2="'+c.x2+'" y2="'+c.y2+'" stroke="#111" stroke-width="0.8"'+(c.dashed?' stroke-dasharray="2 3"':'')+'/>';if(c.type==='image')return '<image href="'+referenceEsc(c.src)+'" x="'+c.x+'" y="'+c.y+'" width="'+c.w+'" height="'+c.h+'" preserveAspectRatio="xMidYMid meet"/>';return '<text x="'+c.x+'" y="'+c.y+'" font-family="Arial, sans-serif" font-size="'+c.size+'" font-weight="'+(c.bold?'700':'400')+'" fill="'+c.color+'" text-anchor="'+({left:'start',right:'end',center:'middle'}[c.align])+'">'+referenceEsc(c.value)+'</text>';}).join('');return '<svg xmlns="http://www.w3.org/2000/svg" width="'+scene.width+'" height="'+scene.height+'" viewBox="0 0 '+scene.width+' '+scene.height+'" role="img" aria-label="Invoice page '+(page+1)+'"><rect width="100%" height="100%" fill="white"/>'+svg+'</svg>';}
function referenceImage(src){if(referenceInvoiceImageCache.has(src))return referenceInvoiceImageCache.get(src);const entry={image:new Image(),ready:null};entry.ready=new Promise(resolve=>{entry.image.onload=()=>resolve();entry.image.onerror=()=>resolve();});entry.image.src=src;referenceInvoiceImageCache.set(src,entry);return entry;}
function referenceSceneCanvas(scene){const scale=2,pages=scene.pages.map(()=>{const canvas=document.createElement('canvas');canvas.width=Math.round(scene.width*scale);canvas.height=Math.round(scene.height*scale);return canvas;}),canvas=document.createElement('canvas');canvas.width=pages[0].width;canvas.height=pages[0].height*pages.length;canvas.invoicePages=pages;canvas.invoiceWidthPoints=scene.width*595.28/794;
  const images=[...new Set(scene.pages.flat().filter(c=>c.type==='image').map(c=>c.src))];
  function draw(){scene.pages.forEach((commands,index)=>{const x=pages[index].getContext('2d');x.setTransform(scale,0,0,scale,0,0);x.fillStyle='#fff';x.fillRect(0,0,scene.width,scene.height);for(const c of commands){if(c.type==='text'){x.fillStyle=c.color;x.font=(c.bold?'700 ':'400 ')+c.size+'px Arial';x.textAlign=c.align;x.fillText(c.value,c.x,c.y);}else if(c.type==='image'){const image=referenceImage(c.src).image;if(image.complete&&image.naturalWidth){const ratio=Math.min(c.w/image.naturalWidth,c.h/image.naturalHeight),iw=image.naturalWidth*ratio,ih=image.naturalHeight*ratio;x.drawImage(image,c.x+(c.w-iw)/2,c.y+(c.h-ih)/2,iw,ih);}}else{x.strokeStyle='#111';x.lineWidth=.8;x.setLineDash(c.dashed?[2,3]:[]);if(c.type==='rect'){if(c.fill!=='none'){x.fillStyle=c.fill;x.fillRect(c.x,c.y,c.w,c.h);}x.strokeRect(c.x,c.y,c.w,c.h);}else{x.beginPath();x.moveTo(c.x,c.y);x.lineTo(c.x2,c.y2);x.stroke();}}}canvas.getContext('2d').drawImage(pages[index],0,index*pages[index].height);});}
  draw();canvas.invoiceReady=Promise.all(images.map(src=>referenceImage(src).ready)).then(draw);return canvas;
}
const canvasBeforeReferenceInvoice=a4InvoiceCanvas;
a4InvoiceCanvas=function(key,id){return useReferenceInvoiceLayout?referenceSceneCanvas(referenceInvoiceScene(referenceInvoiceModel(key,id))):canvasBeforeReferenceInvoice(key,id);};
const pngBeforeReferenceInvoice=canvasPng;
canvasPng=async function(canvas){if(canvas.invoiceReady)await canvas.invoiceReady;return pngBeforeReferenceInvoice(canvas);};
const pdfBeforeReferenceInvoice=invoiceCanvasPdf;
invoiceCanvasPdf=async function(canvas,id){
  if(!canvas.invoicePages)return pdfBeforeReferenceInvoice(canvas,id);await canvas.invoiceReady;
  const encoder=new TextEncoder(),chunks=[],offsets=[0];let position=0;const push=data=>{const bytes=typeof data==='string'?encoder.encode(data):data;chunks.push(bytes);position+=bytes.length;};
  const jpeg=await Promise.all(canvas.invoicePages.map(page=>new Promise((resolve,reject)=>page.toBlob(async blob=>blob?resolve({data:new Uint8Array(await blob.arrayBuffer()),width:page.width,height:page.height}):reject(Error('Invoice PDF image failed')),'image/jpeg',.95))));
  const objects=2+jpeg.length*3;push('%PDF-1.4\n');function object(id,body){offsets[id]=position;push(id+' 0 obj\n');body();push('\nendobj\n');}
  object(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));object(2,()=>push('<< /Type /Pages /Count '+jpeg.length+' /Kids ['+jpeg.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
  jpeg.forEach((image,index)=>{const pageId=3+index*3,imageId=pageId+1,contentId=pageId+2,w=Number(canvas.invoiceWidthPoints||595.28),h=w*image.height/image.width,content='q '+w+' 0 0 '+h+' 0 0 cm /Image Do Q';object(pageId,()=>push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Image '+imageId+' 0 R >> >> /Contents '+contentId+' 0 R >>'));object(imageId,()=>{push('<< /Type /XObject /Subtype /Image /Width '+image.width+' /Height '+image.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.data.length+' >>\nstream\n');push(image.data);push('\nendstream');});object(contentId,()=>push('<< /Length '+encoder.encode(content).length+' >>\nstream\n'+content+'\nendstream'));});
  const xref=position;push('xref\n0 '+(objects+1)+'\n0000000000 65535 f \n');for(let i=1;i<=objects;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');push('trailer\n<< /Size '+(objects+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');return new File(chunks,'Invoice-'+String(id).replace(/[^a-z0-9_-]/gi,'-')+'.pdf',{type:'application/pdf'});
};
function referenceInvoicePageOptions(){
  let options={};
  if(typeof activeInvoicePaper!=='undefined'&&typeof invoicePaperSizes!=='undefined'){const paper=invoicePaperSizes.find(p=>p.id===activeInvoicePaper);if(paper)options={width:Number(paper.width)*794/210,height:Number(paper.height)*794/210};}
  if(typeof activeInvoiceOrientation!=='undefined'&&activeInvoiceOrientation==='landscape'){const width=options.width||794;options.width=options.height||1123;options.height=width;}
  return options;
}
function paintReferenceInvoice(key,id){
  const old=document.querySelector('#modalBody .invoice');if(!old)return;
  const scene=referenceInvoiceScene(referenceInvoiceModel(key,id),referenceInvoicePageOptions()),sheet=document.createElement('div');sheet.className='invoice referenceInvoice';sheet.style.maxWidth=(scene.width*210/794)+'mm';sheet.innerHTML=scene.pages.map((_,i)=>'<section class="referenceInvoicePage">'+referenceSceneSvg(scene,i)+'</section>').join('');old.replaceWith(sheet);
}
function printReferenceInvoice(){
  const options=referenceInvoicePageOptions(),width=(options.width||794)*210/794,height=(options.height||1123)*210/794;
  clearInvoicePrintMode();const style=document.createElement('style');style.id='a4PageSize';style.textContent='@media print{@page{size:'+width+'mm '+height+'mm;margin:0}body.printingA4 .invoice.referenceInvoice{width:'+width+'mm!important;max-width:'+width+'mm!important}}';document.head.appendChild(style);document.body.classList.add('printingA4');
  const cleanup=()=>{clearInvoicePrintMode();window.removeEventListener('afterprint',cleanup);};window.addEventListener('afterprint',cleanup);try{window.print();}catch{cleanup();toast('Use Download Invoice PDF if this browser cannot open a print window.');}
}
const printBeforeReferenceInvoice=printA4Invoice;
printA4Invoice=function(){return useReferenceInvoiceLayout?printReferenceInvoice():printBeforeReferenceInvoice();};
function saveInvoiceGstNumbers(key,id,businessValue,customerValue){
  const record=find(key,id);if(!record)return false;
  const normalize=value=>String(value||'').trim().toUpperCase();
  const business=normalize(businessValue),customer=normalize(customerValue);
  if([business,customer].some(value=>value&&!/^[A-Z0-9]{15}$/.test(value))){toast('Enter a 15-character GST number, or leave it blank if not applicable.');return false;}
  const beforeSettings=structuredClone(db.settings),beforeRecord=structuredClone(record);
  db.settings.gst=business;record.customerGst=customer;
  if(save('GST numbers saved for invoicing')===false){db.settings=beforeSettings;for(const key of Object.keys(record))delete record[key];Object.assign(record,beforeRecord);return false;}
  return true;
}
function addInvoiceGstFields(key,id){
  const controls=document.querySelector('#modalBody .invoiceFormatControls'),record=find(key,id);if(!controls||!record||controls.querySelector('.invoiceGstDetails'))return;
  const customer=find('customers',record.customer)||{},details=document.createElement('details');details.className='invoiceGstDetails';details.style.cssText='width:100%;flex:0 0 100%;padding:8px;border:1px solid #cbd5e1;background:white;';
  details.innerHTML='<summary style="cursor:pointer;font-weight:600">GST numbers</summary><div class="formgrid" style="padding-top:10px"><label class="field"><span>Business GST No. (GSTIN)</span><input id="invoiceBusinessGst" type="text" maxlength="15" autocomplete="off" value="'+referenceEsc(db.settings.gst||'')+'" placeholder="Enter business GST number"></label><label class="field"><span>Customer GST No. (GSTIN, optional)</span><input id="invoiceCustomerGst" type="text" maxlength="15" autocomplete="off" value="'+referenceEsc(record.customerGst??customer.gst??'')+'" placeholder="Enter customer GST number"></label></div><p style="font-size:12px;margin:6px 0">Business GST number is used across invoices. The customer GST number is saved on this invoice. GST numbers print on GST invoices.</p><button type="button" class="btn small" data-save-invoice-gst>Save GST numbers</button>';
  controls.appendChild(details);details.querySelector('[data-save-invoice-gst]').onclick=()=>{const business=details.querySelector('#invoiceBusinessGst').value,customer=details.querySelector('#invoiceCustomerGst').value;if(saveInvoiceGstNumbers(key,id,business,customer))invoice(key,id,typeof activeInvoicePaper!=='undefined'?activeInvoicePaper:undefined);};
}
/* GST values stay on saved records and continue to print; omit the GST editor tile from invoice preview controls. */
addInvoiceGstFields=function(){};
if(typeof thermalReceiptMarkup==='function'){
  const thermalBeforeCustomerGst=thermalReceiptMarkup;
  thermalReceiptMarkup=function(key,id,width){const html=thermalBeforeCustomerGst(key,id,width),record=find(key,id);if(!record||invoiceTypeOf(record)==='non-gst')return html;const customerGst=record.customerGst??find('customers',record.customer)?.gst??'';return customerGst?html.replace('<table class="thermalItems">','<p>Customer GST No. (GSTIN): '+referenceEsc(customerGst)+'</p><table class="thermalItems">'):html;};
}
const invoiceBeforeReferenceLayout=invoice;
invoice=function(key,id,paper){invoiceBeforeReferenceLayout(key,id,paper);if(!['jobs','sales'].includes(key))return;addInvoiceGstFields(key,id);
  const controls=document.querySelector('#modalBody .invoiceFormatControls');if(controls){const label=document.createElement('label');label.className='invoiceStyleChoice';label.innerHTML='<input type="checkbox" id="useReferenceInvoiceLayout" '+(useReferenceInvoiceLayout?'checked':'')+'> Reference invoice layout (saved default)';controls.appendChild(label);label.querySelector('input').onchange=e=>{if(!saveReferenceInvoiceDefault(e.target.checked)){e.target.checked=useReferenceInvoiceLayout;return;}useReferenceInvoiceLayout=e.target.checked;invoice(key,id,paper);};}
  if(useReferenceInvoiceLayout){for(const button of document.querySelectorAll('#modalBody .formactions button'))if(/^Print/.test(button.textContent.trim())){button.removeAttribute('data-action');button.onclick=printReferenceInvoice;}paintReferenceInvoice(key,id);document.getElementById('invoicePageOrientation')?.addEventListener('change',()=>paintReferenceInvoice(key,id));}
  const footer=document.querySelector('#modalBody .formactions');if(footer&&!footer.querySelector('[data-reference-pdf]')){const button=document.createElement('button');button.type='button';button.className='btn secondary';button.dataset.referencePdf='';button.textContent='Download Invoice PDF';button.onclick=async()=>{button.disabled=true;try{const canvas=useReferenceInvoiceLayout?referenceSceneCanvas(referenceInvoiceScene(referenceInvoiceModel(key,id),referenceInvoicePageOptions())):a4InvoiceCanvas(key,id);const file=await invoiceCanvasPdf(canvas,id),url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(error){toast('Could not prepare PDF: '+error.message);}finally{button.disabled=false;}};footer.prepend(button);}
};
const referenceInvoiceStyle=document.createElement('style');referenceInvoiceStyle.textContent='.invoice.referenceInvoice{padding:0!important;background:#fff!important;border:0!important;box-shadow:none!important;width:100%;max-width:210mm;margin:0 auto}.referenceInvoicePage{padding:0!important;background:#fff}.referenceInvoicePage+ .referenceInvoicePage{margin-top:16px;border-top:1px solid #cbd5e1}.referenceInvoicePage>svg{display:block;width:100%;height:auto}@media print{.invoice.referenceInvoice{padding:0!important;max-width:none!important;width:100%!important}.referenceInvoicePage{break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always;margin:0!important;border:0!important}.referenceInvoicePage:last-child{break-after:auto;page-break-after:auto}}';document.head.appendChild(referenceInvoiceStyle);
for(const src of [db.settings.logo||db.settings.logoImage,db.settings.upiQrImage,db.settings.stampImage])if(src&&typeof validInvoiceImage==='function'&&validInvoiceImage(src))referenceImage(src);


