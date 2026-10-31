/* Paper is chosen for each invoice; no default paper-size setting is shown. */
const settingsWithoutPaperCards=settingsPage;
settingsPage=function(){let html=settingsWithoutPaperCards(),start=html.indexOf('<section class="panel"><div class="panelhead"><h2>Invoice Samples by Paper Size</h2>');if(start<0)return html;let end=html.indexOf('</section>',start);return end<0?html:html.slice(0,start)+html.slice(end+10)};
render();
