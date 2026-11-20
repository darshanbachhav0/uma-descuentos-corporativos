/**
 * "Respuestas de estudiantes": the only tab of the main spreadsheet after organizeSpreadsheet().
 * One row per student (grouped by institutional email, like the platform). The latest data, the status,
 * and one "Envío N" column per submission in date order, with links to that submission's documents.
 * Kept in sync automatically; the raw Google Forms tab is no longer used.
 */
var UMA_RESPONSES_SHEET_ = 'Respuestas de estudiantes';
var UMA_RESPONSES_HEADERS_ = ['Código','Correo institucional','Correo personal','Tipo de documento','Número de documento','Apellidos y nombres','Escuela profesional','Convenio','Otro convenio','Estado','Envíos','Primer envío','Último envío'];
var UMA_STATUS_TEXT_ = {RECIBIDA:'Recibida',EN_REVISION:'En revisión',OBSERVADA:'Observada · esperando al estudiante',CORRECCION_RECIBIDA:'Corrección recibida',VALIDADA_PENDIENTE_SIGU:'En revisión',APLICADA_SIGU:'Aplicada en SIGU'};

function responsesSheetEnabled_() { return properties_().getProperty('RESPONSES_SHEET') === 'summary'; }
/** "20/11/2026 14:33" in Lima time. */
function limaText_(value) { var s = limaStamp_(value); return s.slice(8,10) + '/' + s.slice(5,7) + '/' + s.slice(0,4) + ' ' + s.slice(11,13) + ':' + s.slice(14,16); }

function responsesSheet_() {
  var book = responsesBook_(), sheet = book.getSheetByName(UMA_RESPONSES_SHEET_);
  if (!sheet) {
    sheet = book.insertSheet(UMA_RESPONSES_SHEET_, 0);
    sheet.getRange(1, 1, 1, UMA_RESPONSES_HEADERS_.length).setValues([UMA_RESPONSES_HEADERS_]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, UMA_RESPONSES_HEADERS_.length).setFontWeight('bold').setBackground('#e91953').setFontColor('#ffffff');
  }
  return sheet;
}
/** Submissions of an application in date order, each with its documents. */
function submissionsOf_(a) {
  var docs = rows_('Documentos').filter(function(d){ return d.applicationId === a.id; });
  var events = rows_('Eventos').filter(function(e){ return e.applicationId === a.id && e.status === 'DONE'; });
  var revisions = {};
  events.forEach(function(e){ var r = Number(e.revision) || 1; revisions[r] = revisions[r] || {revision:r, at:e.timestamp, docs:[]}; });
  docs.forEach(function(d){ var r = Number(d.revision) || 1; revisions[r] = revisions[r] || {revision:r, at:'', docs:[]}; revisions[r].docs.push(d); if (d.submittedAt) revisions[r].at = d.submittedAt; else if (!revisions[r].at) revisions[r].at = d.createdAt; });
  if (!revisions[1]) revisions[1] = {revision:1, at:a.createdAt, docs:[]};
  return Object.keys(revisions).map(Number).sort(function(x, y){ return x - y; }).map(function(r){
    var item = revisions[r]; item.docs.sort(function(x, y){ return (x.kind === 'socioeconomic' ? 0 : 1) - (y.kind === 'socioeconomic' ? 0 : 1) || String(x.name).localeCompare(String(y.name)); }); return item;
  });
}
/** Cell for one submission: date, then one linked line per document. */
function submissionCell_(item) {
  var lines = ['Revisión ' + item.revision + ' · ' + limaText_(item.at)], links = [];
  if (!item.docs.length) lines.push('(sin documentos)');
  item.docs.forEach(function(d){
    var label = String(d.name || (d.kind === 'socioeconomic' ? 'Ficha socioeconómica' : 'Documento sustentatorio')).replace(/\.(pdf|jpg|png)$/i, '');
    var start = lines.join('\n').length + 1; lines.push(label); links.push([start, start + label.length, d.url]);
  });
  var builder = SpreadsheetApp.newRichTextValue().setText(lines.join('\n'));
  links.forEach(function(l){ if (l[2]) builder = builder.setLinkUrl(l[0], l[1], l[2]); });
  return builder.build();
}
/** Writes (or adds) the student's row. Best effort: callers ignore failures so a sheet issue never blocks the platform. */
function syncStudentRow_(a) {
  if (!responsesSheetEnabled_() || !a || !a.id) return;
  var sheet = responsesSheet_(), last = sheet.getLastRow(), row = last + 1;
  if (last > 1) { var codes = sheet.getRange(2, 1, last - 1, 1).getValues(); for (var i = 0; i < codes.length; i++) if (String(codes[i][0]) === a.id) { row = i + 2; break; } }
  var items = submissionsOf_(a), base = [a.id, a.institutionalEmail, a.personalEmail || '', a.identityType, String(a.identityNumber || ''), a.name, a.school, a.discount, a.otherDiscount || '',
    UMA_STATUS_TEXT_[a.status] || a.status, String(items.length), limaText_(a.createdAt), limaText_(a.lastSubmissionAt || a.createdAt)];
  var needed = UMA_RESPONSES_HEADERS_.length + items.length, have = Math.max(sheet.getLastColumn(), UMA_RESPONSES_HEADERS_.length);
  if (needed > have) {
    var extra = []; for (var k = have - UMA_RESPONSES_HEADERS_.length + 1; k <= items.length; k++) extra.push('Envío ' + k);
    sheet.getRange(1, have + 1, 1, extra.length).setValues([extra]).setFontWeight('bold').setBackground('#e91953').setFontColor('#ffffff');
  }
  // Text format keeps document numbers with leading zeros and dates exactly as written.
  sheet.getRange(row, 1, 1, base.length).setNumberFormat('@').setValues([base]);
  sheet.getRange(row, UMA_RESPONSES_HEADERS_.length + 1, 1, items.length).setRichTextValues([items.map(submissionCell_)]).setWrap(true);
}
function syncStudentRowSafely_(a) { try { syncStudentRow_(a); } catch (e) { error_('RESPONSES_SHEET', a && a.id, e); } }
/** Rebuilds every row from the platform data, oldest application first. */
function rebuildResponsesSheet_() {
  var sheet = responsesSheet_(), last = sheet.getLastRow();
  if (last > 2) sheet.deleteRows(3, last - 2);
  if (last > 1) sheet.getRange(2, 1, 1, sheet.getMaxColumns()).clearContent();
  rows_('Solicitudes').sort(function(x, y){ return String(x.createdAt).localeCompare(String(y.createdAt)); }).forEach(syncStudentRow_);
}
