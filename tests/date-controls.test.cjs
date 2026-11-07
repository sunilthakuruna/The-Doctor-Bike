const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/date-format.js'),'utf8');
const helper=source.slice(source.indexOf('function openLocalDatePicker'),source.indexOf('function updateDatePresentation'));
const context=vm.createContext({});
vm.runInContext(helper,context);
test('calendar opens the native picker synchronously without scrolling',()=>{
 let opened=0,focused;
 const input={focus(options){focused=options},showPicker(){opened++}};
 assert.equal(context.openLocalDatePicker(input),true);
 assert.equal(opened,1);assert.equal(focused.preventScroll,true);
});
test('disabled and readonly dates do not open calendar',()=>{
 for(const flag of ['disabled','readOnly']){
  assert.equal(context.openLocalDatePicker({[flag]:true,focus(){throw Error('unexpected focus')}}),false);
 }
});
test('unsupported or blocked picker enables native fallback',()=>{
 for(const showPicker of [undefined,()=>{throw Error('Unsupported')}]){
  let fallback='';
  const input={focus(){},showPicker,parentElement:{classList:{add(value){fallback=value}}}};
  assert.equal(context.openLocalDatePicker(input),false);
  assert.equal(fallback,'nativeCalendarFallback');
 }
});
