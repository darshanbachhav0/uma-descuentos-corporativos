const {test}=require('node:test'),assert=require('node:assert/strict'),{createSystem}=require('./harness.cjs');

test('documents are named Estudiante_Convenio_Periodo_Tipo',()=>{
  const s=createSystem(),n=s.ctx.documentName_;
  assert.equal(n({name:'Ana Pérez Ruiz',discount:'PNP'},'2027-I','socioeconomic',0,'pdf'),'Ana Pérez Ruiz_PNP_2027-I_Fichasocioeconomica.pdf');
  assert.equal(n({name:'Ana Pérez Ruiz',discount:'PNP'},'2027-I','supporting',0,'jpg'),'Ana Pérez Ruiz_PNP_2027-I_Documento-sustentatorio.jpg');
  // A second file of the same kind, "Otro" uses the agreement the student typed, and separators are cleaned.
  assert.equal(n({name:'Ana Pérez Ruiz',discount:'PNP'},'2027-I','supporting',1,'pdf'),'Ana Pérez Ruiz_PNP_2027-I_Documento-sustentatorio_2.pdf');
  assert.equal(n({name:'  Luis_Díaz / Soto ',discount:'Otro',otherDiscount:'Clínica: San Juan'},'2027-I','socioeconomic',0,'png'),'Luis Díaz Soto_Clínica San Juan_2027-I_Fichasocioeconomica.png');
  assert.equal(n({name:'',discount:'Familiar'},'2027-I','socioeconomic',0,''),'Sin dato_Familiar_2027-I_Fichasocioeconomica');
});

test('documents copied before the naming rule are renamed once in Drive and the data',()=>{
  const s=createSystem(),id=s.ctx.ingest_(s.response('first',s.valid()),false);
  s.db.Documentos.forEach(d=>{d.name='Ficha socioeconómica 1 · 2026-11-19 05.00.pdf';s.files.get(d.fileId).name=d.name;});
  const report=s.ctx.renameDocumentFiles();
  assert.equal(report.renamed,2);assert.equal(s.props.DOCUMENT_NAMES,'v1');
  const names=s.db.Documentos.filter(d=>d.applicationId===id).map(d=>d.name).sort();
  assert.deepEqual(names,['Estudiante de Prueba_PNP_2027-I_Documento-sustentatorio.pdf','Estudiante de Prueba_PNP_2027-I_Fichasocioeconomica.pdf']);
  s.db.Documentos.forEach(d=>assert.equal(s.files.get(d.fileId).name,d.name));
  assert.equal(s.ctx.renameDocumentFiles().renamed,0,'running it again changes nothing');
});
