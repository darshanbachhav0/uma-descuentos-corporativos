/**
 * Owner action, run once from the Apps Script editor: organizeSpreadsheet()
 *
 * Leaves the main spreadsheet with a single tab, "Respuestas de estudiantes": one row per student with every
 * submission and its documents in date order (see ResponsesSheet.gs).
 * The platform's own tables (Solicitudes, Documentos, Eventos, ...) are moved to a separate private
 * spreadsheet, "UMA — Datos del sistema (no editar)", inside the system's Drive folder. The old correction
 * form stops writing into the main spreadsheet and its response tab is removed, as are empty default tabs.
 * Safe to run again: every step checks what is already done. Never exposed to the panel or the API.
 */
var UMA_SYSTEM_BOOK_NAME_ = 'UMA — Datos del sistema (no editar)';

function organizeSpreadsheet() {
  setupOwner_();
  return locked_(function(){
    var c = config_(), p = properties_(), main = SpreadsheetApp.openById(c.SPREADSHEET_ID), report = {moved:[], removed:[], kept:[]};
    // 1. The system spreadsheet: reuse the one already recorded (finished or interrupted run) or create it privately.
    var systemId = c.SYSTEM_SPREADSHEET_ID || p.getProperty('SYSTEM_SPREADSHEET_ID_PENDING'), system;
    if (systemId) system = SpreadsheetApp.openById(systemId);
    else {
      system = SpreadsheetApp.create(UMA_SYSTEM_BOOK_NAME_);
      if (system.setSpreadsheetTimeZone) system.setSpreadsheetTimeZone('America/Lima');
      var file = DriveApp.getFileById(system.getId());
      if (c.ROOT_DRIVE_FOLDER_ID) file.moveTo(DriveApp.getFolderById(c.ROOT_DRIVE_FOLDER_ID));
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      p.setProperty('SYSTEM_SPREADSHEET_ID_PENDING', system.getId());
    }
    // 2. Copy every system table still in the main spreadsheet, switch storage, then delete the originals.
    // If storage was already switched (an earlier run stopped halfway), the originals are stale: just delete them.
    var names = Object.keys(UMA.schema), switched = !!c.SYSTEM_SPREADSHEET_ID, originals = [];
    names.forEach(function(name){
      var source = main.getSheetByName(name); if (!source) return;
      if (!switched) {
        var target = system.getSheetByName(name);
        if (!target) { target = source.copyTo(system); target.setName(name); }
        assert_(target.getLastRow() === source.getLastRow(), 'La copia de ' + name + ' no coincide; no se borró nada. Vuelva a ejecutar organizeSpreadsheet.');
      }
      originals.push(source);
    });
    p.setProperty('SYSTEM_SPREADSHEET_ID', system.getId()); p.setProperty('SYSTEM_SPREADSHEET_ID_PENDING', '');
    UMA_MEMO_ = {};
    originals.forEach(function(sheet){ report.moved.push(sheet.getName()); main.deleteSheet(sheet); });
    // A new spreadsheet starts with an empty default tab; drop it once the tables are there.
    system.getSheets().forEach(function(s){ if (names.indexOf(s.getName()) < 0 && s.getLastRow() === 0 && system.getSheets().length > 1) system.deleteSheet(s); });
    // 3. The correction form no longer writes into the main spreadsheet; its response tab goes away.
    if (c.CORRECTION_FORM_ID) {
      var correction = FormApp.openById(c.CORRECTION_FORM_ID), destination = '';
      try { destination = correction.getDestinationId(); } catch (e) { destination = ''; }
      var linked = main.getSheets().filter(function(s){ var url = ''; try { url = s.getFormUrl() || ''; } catch (e) {} return url.indexOf(c.CORRECTION_FORM_ID) >= 0; });
      if (destination === c.SPREADSHEET_ID) correction.removeDestination();
      linked.forEach(function(s){ report.removed.push(s.getName()); main.deleteSheet(s); });
    }
    // 4. One row per student instead of Google's one row per submission: build "Respuestas de estudiantes"
    //    from the platform data, then stop the application form writing raw rows and remove its tab.
    if (c.GOOGLE_FORM_ID) {
      p.setProperty('RESPONSES_SHEET', 'summary');
      rebuildResponsesSheet_();
      var applicationForm = FormApp.openById(c.GOOGLE_FORM_ID), formDestination = '';
      try { formDestination = applicationForm.getDestinationId(); } catch (e) { formDestination = ''; }
      var rawTabs = main.getSheets().filter(function(s){ var url = ''; try { url = s.getFormUrl() || ''; } catch (e) {} return url.indexOf(c.GOOGLE_FORM_ID) >= 0; });
      if (formDestination === c.SPREADSHEET_ID) applicationForm.removeDestination();
      rawTabs.forEach(function(s){ report.removed.push(s.getName()); main.deleteSheet(s); });
    }
    // 5. Empty tabs that are not linked to a form (e.g. "Sheet1"). Anything with data is kept and reported.
    main.getSheets().forEach(function(s){
      var url = ''; try { url = s.getFormUrl() || ''; } catch (e) {}
      if (url) { report.kept.push(s.getName()); return; }
      if (s.getLastRow() === 0 && main.getSheets().length > 1) { report.removed.push(s.getName()); main.deleteSheet(s); }
      else report.kept.push(s.getName() + ' (tiene datos; no se borró)');
    });
    report.systemSpreadsheet = 'https://docs.google.com/spreadsheets/d/' + system.getId() + '/edit';
    audit_(UMA.owner, 'SPREADSHEET_ORGANIZED', '', JSON.stringify(report).slice(0, 2000));
    console.log(JSON.stringify(report, null, 2)); return report;
  });
}
