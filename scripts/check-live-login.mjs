// Read credentials from stdin. Never print credentials, tokens, document contents or student details.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pbkdf2Sync} from 'node:crypto';
const input=JSON.parse(fs.readFileSync(0,'utf8')),config=JSON.parse(fs.readFileSync('deploy/public-config.json','utf8'));
const direct=process.argv.includes('--google-direct'),origin='https://uma-descuentos-corporativos.onrender.com';
async function rpc(method,args=[],token){
  const headers={'Content-Type':'application/json',Origin:origin};if(token&&!direct)headers.Authorization='Bearer '+token;
  const body=direct?{origin,method,args,token}:{method,args};
  const response=await fetch(direct?config.appsScriptUrl:config.apiUrl+'/rpc',{method:'POST',headers,body:JSON.stringify(body),credentials:'omit',redirect:'follow',signal:AbortSignal.timeout(90000)});
  let result;try{result=await response.json();}catch{throw new Error('The service did not return JSON. Check the deployed API version.');}
  return result;
}
assert.equal((await rpc('listApplications',[{},1,20])).ok,false);console.log('Verified unauthenticated reads are rejected.');
const parameters=await rpc('managementAuthParameters');assert.equal(parameters.ok,true);
const proof=pbkdf2Sync(input.password,Buffer.from(parameters.result.salt,'hex'),parameters.result.iterations,32,'sha256').toString('hex');
const login=await rpc('loginManagement',[{username:input.username,proof}]);assert.equal(login.ok,true,login.error);const token=login.result.token;
try{
  const bootstrap=await rpc('getBootstrap',[],token);assert.equal(bootstrap.ok,true);assert.equal(bootstrap.result.actor,'gestión:'+input.username);
  const list=await rpc('listApplications',[{},1,20],token);assert.equal(list.ok,true);assert.equal(typeof list.result.total,'number');
  const health=await rpc('runSystemHealthCheck',[],token);assert.equal(health.ok,true,health.error);
  console.log('Verified authenticated login and application reads without Google cookies.');
  console.log(JSON.stringify({applications:list.result.total,ready:health.result.ready,triggers:health.result.triggers.length,emailEnabled:health.result.emailEnabled,formsOpen:health.result.forms.every(form=>form.accepting)}));
  if(health.result.issues.length)console.log('Separate form configuration warnings:',JSON.stringify(health.result.issues));
}finally{assert.equal((await rpc('logoutManagement',[],token)).ok,true);}
assert.equal((await rpc('listApplications',[{},1,20],token)).ok,false);console.log('Verified logout revokes the session.');
