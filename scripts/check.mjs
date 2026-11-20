import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('dist/Code.gs','utf8');new vm.Script(code,{filename:'Code.gs'});
if(code.includes('doGetBeforeBootstrap_'))throw new Error('Temporary management bootstrap must be removed with npm run build before publishing final source');
const client=fs.readFileSync('src/ui/Client.html','utf8').replace(/^<script>\s*/, '').replace(/\s*<\/script>\s*$/,'');new vm.Script(client,{filename:'Client.html'});
JSON.parse(fs.readFileSync('src/appsscript.json','utf8'));
if(/(?:addFileUploadItem|asFileUploadItem)\s*\(/.test(code))throw new Error('Unsupported Forms file-upload API');
const endpoints=[...code.matchAll(/^function ([a-zA-Z0-9]+)\([^)]*\)\s*\{/gm)].map(m=>m[1]);
const secured=['getBootstrap','listApplications','getApplication','listEmails','listAudit','updateSettings','saveDecision','setReviewStatus','renewCorrection','resolveEmail','exportExcel','runSystemHealthCheck'];
for(const name of secured){if(!endpoints.includes(name))throw new Error('Missing endpoint '+name);}
console.log('Apps Script, UI JavaScript and manifest syntax OK. Public API inventory checked.');
for(const file of ['web/transport.js','web/student.js','web-dist/client.js'])new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
const published=fs.readdirSync('web-dist');
if(published.some(name=>/\.gs$|appsscript|demo|secret|credential|\.env/i.test(name)))throw new Error('Private/development artifact in Render publish directory');
if(fs.readFileSync('web-dist/index.html','utf8').includes('<?'))throw new Error('Unresolved Apps Script template in static site');
console.log('Render assets compile; publish directory excludes Apps Script source and demo data.');
