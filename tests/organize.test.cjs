const {test}=require('node:test'),assert=require('node:assert/strict'),{createSystem}=require('./harness.cjs');

function gridSheet(name){
  const s={name,grid:[],frozen:0,getName:()=>s.name,setName(n){s.name=n;},getFormUrl:()=>null,
    getLastRow:()=>{let n=0;s.grid.forEach((r,i)=>{if(r&&r.some(v=>v!==''&&v!==undefined&&v!==null))n=i+1;});return n;},
    getLastColumn:()=>Math.max(0,...s.grid.map(r=>r?r.length:0)),getMaxColumns:()=>Math.max(30,s.getLastColumn()),setFrozenRows(n){s.frozen=n;},
    deleteRows(from,count){s.grid.splice(from-1,count);},
    getRange(row,col,nr=1,nc=1){const range={
      setValues(v){v.forEach((line,i)=>line.forEach((x,j)=>{(s.grid[row-1+i]=s.grid[row-1+i]||[])[col-1+j]=x;}));return range;},
      setRichTextValues(v){return range.setValues(v);},
      getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>((s.grid[row-1+i]||[])[col-1+j])??'')),
      clearContent(){for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)if(s.grid[row-1+i])s.grid[row-1+i][col-1+j]='';return range;},
      setNumberFormat:()=>range,setFontWeight:()=>range,setBackground:()=>range,setFontColor:()=>range,setWrap:()=>range};return range;}};
  return s;
}
function richText(){const b={text:'',links:[],setText(t){b.text=t;return b;},setLinkUrl(st,en,url){b.links.push({text:b.text.slice(st,en),url});return b;},build:()=>({text:b.text,links:b.links.slice(),toString(){return b.text;}})};return b;}
function fakeSheet(name,rows,formUrl){const s={name,rows,getName:()=>s.name,setName(n){s.name=n;},getLastRow:()=>s.rows,getFormUrl:()=>formUrl||null,copyTo(dest){const copy=fakeSheet('Copia de '+s.name,s.rows);dest.sheets.push(copy);return copy;}};return s;}
function fakeBook(id,sheets){const b={id,sheets,getId:()=>id,getSheets:()=>b.sheets.slice(),getSheetByName:n=>b.sheets.find(s=>s.name===n)||null,deleteSheet(s){assert.ok(b.sheets.length>1,'cannot delete the last tab');b.sheets=b.sheets.filter(x=>x!==s);},insertSheet(n,i){const sh=gridSheet(n);b.sheets.splice(i||0,0,sh);return sh;},setSpreadsheetTimeZone(){}};return b;}

test('organizeSpreadsheet leaves only the one-row-per-student tab in the main spreadsheet',()=>{
  const s=createSystem(),names=Object.keys(s.ctx.UMA.schema);
  const main=fakeBook('sheet',[...names.map(n=>fakeSheet(n,3)),fakeSheet('Form Responses 1',6,'https://docs.google.com/forms/d/initial/edit'),fakeSheet('Form Responses 2',2,'https://docs.google.com/forms/d/correction/edit'),fakeSheet('Sheet1',0),fakeSheet('Notas',2)]);
  let system=null,moved=false,unlinked=false;
  s.ctx.SpreadsheetApp.openById=id=>id==='sheet'?main:system;
  s.ctx.SpreadsheetApp.create=name=>{system=fakeBook('system-book',[fakeSheet('Sheet1',0)]);system.name=name;return system;};
  const realFolder=s.ctx.DriveApp.getFolderById;
  s.ctx.DriveApp.getFileById=()=>({moveTo(){moved=true;},setSharing(){}});
  let rawUnlinked=false;s.ctx.SpreadsheetApp.newRichTextValue=richText;
  s.ctx.FormApp.openById=id=>({getDestinationId:()=> 'sheet',removeDestination(){if(id==='initial')rawUnlinked=true;else unlinked=true;}});
  const report=s.ctx.organizeSpreadsheet();
  assert.deepEqual(main.getSheets().map(x=>x.getName()),['Respuestas de estudiantes','Notas']);assert.ok(rawUnlinked);
  assert.ok(report.removed.includes('Form Responses 1'));
  assert.deepEqual(system.getSheets().map(x=>x.getName()).sort(),names.slice().sort());
  assert.equal(s.props.SYSTEM_SPREADSHEET_ID,'system-book');assert.ok(moved);assert.ok(unlinked);
  assert.ok(report.removed.includes('Form Responses 2')&&report.removed.includes('Sheet1'));
  assert.ok(report.kept.some(k=>k.startsWith('Notas')));
  // Running it again changes nothing.
  s.ctx.organizeSpreadsheet();
  assert.deepEqual(main.getSheets().map(x=>x.getName()),['Respuestas de estudiantes','Notas']);
  assert.equal(realFolder,s.ctx.DriveApp.getFolderById);
});

