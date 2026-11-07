const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/enhancements.js'),'utf8').split(/\r?\n/);
test('different browser logo settings produce the same app sidebar logo',()=>{
 const results=[];
 for(const savedLogo of ['data:image/png;base64,KMS','data:image/png;base64,DOCTOR']){
  const brand={classList:{contains(){return false}},outerHTML:''},context={db:{settings:{logo:savedLogo}},page:'dashboard',originalRender(){},$:()=>brand};
  vm.createContext(context);vm.runInContext(source.find(line=>line.startsWith('function appLogoMarkup('))+'\n'+source.find(line=>line.startsWith('render=function(){originalRender();'))+'\nrender();',context);
  results.push(brand.outerHTML);assert.equal(context.db.settings.logo,savedLogo);
 }
 assert.equal(results[0],results[1]);assert.match(results[0],/bike-doctor-icon-192\.png/);assert.doesNotMatch(results[0],/KMS/);
});
test('HTML and installation manifest reference the supplied Doctor logo',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/manifest.webmanifest'),'utf8'));
 assert.match(html,/<img class="garageLogo appBrandLogo" src="bike-doctor-icon-192.png"/);
 assert.ok(manifest.icons.every(icon=>icon.src.includes('bike-doctor-')));
 for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(__dirname,'../dist',icon.src)));
});
