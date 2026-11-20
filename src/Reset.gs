/**
 * Test-data reset, run by the owner from the Apps Script editor. Never exposed to the panel or the API.
 *
 *   previewReset()                      -> counts what would be removed; changes nothing.
 *   resetAllData('BORRAR TODO')         -> removes every application and its trail.
 *
 * Removed: all rows of the system tables (applications, documents, events, decisions, observations, status
 * history, emails, audit, errors), every Google Forms response of both forms and the rows of their linked
 * response sheets, application folders, copied documents, student uploads and saved Excel exports.
 * Drive items are moved to the trash (recoverable for 30 days); sheet rows and form responses are not recoverable.
 * Kept: forms, questions, spreadsheet structure, settings, login, the original blank PDF and triggers.
 */
var UMA_RESET_PHRASE_ = 'BORRAR TODO';
var UMA_RESET_TABLES_ = ['Solicitudes','Documentos','Eventos','Decisiones','Observaciones','Historial_Estados','Correos','Auditoria','Errores'];

function previewReset() {
  setupOwner_(); var plan = resetPlan_();
  var summary = {rows:plan.rows, formResponses:plan.responses, linkedSheetRows:plan.linkedRows, driveFilesToTrash:plan.files.length, driveFoldersToTrash:plan.folders.length,
    next:'Para borrar, ejecute resetAllData con la frase "' + UMA_RESET_PHRASE_ + '".'};
  console.log(JSON.stringify(summary, null, 2)); return summary;
}

function resetAllData(confirmation) {
  setupOwner_();
  assert_(confirmation === UMA_RESET_PHRASE_, 'Confirmación requerida: ejecute resetAllData("' + UMA_RESET_PHRASE_ + '"). Revise antes previewReset().');
  return locked_(function(){
    var plan = resetPlan_(), trashed = {files:0, folders:0, failed:[]};
    // Drive first, while the tables still say which items belong to the platform.
    plan.files.forEach(function(id){ try { DriveApp.getFileById(id).setTrashed(true); trashed.files++; } catch (e) { trashed.failed.push(id + ': ' + e.message); } });
    plan.folders.forEach(function(id){ try { DriveApp.getFolderById(id).setTrashed(true); trashed.folders++; } catch (e) { trashed.failed.push(id + ': ' + e.message); } });
    resetForms_();
    UMA_RESET_TABLES_.forEach(clearTable_);
    resetLinkedResponseSheets_();
    var p = properties_(), now = String(Date.now());
    p.setProperty('SEQUENCE_' + config_().ACADEMIC_PERIOD.slice(0, 4), '0');
    p.setProperty('CURSOR_GOOGLE_FORM_ID', now); p.setProperty('CURSOR_CORRECTION_FORM_ID', now);
    p.setProperty('MAIL_QUEUE_STATE', 'idle'); p.setProperty('DATA_MODEL', 'email-v2'); p.setProperty('STATUS_MODEL', 'v2');
    var result = {rows:plan.rows, formResponses:plan.responses, linkedSheetRows:plan.linkedRows, trashedFiles:trashed.files, trashedFolders:trashed.folders, failed:trashed.failed};
    audit_(UMA.owner, 'DATA_RESET', '', JSON.stringify(result).slice(0, 2000));
    console.log(JSON.stringify(result, null, 2)); return result;
  });
}

/** Everything the reset would touch, computed without changing anything. */
function resetPlan_() {
  var c = config_(), rows = {}, files = {}, folders = {}, responses = 0, linkedRows = 0;
  UMA_RESET_TABLES_.forEach(function(name){ rows[name] = rows_(name).length; });
  rows_('Documentos').forEach(function(d){ if (d.fileId) files[d.fileId] = true; if (d.sourceId) files[d.sourceId] = true; });
  rows_('Solicitudes').forEach(function(a){ if (a.folderId) folders[a.folderId] = true; });
  ['GOOGLE_FORM_ID','CORRECTION_FORM_ID'].forEach(function(k){
    if (!c[k]) return;
    var form = FormApp.openById(c[k]), list = form.getResponses(); responses += list.length;
    // Student uploads of every response, including ones the platform never processed.
    list.forEach(function(r){ r.getItemResponses().forEach(function(ir){
      if (String(ir.getItem().getType()) !== 'FILE_UPLOAD') return;
      var v = ir.getResponse(); (Array.isArray(v) ? v : [v]).forEach(function(id){ if (id) files[String(id)] = true; });
    }); });
  });
  // Period folders (with their Revision_N subfolders) under the private root, and saved exports.
  if (c.ROOT_DRIVE_FOLDER_ID) {
    var it = DriveApp.getFolderById(c.ROOT_DRIVE_FOLDER_ID).getFolders();
    while (it.hasNext()) { var f = it.next(); if (/^\d{4}-[IVX]+$/.test(f.getName())) folders[f.getId()] = true; }
  }
  if (c.EXPORT_FOLDER_ID) { var ex = DriveApp.getFolderById(c.EXPORT_FOLDER_ID).getFiles(); while (ex.hasNext()) files[ex.next().getId()] = true; }
  if (c.TEMPLATE_PDF_FILE_ID) delete files[c.TEMPLATE_PDF_FILE_ID];
  linkedResponseSheets_().forEach(function(s){ linkedRows += Math.max(0, s.getLastRow() - 1); });
  return {rows:rows, responses:responses, linkedRows:linkedRows, files:Object.keys(files), folders:Object.keys(folders)};
}
function resetForms_() {
  var c = config_();
  ['GOOGLE_FORM_ID','CORRECTION_FORM_ID'].forEach(function(k){ if (c[k]) FormApp.openById(c[k]).deleteAllResponses(); });
}
/** The "Form Responses" tabs Google Forms writes into the same spreadsheet. */
function linkedResponseSheets_() {
  return book_().getSheets().filter(function(s){ try { return !!s.getFormUrl(); } catch (e) { return false; } });
}
function resetLinkedResponseSheets_() {
  linkedResponseSheets_().forEach(function(s){ var last = s.getLastRow(); if (last > 2) s.deleteRows(3, last - 2); if (last > 1) s.getRange(2, 1, 1, s.getMaxColumns()).clearContent(); });
}
