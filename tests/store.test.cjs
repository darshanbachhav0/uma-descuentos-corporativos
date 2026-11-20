// Exercises src/Store.gs against an in-memory spreadsheet (the system harness replaces these functions).
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fakeSheet(rows){
  const s={rows,reads:0,maxColumns:rows[0]?rows[0].length:0,
    getDataRange(){return {getValues:()=>{s.reads++;const w=Math.max(0,...s.rows.map(r=>r.length));return s.rows.map(r=>Array.from({length:w},(_,i)=>r[i]??''));}};},
    getMaxColumns:()=>s.maxColumns,insertColumnsAfter(_,n){s.maxColumns+=n;},
    getRange(row,col,nr,nc){return {setValues(v){v.forEach((line,i)=>{const r=s.rows[row-1+i]||(s.rows[row-1+i]=[]);line.forEach((x,j)=>{r[col-1+j]=stored(x);});});}};},
    appendRow(r){s.rows.push(r.map(stored));}};
  return s;
}
// Google Sheets keeps text written with a leading apostrophe as plain text.
const stored=v=>typeof v==='string'&&v.startsWith("'")?v.slice(1):v;
function load(sheets){
  const ctx={console,SpreadsheetApp:{openById:()=>({getSheetByName:n=>sheets[n]||null})},PropertiesService:{getScriptProperties:()=>({getProperties:()=>({SPREADSHEET_ID:'x'}),getProperty:()=>null,setProperty(){}})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},Utilities:{getUuid:()=>'u'}};
  vm.createContext(ctx);for(const f of ['Config.gs','Domain.gs','Store.gs'])vm.runInContext(fs.readFileSync('src/'+f,'utf8'),ctx,{filename:f});return ctx;
}
test('a table is read once per execution and writes keep the in-memory copy current',()=>{
  const sheet=fakeSheet([['key','applicationId','fromStatus','toStatus','reviewer','timestamp','detail']]),c=load({Historial_Estados:sheet});
  c.append_('Historial_Estados',{key:'a',applicationId:'1',detail:'x'});
  c.put_('Historial_Estados',{key:'a',detail:'y'});
  c.put_('Historial_Estados',{key:'b',applicationId:'00123'});
  assert.equal(c.rows_('Historial_Estados').length,2);
  assert.equal(c.find_('Historial_Estados','key','a').detail,'y');
  assert.equal(c.find_('Historial_Estados','key','a').applicationId,'1');
  assert.equal(c.find_('Historial_Estados','key','b').applicationId,'00123');
  assert.equal(sheet.reads,1);
  assert.equal(sheet.rows[2][1],'00123');
  c.locked_(()=>c.rows_('Historial_Estados'));assert.equal(sheet.reads,2,'the lock must force a fresh read');
});
test('columns added to the schema are appended to an existing sheet without touching data',()=>{
  const old=['id','createdAt','status'],sheet=fakeSheet([[...old],['UMA-1','2026-11-20','RECIBIDA']]),c=load({Solicitudes:sheet});
  const rows=c.rows_('Solicitudes');
  assert.equal(rows[0].id,'UMA-1');assert.equal(rows[0].issues,'');
  assert.ok(sheet.rows[0].includes('issues')&&sheet.rows[0].includes('submissions'));
  assert.deepEqual(sheet.rows[0].slice(0,3),old);
  c.put_('Solicitudes',{id:'UMA-1',status:'OBSERVADA',issues:'Revisión 2: alerta'},'id');
  assert.equal(sheet.rows[1][2],'OBSERVADA');assert.equal(sheet.rows[1][sheet.rows[0].indexOf('issues')],'Revisión 2: alerta');
  assert.equal(sheet.rows[1][1],'2026-11-20');
});

test('clearing a table keeps the header and one blank row, and later writes start at row 2',()=>{
  const sheet=fakeSheet([['key','applicationId','fromStatus','toStatus','reviewer','timestamp','detail'],['a','1'],['b','2'],['c','3']]);
  sheet.getLastRow=()=>sheet.rows.filter(r=>r.some(v=>v!==''&&v!==undefined)).length;
  sheet.deleteRows=(from,count)=>{sheet.rows.splice(from-1,count);};
  const range=sheet.getRange.bind(sheet);sheet.getRange=(row,col,nr,nc)=>({...range(row,col,nr,nc),clearContent(){sheet.rows[row-1]=sheet.rows[row-1].map(()=> '');}});
  const c=load({Historial_Estados:sheet});
  assert.equal(c.rows_('Historial_Estados').length,3);
  c.clearTable_('Historial_Estados');
  assert.equal(c.rows_('Historial_Estados').length,0);
  assert.equal(sheet.rows[0][0],'key');
  c.append_('Historial_Estados',{key:'new',applicationId:'9'});
  assert.equal(c.rows_('Historial_Estados').length,1);
});
