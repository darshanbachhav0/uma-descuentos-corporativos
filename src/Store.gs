function book_() { var id=config_().SPREADSHEET_ID; assert_(id,'Ejecute initializeProject primero'); return SpreadsheetApp.openById(id); }
function table_(name) { var s=book_().getSheetByName(name);assert_(s,'Falta la hoja '+name);return s; }
function rows_(name) {
  var s=table_(name), values=s.getDataRange().getValues(), h=values.shift();
  return values.filter(function(r){return r[0]!=='';}).map(function(r){var o={};h.forEach(function(k,i){o[k]=r[i] instanceof Date?r[i].toISOString():r[i];});return o;});
}
function put_(name, record, keyField) {
  keyField=keyField||'key';var s=table_(name), values=s.getDataRange().getValues(),h=values[0], k=h.indexOf(keyField);
  assert_(k>=0,'Columna clave ausente'); var n=values.findIndex(function(r,i){return i>0&&String(r[k])===String(record[keyField]);});
  var row=h.map(function(field,i){return Object.prototype.hasOwnProperty.call(record,field)?sheetValue_(record[field]):(n>=0?values[n][i]:'');});
  s.getRange(n<0?s.getLastRow()+1:n+1,1,1,h.length).setValues([row]);return record;
}
function append_(name, record) { var s=table_(name),h=s.getRange(1,1,1,s.getLastColumn()).getValues()[0];s.appendRow(h.map(function(k){return sheetValue_(record[k]);}));return record; }
function find_(name,key,value) { return rows_(name).find(function(r){return String(r[key])===String(value);}); }
function application_(id) {var a=find_('Solicitudes','id',id);assert_(a,'Solicitud no encontrada');return a;}
function saveApplication_(a) {a.updatedAt=now_();put_('Solicitudes',a,'id');return a;}
function transition_(a,status,actor,detail,key) {
  var old=a.status; a.status=status;
  var eventKey=key||Utilities.getUuid();
  if(!find_('Historial_Estados','key',eventKey))append_('Historial_Estados',{key:eventKey,applicationId:a.id,fromStatus:old,toStatus:status,reviewer:actor,timestamp:now_(),detail:detail||''});
}
function nextId_() {
  var p=properties_(),year=config_().ACADEMIC_PERIOD.slice(0,4),key='SEQUENCE_'+year;
  var n=Number(p.getProperty(key)||0)+1;p.setProperty(key,String(n));return 'UMA-DC-'+year+'-'+String(n).padStart(6,'0');
}
