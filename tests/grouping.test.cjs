const {test}=require('node:test'),assert=require('node:assert/strict'),{createSystem}=require('./harness.cjs');
const submit=(s,id,overrides={})=>s.ctx.application_(s.ctx.ingest_(s.response(id,s.valid(overrides)),false));
const observe=(s,a)=>{s.ctx.saveDecision({requestId:'observe-'+a.id+'-'+a.version,id:a.id,version:a.version,decision:'OBSERVED',category:'Falta firma del estudiante',observation:'La ficha no tiene firma.',instructions:'Firme la ficha y vuelva a enviarla.'});return s.ctx.application_(a.id);};
const approve=(s,a)=>{s.ctx.saveDecision({requestId:'approve-'+a.id+'-'+a.version,id:a.id,version:a.version,decision:'APPROVED',siguConfirmed:true});return s.ctx.application_(a.id);};

test('an observed application stays pending until the student resubmits and Treasury approves',()=>{
  const s=createSystem(),observed=observe(s,submit(s,'first'));
  assert.equal(observed.status,'OBSERVADA');
  assert.equal(s.ctx.listApplications({pendingOnly:true},1,20).total,1);
  assert.equal(s.ctx.listApplications({},1,20).stats.pending,1);
  const resubmitted=submit(s,'second');
  assert.equal(resubmitted.id,observed.id);assert.equal(resubmitted.status,'CORRECCION_RECIBIDA');assert.equal(resubmitted.revision,2);
  assert.equal(resubmitted.correctionExpiresAt,'');
  assert.equal(s.ctx.listApplications({queue:'review'},1,20).total,1);
  const applied=approve(s,resubmitted);
  assert.equal(applied.status,'APLICADA_SIGU');
  assert.equal(s.ctx.listApplications({pendingOnly:true},1,20).total,0);
  assert.equal(s.ctx.listApplications({},1,20).stats.applied,1);
});

test('a submission after approval keeps the approval and raises an alert for Treasury',()=>{
  const s=createSystem(),applied=approve(s,submit(s,'first'));
  const later=submit(s,'later',{identityNumber:'0090900090'});
  assert.equal(later.id,applied.id);assert.equal(later.status,'APLICADA_SIGU');assert.equal(later.identityNumber,applied.identityNumber);
  assert.match(later.issues,/después de aplicar/);assert.match(later.issues,/Número de documento inválido/);
  assert.equal(later.submissions,2);
  const ack=s.ctx.acknowledgeIssues(later.id,later.version);assert.equal(s.ctx.application_(later.id).issues,'');assert.equal(ack.version,later.version+1);
  assert.throws(()=>s.ctx.acknowledgeIssues(later.id,later.version),/cambió/);
});

test('upgrade regroups responses that the identity-based version dropped',()=>{
  const s=createSystem(),a=submit(s,'r1'),responses={r1:s.response('r1',s.valid()),r2:s.response('r2',s.valid({identityNumber:'11111111'})),r3:s.response('r3',s.valid({identityNumber:'0090900090'}))};
  s.db.Eventos.push({key:'initial:r2',formId:'initial',responseId:'r2',applicationId:a.id,revision:1,status:'DONE',error:'DUPLICATE_APPLICATION',timestamp:'2026-11-20T15:00:00Z',attempts:1});
  s.db.Eventos.push({key:'initial:r3',formId:'initial',responseId:'r3',applicationId:'',revision:'',status:'ERROR',error:'Número de documento inválido',timestamp:'2026-11-20T16:00:00Z',attempts:4,retryAt:'2099-01-01T00:00:00Z'});
  s.ctx.FormApp.openById=()=>({getResponses:()=>[],getResponse:id=>responses[id]});
  s.ctx.reconcileSubmissions();
  assert.equal(s.props.DATA_MODEL,'email-v2');
  assert.equal(s.db.Solicitudes.length,1);
  const grouped=s.ctx.application_(a.id);assert.equal(grouped.submissions,3);assert.equal(grouped.revision,3);
  assert.ok(s.db.Eventos.every(e=>e.status==='DONE'&&e.applicationId===a.id));
  assert.equal(s.ctx.listApplications({},1,20).stats.unlinked,0);
});

test('upgrade flags, without merging, older applications that share an institutional email',()=>{
  const s=createSystem(),a=submit(s,'r1');
  s.db.Solicitudes.push({...s.db.Solicitudes[0],id:'UMA-DC-2027-000099',identityNumber:'12345678',initialResponseId:'old',issues:''});
  s.ctx.FormApp.openById=()=>({getResponses:()=>[],getResponse:()=>null});
  s.ctx.reconcileSubmissions();s.ctx.reconcileSubmissions();
  assert.equal(s.db.Solicitudes.length,2);
  assert.match(s.ctx.application_(a.id).issues,/UMA-DC-2027-000099/);
  assert.equal((s.ctx.application_('UMA-DC-2027-000099').issues.match(/mismo correo/g)||[]).length,1);
});

test('receipt emails are optional, idempotent and never change the decision email status',()=>{
  const s=createSystem();s.props.RECEIPT_EMAIL_ENABLED='true';
  const a=submit(s,'first',{identityNumber:'123'});submit(s,'first');
  assert.equal(s.db.Correos.length,1);assert.equal(s.db.Correos[0].type,'RECEIVED');
  assert.match(s.db.Correos[0].body,/Número de documento inválido/);
  s.ctx.processEmailQueue();assert.equal(s.sent.length,1);assert.equal(s.ctx.application_(a.id).emailStatus,'');
  approve(s,s.ctx.application_(a.id));s.ctx.processEmailQueue();assert.equal(s.sent.length,2);assert.equal(s.ctx.application_(a.id).emailStatus,'SENT');
});

test('the minute trigger exits without reading sheets once the queue is empty',()=>{
  const s=createSystem();approve(s,submit(s,'first'));
  s.ctx.processEmailQueue();assert.equal(s.props.MAIL_QUEUE_STATE,'idle');
  const rows=s.ctx.rows_;s.ctx.rows_=()=>{throw new Error('sheet read while idle');};
  assert.deepEqual(JSON.parse(JSON.stringify(s.ctx.processEmailQueue())),{idle:true});
  s.ctx.rows_=rows;
  s.ctx.updateSettings({emailEnabled:true});assert.equal(s.props.MAIL_QUEUE_STATE,'active');
});

test('filters and statistics use Lima dates, not UTC dates',()=>{
  const c=createSystem().ctx,rows=[{id:'1',status:'RECIBIDA',createdAt:'2026-11-21T02:00:00.000Z'}];
  assert.equal(c.limaDate_('2026-11-21T02:00:00.000Z'),'2026-11-20');
  assert.equal(c.filtered_(rows,{from:'2026-11-20',to:'2026-11-20'}).length,1);
  assert.equal(c.statistics_(rows,[]).byDay['2026-11-20'],1);
});
