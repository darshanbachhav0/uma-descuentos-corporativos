/**
 * Document access follows the main spreadsheet's sharing: whoever can open
 * "UMA — Control de Descuentos Corporativos" can view the student documents its links point to.
 *
 * - People added to the spreadsheet (as viewer, commenter or editor) become viewers of each period folder
 *   (e.g. "2027-I"); Drive passes that access down to every application folder and document inside,
 *   including documents added later. Removing someone from the spreadsheet removes them again.
 * - If the spreadsheet is shared by link, every document gets the same kind of link access, view only.
 * - The system folder, exports, the template and the private system spreadsheet are never shared.
 *
 * Runs with every reconcileSubmissions trigger (every 10 minutes) and when a new period folder is created.
 * Owner action to apply it immediately: shareDocumentsWithSheetUsers()
 */
var UMA_PERIOD_FOLDER_ = /^\d{4}-[A-Z0-9]+$/;

function storedDocumentAccess_() {
  try { var v = JSON.parse(properties_().getProperty('DOCUMENT_ACCESS') || '{}'); return {users: v.users || [], link: v.link || '', folders: v.folders || []}; }
  catch (e) { return {users: [], link: '', folders: []}; }
}
function saveDocumentAccess_(access) { properties_().setProperty('DOCUMENT_ACCESS', JSON.stringify(access)); }

/** Who can open the main spreadsheet, minus the owner, and its link setting mapped to a view-only link. */
function sheetAccess_() {
  var file = DriveApp.getFileById(config_().SPREADSHEET_ID), seen = {}, users = [];
  file.getEditors().concat(file.getViewers()).forEach(function(u){
    var email = normalizeEmail_(u.getEmail()); if (email && email !== UMA.owner && !seen[email]) { seen[email] = true; users.push(email); }
  });
  var access = String(file.getSharingAccess()), link = '';
  if (access === 'ANYONE' || access === 'ANYONE_WITH_LINK') link = 'ANYONE_WITH_LINK';
  else if (access === 'DOMAIN' || access === 'DOMAIN_WITH_LINK') link = 'DOMAIN_WITH_LINK';
  return {users: users.sort(), link: link};
}

/** Period folders only: "2027-I", "2027-II", ... directly under the system folder. */
function documentFolders_() {
  var c = config_(), list = [], it = DriveApp.getFolderById(c.ROOT_DRIVE_FOLDER_ID).getFolders();
  while (it.hasNext()) { var f = it.next(); if (f.getId() !== c.EXPORT_FOLDER_ID && UMA_PERIOD_FOLDER_.test(f.getName())) list.push(f); }
  return list;
}
function folderUsers_(folder) {
  var have = {}; folder.getEditors().concat(folder.getViewers()).forEach(function(u){ have[normalizeEmail_(u.getEmail())] = true; }); return have;
}
function linkAccess_(link) { return link ? DriveApp.Access[link] : DriveApp.Access.PRIVATE; }

/** Applies the stored link setting to one copied document (used when documents are copied). */
function shareDocument_(file) {
  var link = storedDocumentAccess_().link;
  file.setSharing(linkAccess_(link), link ? DriveApp.Permission.VIEW : DriveApp.Permission.NONE);
}
/** Gives the current spreadsheet users access to a period folder the first time it is used. */
function sharePeriodFolder_(folder) {
  var access = storedDocumentAccess_(), id = folder.getId();
  if (access.folders.indexOf(id) >= 0) return;
  var have = folderUsers_(folder), add = access.users.filter(function(e){ return !have[e]; });
  add.forEach(function(e){ try { folder.addViewer(e); } catch (err) { /* not a Google account; reported by the sync */ } });
  access.folders.push(id); saveDocumentAccess_(access);
}

/** Mirrors the spreadsheet's sharing onto the document folders. Cheap when nothing changed. */
function syncDocumentAccess_(force) {
  var before = storedDocumentAccess_(), now = sheetAccess_(), folders = documentFolders_();
  var ids = folders.map(function(f){ return f.getId(); }).sort();
  var unchanged = before.link === now.link && before.users.join(',') === now.users.join(',') && before.folders.slice().sort().join(',') === ids.join(',');
  if (unchanged && !force) return {changed: false, users: now.users, link: now.link, folders: ids.length};
  return locked_(function(){
    var report = {changed: true, users: now.users, link: now.link, folders: ids.length, added: [], removed: [], files: 0, failed: []};
    folders.forEach(function(folder){
      var have = folderUsers_(folder), add = now.users.filter(function(e){ return !have[e]; });
      add.forEach(function(e){ try { folder.addViewer(e); report.added.push(e); } catch (err) { report.failed.push(e + ': ' + err.message); } });
      // Only take away access this sync gave earlier; people the owner added by hand stay.
      before.users.filter(function(e){ return now.users.indexOf(e) < 0 && have[e]; }).forEach(function(e){
        try { folder.removeViewer(e); report.removed.push(e); } catch (err) { report.failed.push(e + ': ' + err.message); }
      });
    });
    if (before.link !== now.link || force) {
      rows_('Documentos').forEach(function(d){
        if (!d.fileId) return;
        try { DriveApp.getFileById(d.fileId).setSharing(linkAccess_(now.link), now.link ? DriveApp.Permission.VIEW : DriveApp.Permission.NONE); report.files++; }
        catch (err) { report.failed.push(d.fileId + ': ' + err.message); }
      });
    }
    saveDocumentAccess_({users: now.users, link: now.link, folders: ids});
    audit_(UMA.owner, 'DOCUMENT_ACCESS_SYNCED', '', JSON.stringify(report).slice(0, 2000));
    return report;
  });
}

/** Owner action: give view access to the documents to everyone who can open the spreadsheet, right now. */
function shareDocumentsWithSheetUsers() {
  setupOwner_();
  var report = syncDocumentAccess_(true);
  console.log(JSON.stringify(report, null, 2)); return report;
}