test('a copy that does not match stops before anything is deleted or switched',()=>{
  const s=createSystem(),names=Object.keys(s.ctx.UMA.schema);
  const main=fakeBook('sheet',[...names.map(n=>fakeSheet(n,3)),fakeSheet('Form Responses 1',6,'https://docs.google.com/forms/d/initial/edit')]);
  const system=fakeBook('system-book',[fakeSheet('Solicitudes',1)]);
  s.props.SYSTEM_SPREADSHEET_ID_PENDING='system-book';
  s.ctx.SpreadsheetApp.openById=id=>id==='sheet'?main:system;
  s.ctx.FormApp.openById=()=>({getDestinationId:()=> 'sheet',removeDestination(){}});
  assert.throws(()=>s.ctx.organizeSpreadsheet(),/no coincide/);
  assert.equal(main.getSheets().length,names.length+1);assert.equal(s.props.SYSTEM_SPREADSHEET_ID,undefined);
});

test('the system tables are read from the separate spreadsheet once it is set',()=>{
  const s=createSystem();s.props.SYSTEM_SPREADSHEET_ID='system-book';let opened='';
  s.ctx.SpreadsheetApp.openById=id=>{opened=id;return fakeBook(id,[]);};
  s.ctx.UMA_MEMO_={};s.ctx.book_();assert.equal(opened,'system-book');
  s.ctx.responsesBook_();assert.equal(opened,'sheet');
});

test('an old correction-form response with an invalid code is grouped by institutional email',()=>{
  const s=createSystem(),id=s.ctx.ingest_(s.response('first',s.valid()),false),a=s.ctx.application_(id);
  s.ctx.saveDecision({requestId:'observe-for-fallback',id,version:a.version,decision:'OBSERVED',category:'Datos incorrectos',observation:'Los datos no coinciden con los documentos.'});
  const values=s.valid({applicationId:'UMA-DC-2027-999999',token:'expired-or-wrong',institutionalEmail:a.institutionalEmail.toUpperCase(),identityNumber:a.identityNumber});
  const linked=s.ctx.ingest_(s.response('old-correction',values),true),after=s.ctx.application_(id);
  assert.equal(linked,id);assert.equal(after.status,'CORRECCION_RECIBIDA');assert.equal(after.revision,2);
  assert.match(after.issues,/formulario de corrección anterior/);
  assert.equal(s.ctx.listApplications({},1,20).stats.unlinked,0);
});

test('an old correction-form response that matches no student is closed instead of retried forever',()=>{
  const s=createSystem();
  const values=s.valid({applicationId:'UMA-DC-2027-999999',token:'wrong',institutionalEmail:'nobody@uma.edu.pe',identityNumber:'12345678'});
  assert.equal(s.ctx.ingest_(s.response('orphan',values),true),'');
  assert.equal(s.db.Eventos[0].status,'DONE');assert.match(s.db.Eventos[0].error,/DISCARDED/);
  assert.ok(s.db.Errores.some(e=>e.context==='CORRECTION_DISCARDED'));
  assert.equal(s.ctx.listApplications({},1,20).stats.unlinked,0);
});

test('the student sheet has one row per institutional email with every submission in date order',()=>{
  const s=createSystem(),main=fakeBook('sheet',[]);
  s.ctx.SpreadsheetApp.openById=()=>main;s.ctx.SpreadsheetApp.newRichTextValue=richText;s.props.RESPONSES_SHEET='summary';
  const first=s.response('first',s.valid());first.getTimestamp=()=>new Date('2026-11-20T19:33:51Z');
  const id=s.ctx.ingest_(first,false),a=s.ctx.application_(id);
  s.ctx.saveDecision({requestId:'observe-sheet-01',id,version:a.version,decision:'OBSERVED',category:'Datos incorrectos',observation:'Los datos no coinciden con los documentos.'});
  s.file('new_ficha_77777','nueva.pdf');
  const second=s.response('second',s.valid({identityNumber:'85677467',name:'Dae Fgggh',socioeconomic:['new_ficha_77777'],supporting:[]}));second.getTimestamp=()=>new Date('2026-11-20T20:07:13Z');
  s.ctx.ingest_(second,false);
  const other=s.response('other',s.valid({institutionalEmail:'otra@uma.edu.pe'}));s.ctx.ingest_(other,false);
  const sheet=main.getSheetByName('Respuestas de estudiantes'),header=sheet.grid[0],rows=sheet.grid.slice(1).filter(r=>r&&r[0]);
  assert.equal(rows.length,2,'one row per institutional email');
  const row=rows.find(r=>r[0]===id);
  assert.equal(row[1],'student@uma.edu.pe');assert.equal(row[4],'85677467');assert.equal(row[5],'Dae Fgggh');
  assert.equal(row[9],'Corrección recibida');assert.equal(row[10],'2');
  assert.equal(header[13],'Envío 1');assert.equal(header[14],'Envío 2');
  assert.match(row[13].text,/^Revisión 1 · 20\/11\/2026 14:33/);assert.match(row[14].text,/^Revisión 2 · 20\/11\/2026 15:07/);
  assert.deepEqual(row[13].links.map(l=>l.text),['Estudiante de Prueba_PNP_2027-I_Fichasocioeconomica','Estudiante de Prueba_PNP_2027-I_Documento-sustentatorio']);
  assert.equal(row[14].links[0].text,'Dae Fgggh_PNP_2027-I_Fichasocioeconomica');
  assert.equal(row[14].links.length,1);assert.ok(row[14].links[0].url.startsWith('https://drive.google.com/file/d/'));
});
