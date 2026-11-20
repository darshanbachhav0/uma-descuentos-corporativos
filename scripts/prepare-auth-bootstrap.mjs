// One-time owner deployment bootstrap. Read credentials from stdin, never command-line flags.
// Run npm run build again after provisioning to remove this temporary bootstrap from dist/.
import fs from 'node:fs';
import {randomBytes,pbkdf2Sync,createHash} from 'node:crypto';
const input=JSON.parse(fs.readFileSync(0,'utf8'));
if(!/^[A-Za-z0-9._-]{3,40}$/.test(input.username)||typeof input.password!=='string'||input.password.length<1||input.password.length>200)throw new Error('Invalid management credentials');
const salt=randomBytes(16).toString('hex'),proof=pbkdf2Sync(input.password,Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex');
const settings={MANAGEMENT_USERNAME:input.username,MANAGEMENT_SALT:salt,MANAGEMENT_ITERATIONS:'600000',MANAGEMENT_VERIFIER:createHash('sha256').update(proof).digest('hex'),MANAGEMENT_AUTH_ENABLED:'true'};
let code=fs.readFileSync('dist/Code.gs','utf8');
if(!code.includes('function doGet(e) {')||code.includes('doGetBeforeBootstrap_'))throw new Error('Build the clean project before provisioning');
code=code.replace('function doGet(e) {','function doGetBeforeBootstrap_(e) {');
code+='\n// Temporary one-time, fixed-value provisioning. No request can supply credentials.\nfunction doGet(e){if(!properties_().getProperty("MANAGEMENT_VERIFIER")){effectiveOwner_();locked_(function(){var p=properties_();if(p.getProperty("MANAGEMENT_VERIFIER"))return;var values='+JSON.stringify(settings)+';Object.keys(values).forEach(function(k){p.setProperty(k,values[k]);});p.setProperty("MANAGEMENT_CREDENTIAL_VERSION",Utilities.getUuid());audit_(UMA.owner,"MANAGEMENT_ACCESS_CONFIGURED","","Acceso de gestión inicializado");});}return doGetBeforeBootstrap_(e);}\n';
fs.writeFileSync('dist/Code.gs',code);
console.log('Prepared one-time management bootstrap. No plaintext credentials written. Rebuild after provisioning.');
