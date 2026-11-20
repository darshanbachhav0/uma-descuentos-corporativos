const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSystem}=require('./harness.cjs');

function approve(s,index=1){
  const id=s.ctx.ingest_(s.response('email-response-'+index,s.valid({identityNumber:String(10000000+index),institutionalEmail:'student'+index+'@gmail.com'})),false);
  const a=s.ctx.application_(id);
  s.ctx.saveDecision({requestId:'email-decision-'+index,id:a.id,version:a.version,decision:'APPROVED',siguConfirmed:true});
  return a;
}
function textFromHtml(html){
  const entities={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"};
  return html.replace(/<br>/g,'\n').replace(/<[^>]*>/g,'').replace(/&(amp|lt|gt|quot|#39);/g,entity=>entities[entity]);
}

test('approval retains required subject and wording, with application context and reply address in both MIME alternatives',()=>{
  const s=createSystem(),a=approve(s),original=s.ctx.approvedEmail_(a);
  const mail=s.sent[0];
  assert.equal(mail.subject,original.subject);
  assert.ok(mail.body.startsWith(original.body+'\n\n---\n'));
  assert.ok(mail.body.includes('Referencia de solicitud: '+a.id));
  assert.ok(mail.body.includes('Fecha de presentación: 2026-11-19'));
  assert.ok(mail.body.includes('porque presentó una solicitud'));
  assert.ok(mail.body.includes(s.ctx.UMA.owner));
  assert.equal(mail.replyTo,s.ctx.UMA.owner);assert.equal(mail.name,'Tesorería UMA');
  assert.equal(mail.to,a.institutionalEmail);assert.equal(mail.cc,undefined);assert.equal(mail.bcc,undefined);assert.equal(mail.from,undefined);
  assert.equal(textFromHtml(mail.htmlBody),mail.body);
  assert.equal(s.db.Correos[0].body,mail.body);
  assert.ok(!mail.body.includes(a.identityNumber));assert.ok(!mail.body.includes(a.folderUrl));
  assert.ok(!/<img|<script|display\s*:\s*none|visibility\s*:\s*hidden/i.test(mail.htmlBody));
});

test('existing pending notifications acquire context once; SENT messages are never changed or sent again',()=>{
  const s=createSystem();s.props.EMAIL_NOTIFICATION_ENABLED='false';const a=approve(s);s.props.EMAIL_NOTIFICATION_ENABLED='true';
  s.db.Correos[0].body=s.ctx.approvedEmail_(a).body;
  s.ctx.processEmailQueue();const delivered={...s.db.Correos[0]};
  s.ctx.processEmailQueue();
  assert.equal(s.sent.length,1);assert.deepEqual(s.db.Correos[0],delivered);
  assert.equal((delivered.body.match(/Referencia de solicitud:/g)||[]).length,1);
  assert.equal(s.ctx.deliveryBody_(delivered.body,a),delivered.body);
});

test('queue limits each minute-trigger run to three messages and drains the rest without duplicates',()=>{
  const s=createSystem();s.props.EMAIL_NOTIFICATION_ENABLED='false';for(let i=1;i<=7;i++)approve(s,i);s.props.EMAIL_NOTIFICATION_ENABLED='true';
  assert.equal(s.ctx.processEmailQueue().sent,3);assert.equal(s.sent.length,3);
  assert.equal(s.db.Correos.filter(m=>m.status==='PENDING').length,4);
  assert.equal(s.ctx.processEmailQueue().sent,3);
  assert.equal(s.ctx.processEmailQueue().sent,1);
  assert.equal(s.ctx.processEmailQueue().idle,true);
  assert.equal(new Set(s.sent.map(m=>m.to)).size,7);
  assert.equal(s.db.Correos.filter(m=>m.status==='SENT').length,7);
});

test('HTML escapes untrusted content and preserves complete correction URLs and matching visible link destinations',()=>{
  const c=createSystem().ctx;
  const body='Estudiante <img src=x onerror="alert(1)"> & nombre\nhttps://docs.google.com/forms/d/e/correction/viewform?entry.1=UMA-DC&entry.2=a_b-c\nhttps://example.com/" onmouseover="alert(2)';
  const html=c.mailHtml_(body);
  assert.equal(textFromHtml(html),body);
  assert.ok(!html.includes('<img'));assert.ok(!/<a[^>]*\sonmouseover=/.test(html));
  assert.ok(html.includes('href="https://docs.google.com/forms/d/e/correction/viewform?entry.1=UMA-DC&amp;entry.2=a_b-c"'));
  for(const match of html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g))assert.equal(match[1],match[2]);
});

test('observed notification links the same application form with no secure code',()=>{
  const s=createSystem(),id=s.ctx.ingest_(s.response('observed-email',s.valid()),false),a=s.ctx.application_(id);
  s.ctx.saveDecision({requestId:'observed-email-decision',id,version:a.version,decision:'OBSERVED',category:'Falta firma del estudiante',observation:'La ficha no tiene firma. Fírmela y vuelva a adjuntarla.'});
  const observed=s.ctx.application_(id),mail=s.sent[0];
  assert.ok(mail.body.includes('https://docs.google.com/forms/d/e/test/viewform'));
  assert.ok(mail.body.includes(observed.institutionalEmail));
  assert.ok(mail.body.includes('Fírmela y vuelva a adjuntarla.'));
  assert.ok(!/código seguro|token|entry\.|vence/i.test(mail.body));
  assert.equal(textFromHtml(mail.htmlBody),mail.body);
  assert.ok(mail.body.startsWith(s.ctx.observedEmail_(observed,'https://docs.google.com/forms/d/e/test/viewform').body+'\n\n---\n'));
});

test('a delivery problem after the decision is saved is reported, not raised',()=>{
  const s=createSystem(),id=s.ctx.ingest_(s.response('bad-recipient',s.valid()),false),a=s.ctx.application_(id);
  const original=s.ctx.sendQueued_;s.ctx.sendQueued_=()=>{throw new Error('Destinatario de cola inválido');};
  const result=s.ctx.saveDecision({requestId:'decision-bad-recipient',id,version:a.version,decision:'APPROVED',siguConfirmed:true});
  s.ctx.sendQueued_=original;
  assert.equal(s.ctx.application_(id).status,'APLICADA_SIGU');
  assert.equal(result.email.status,'PENDING');assert.match(result.email.error,/cola/);
});
