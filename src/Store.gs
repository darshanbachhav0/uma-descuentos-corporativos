// Sheets persistence. Each Apps Script execution reads a table once and keeps the values in memory;
// writes update that copy, and acquiring the script lock discards it so locked work always sees fresh data.
var UMA_MEMO_ = {};
/** System tables. After organizeSpreadsheet they live in a separate private spreadsheet. */
function book_() { var c=config_(),id=c.SYSTEM_SPREADSHEET_ID||c.SPREADSHEET_ID; assert_(id,'Ejecute initializeProject primero'); if(!UMA_MEMO_.__book)UMA_MEMO_.__book=SpreadsheetApp.openById(id); return UMA_MEMO_.__book; }
function table_(name) { var s=book_().getSheetByName(name);assert_(s,'Falta la hoja '+name);return s; }
function forgetTables_() { var b=UMA_MEMO_.__book; UMA_MEMO_={}; if(b)UMA_MEMO_.__book=b; }
/** Loads a table once per execution and appends any schema column added by a newer version. */
function sheetValues_(name) {
  var memo=UMA_MEMO_['t:'+name]; if(memo)return memo;
  var s=table_(name), values=s.getDataRange().getValues(), header=values[0]||[];
  var schema=(UMA.schema[name]||[]), missing=schema.filter(function(k){return header.indexOf(k)<0;});
  if(missing.length&&header.length&&header.some(function(v){return v!=='';})){
    var width=header.length+missing.length;
    if(s.getMaxColumns()<width)s.insertColumnsAfter(s.getMaxColumns(),width-s.getMaxColumns());
    s.getRange(1,header.length+1,1,missing.length).setValues([missing]);
    values[0]=header.concat(missing);
    for(var i=1;i<values.length;i++)values[i]=values[i].concat(missing.map(function(){return '';}));
  }
  memo={sheet:s,values:values};UMA_MEMO_['t:'+name]=memo;return memo;
}
function rowObject_(h,r) { var o={};h.forEach(function(k,i){if(k!=='')o[k]=r[i] instanceof Date?r[i].toISOString():r[i];});return o; }
function rows_(name) {
  var values=sheetValues_(name).values, h=values[0];
  var out=[];for(var i=1;i<values.length;i++)if(values[i][0]!=='')out.push(rowObject_(h,values[i]));return out;
}
function put_(name, record, keyField) {
  keyField=keyField||'key';var memo=sheetValues_(name), values=memo.values, h=values[0], k=h.indexOf(keyField);
  assert_(k>=0,'Columna clave ausente'); var n=-1;
  for(var i=1;i<values.length;i++)if(String(values[i][k])===String(record[keyField])){n=i;break;}
  var row=h.map(function(field,i){return field!==''&&Object.prototype.hasOwnProperty.call(record,field)?sheetValue_(record[field]):(n>=0?keepValue_(values[n][i]):'');});
  var target=n<0?values.length:n;
  memo.sheet.getRange(target+1,1,1,h.length).setValues([row]);
  values[target]=row.map(unsheetValue_);return record;
}
function append_(name, record) {
  var memo=sheetValues_(name),h=memo.values[0],row=h.map(function(k){return sheetValue_(record[k]);});
  memo.sheet.appendRow(row);memo.values.push(row.map(unsheetValue_));return record;
}
function keepValue_(v) { return v instanceof Date?v:sheetValue_(v); }
/** The sheet stores escaped text as '0123; the in-memory copy must match what a fresh read returns. */
function unsheetValue_(v) { return typeof v==='string'&&v.charAt(0)==="'"?v.slice(1):v; }
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
/** Removes every data row below the header. Sheets refuses to delete all unfrozen rows, so row 2 is kept blank. */
function clearTable_(name) {
  var s=table_(name),last=s.getLastRow();
  if(last>2)s.deleteRows(3,last-2);
  if(last>1)s.getRange(2,1,1,s.getMaxColumns()).clearContent();
  delete UMA_MEMO_['t:'+name];
}
/** The spreadsheet Google Forms writes responses into ("Form Responses 1"). */
function responsesBook_() { var id=config_().SPREADSHEET_ID; assert_(id,'Ejecute initializeProject primero'); return SpreadsheetApp.openById(id); }
