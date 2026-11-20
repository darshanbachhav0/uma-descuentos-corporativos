function exportExcel(filter) {
  var actor=reviewer_(),c=config_(),apps=filtered_(rows_('Solicitudes'),filter),ids=apps.map(function(a){return a.id;}),docs=rows_('Documentos').filter(function(d){return ids.indexOf(d.applicationId)>=0;});
  var temp=SpreadsheetApp.create('UMA export temporal '+Utilities.getUuid()),file;
  try{
    var sheet=temp.getSheets()[0];sheet.setName('Solicitudes');
    var fields=['id','createdAt','period','name','identityType','identityNumber','institutionalEmail','personalEmail','school','discount','otherDiscount','status','revision','reviewer','reviewedAt','siguConfirmedAt','siguReference','category','observation','instructions','emailStatus','submissions','lastSubmissionAt','issues','folderUrl'];
    var headers=['Código','Fecha de envío','Periodo','Estudiante','Tipo documento','Número documento','Correo institucional','Correo personal','Escuela','Convenio','Otro convenio','Estado','Revisión','Revisor','Fecha revisión','SIGU confirmado','Referencia SIGU','Categoría observación','Observación','Instrucciones','Estado correo','Envíos','Último envío','Alertas','Carpeta de documentos'];
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    if(apps.length){sheet.getRange(2,1,apps.length,fields.length).setNumberFormat('@').setValues(apps.map(function(a){return fields.map(function(k){return sheetValue_(a[k]);});}));
      // One batched write per column instead of one call per row keeps large exports fast.
      sheet.getRange(2,fields.indexOf('folderUrl')+1,apps.length,1).setRichTextValues(apps.map(function(a){return [SpreadsheetApp.newRichTextValue().setText('Abrir expediente').setLinkUrl(managementLink_(a.id)).build()];}));}
    var ds=temp.insertSheet('Documentos');ds.appendRow(['Solicitud','Revisión','Tipo','Archivo','Enlace']);
    if(docs.length){ds.getRange(2,1,docs.length,5).setValues(docs.map(function(d){return [d.applicationId,d.revision,d.kind,sheetValue_(d.name),managementLink_(d.applicationId,d.fileId)];}));ds.getRange(2,5,docs.length,1).setRichTextValues(docs.map(function(d){return [SpreadsheetApp.newRichTextValue().setText('Ver documento en la plataforma').setLinkUrl(managementLink_(d.applicationId,d.fileId)).build()];}));}
    var info=temp.insertSheet('Información');info.appendRow(['Exportado (UTC)',now_()]);info.appendRow(['Responsable',actor]);info.appendRow(['Origen',book_().getUrl()]);info.appendRow(['Filtros',JSON.stringify(filter||{})]);info.appendRow(['Nota','Instantánea. Google Sheets contiene los datos operativos. Los enlaces abren la plataforma y requieren su usuario y contraseña.']);
    [sheet,ds].forEach(function(s){s.setFrozenRows(1);s.getRange(1,1,1,s.getLastColumn()).setBackground('#e91953').setFontColor('white').setFontWeight('bold');s.setColumnWidths(1,s.getLastColumn(),190);s.getDataRange().createFilter();});
    SpreadsheetApp.flush();
    var url='https://www.googleapis.com/drive/v3/files/'+temp.getId()+'/export?mimeType='+encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    var response=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
    assert_(response.getResponseCode()===200,'Google Drive no pudo exportar Excel: HTTP '+response.getResponseCode());
    var filename='UMA_Descuentos_'+c.ACADEMIC_PERIOD+'_'+Utilities.formatDate(new Date(),'America/Lima','yyyy-MM-dd_HHmm')+'.xlsx';
    // The file goes straight to the browser; no extra copy of student data is kept in Drive.
    var blob=response.getBlob().setName(filename);
    audit_(actor,'EXCEL_EXPORTED','',apps.length+' solicitudes');return {name:filename,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',data:Utilities.base64Encode(blob.getBytes()),count:apps.length};
  }finally{DriveApp.getFileById(temp.getId()).setTrashed(true);}
}
function managementLink_(id,fileId){var origin=String(config_().FRONTEND_ORIGINS||'').split(',')[0];assert_(allowedFrontend_(origin),'Origen de plataforma no configurado');return origin+'/#solicitud='+encodeURIComponent(id)+(fileId?'&documento='+encodeURIComponent(fileId):'');}
