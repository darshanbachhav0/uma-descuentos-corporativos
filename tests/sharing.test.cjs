const {test}=require('node:test'),assert=require('node:assert/strict'),{createSystem}=require('./harness.cjs');

/** The main spreadsheet as Drive sees it: who it is shared with and its link setting. */
function withSheet(s,sheet){
  const realFile=s.ctx.DriveApp.getFileById;
  s.ctx.DriveApp.getFileById=id=>id==='sheet'?{getEditors:()=>sheet.editors.map(e=>({getEmail:()=>e})),getViewers:()=>sheet.viewers.map(e=>({getEmail:()=>e})),getSharingAccess:()=>sheet.link}:realFile(id);
  return sheet;
}
const period=s=>[...s.folders.values()].find(f=>f.parent==='root'&&f.name==='2027-I');

test('everyone the spreadsheet is shared with can view the documents, including later ones',()=>{
  const s=createSystem(),sheet=withSheet(s,{editors:['contactotesoreriauma@gmail.com','editor@uma.edu.pe'],viewers:['Viewer@Gmail.com'],link:'PRIVATE'});
  s.ctx.ingest_(s.response('first',s.valid()),false);
  const report=s.ctx.shareDocumentsWithSheetUsers();
  assert.deepEqual([...period(s).viewers].sort(),['editor@uma.edu.pe','viewer@gmail.com']);
  assert.ok(!period(s).viewers.has('contactotesoreriauma@gmail.com'),'the owner is not added to their own folder');
  assert.equal(report.link,'');
  // Documents stay without link access: access comes from the period folder.
  assert.ok(s.db.Documentos.length>0);
  s.db.Documentos.forEach(d=>assert.equal(s.files.get(d.fileId).sharing,'PRIVATE'));
  assert.equal(s.folders.get('exports').viewers.size,0,'exports are never shared');
  assert.equal(s.folders.get('root').viewers.size,0,'the system folder is never shared');
  // Nothing changed: the 10-minute sync does no work.
  assert.equal(s.ctx.syncDocumentAccess_(false).changed,false);
  // Someone removed from the spreadsheet loses access at the next sync; a new person gains it.
  sheet.viewers=['new@uma.edu.pe'];
  assert.equal(s.ctx.syncDocumentAccess_(false).changed,true);
  assert.deepEqual([...period(s).viewers].sort(),['editor@uma.edu.pe','new@uma.edu.pe']);
});

test('a spreadsheet shared by link gives every document a view-only link, and back',()=>{
  const s=createSystem(),sheet=withSheet(s,{editors:[],viewers:[],link:'ANYONE_WITH_LINK'});
  s.ctx.ingest_(s.response('first',s.valid()),false);
  s.ctx.syncDocumentAccess_(false);
  s.db.Documentos.forEach(d=>{const f=s.files.get(d.fileId);assert.equal(f.sharing,'ANYONE_WITH_LINK');assert.equal(f.permission,'VIEW');});
  // New copies follow the stored setting immediately.
  s.ctx.ingest_(s.response('other',s.valid({institutionalEmail:'otra@uma.edu.pe'})),false);
  s.db.Documentos.forEach(d=>assert.equal(s.files.get(d.fileId).sharing,'ANYONE_WITH_LINK'));
  sheet.link='PRIVATE';s.ctx.syncDocumentAccess_(false);
  s.db.Documentos.forEach(d=>assert.equal(s.files.get(d.fileId).sharing,'PRIVATE'));
});

test('a new period folder is shared with the spreadsheet users when it is created',()=>{
  const s=createSystem();withSheet(s,{editors:[],viewers:['viewer@gmail.com'],link:'PRIVATE'});
  s.ctx.syncDocumentAccess_(false);
  assert.equal(period(s),undefined);
  s.ctx.ingest_(s.response('first',s.valid()),false);
  assert.deepEqual([...period(s).viewers],['viewer@gmail.com']);
});

test('a sharing failure never blocks a submission',()=>{
  const s=createSystem();s.props.DOCUMENT_ACCESS=JSON.stringify({users:['x@gmail.com'],link:'ANYONE_WITH_LINK',folders:[]});
  const realFolder=s.ctx.DriveApp.getFolderById;
  s.ctx.DriveApp.getFolderById=id=>{const f=realFolder(id);f.addViewer=()=>{throw new Error('Invalid email');};return f;};
  const id=s.ctx.ingest_(s.response('first',s.valid()),false);
  assert.ok(id);assert.equal(s.db.Eventos[0].status,'DONE');assert.ok(s.db.Documentos.length>0);
});
