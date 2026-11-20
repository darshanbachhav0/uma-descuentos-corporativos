/* Isolated local demo. Never included in Apps Script dist/Code.gs. */
window.UMA_DEMO=(()=>{
  const names=['Valeria Rojas Mendoza','Diego Salazar Torres','Camila Flores García','Sebastián Quispe Ramos','Luciana Vargas Díaz','Mateo Castillo Pérez','María Fernández Ruiz','Gabriel Sánchez León'];
  const schools=['Enfermería','Psicología','Farmacia y Bioquímica','Administración y Marketing'];
  const discounts=['PNP','Familiar','San Hilarión','Liderman','Boticas Perú','FED-CUT','El Tumi','Emphost','Otro'];
  const states=['RECIBIDA','EN_REVISION','OBSERVADA','CORRECCION_RECIBIDA','VALIDADA_PENDIENTE_SIGU','APLICADA_SIGU'];
  let apps=names.map((name,i)=>({id:'UMA-DC-2027-'+String(128+i).padStart(6,'0'),name,identityType:'DNI',identityNumber:'000000'+String(i+1).padStart(2,'0'),institutionalEmail:'estudiante'+(i+1)+'@example.edu',personalEmail:'',recipient:'estudiante'+(i+1)+'@example.edu',school:schools[i%4],discount:discounts[i%8],status:states[i%6],createdAt:'2026-11-'+String(19-i).padStart(2,'0')+'T15:30:00.000Z',period:'2027-I',revision:1,version:1,reviewer:'',reviewedAt:i%6===5?'2026-11-19T17:00:00.000Z':'',folderUrl:'https://drive.google.com/drive/my-drive',emailStatus:''}));
  const emails=[];const clone=v=>JSON.parse(JSON.stringify(v));
  function stats(){const byDiscount={};apps.forEach(a=>byDiscount[a.discount]=(byDiscount[a.discount]||0)+1);return {total:apps.length,pending:apps.filter(a=>!['OBSERVADA','APLICADA_SIGU'].includes(a.status)).length,observed:apps.filter(a=>a.status==='OBSERVADA').length,applied:apps.filter(a=>a.status==='APLICADA_SIGU').length,byDiscount,emailSent:0,emailPending:emails.length,emailUncertain:0,averageReviewHours:18.5};}
  return {async call(method,...args){await new Promise(r=>setTimeout(r,100));switch(method){
    case 'getBootstrap':return {actor:'tesoreria.demo@example.edu',owner:'darshanbachhavapp@gmail.com',isAdmin:true,period:'2027-I',schools,discounts,states,categories:['Ficha socioeconómica incompleta','Falta firma del estudiante','Documento ilegible','Falta documento sustentatorio','Datos incorrectos','Documento no corresponde','Información incompleta','Otro'],emailEnabled:false,spreadsheet:'https://docs.google.com/spreadsheets/',studentForm:'https://docs.google.com/forms/'};
    case 'listApplications':{const [f,p,size]=args;let rows=apps.filter(a=>(!f.query||[a.id,a.name,a.identityNumber].join(' ').toLowerCase().includes(f.query.toLowerCase()))&&(!f.status||f.status===a.status)&&(!f.discount||f.discount===a.discount)&&(!f.school||f.school===a.school)&&(!f.from||a.createdAt.slice(0,10)>=f.from)&&(!f.to||a.createdAt.slice(0,10)<=f.to)&&(!f.pendingOnly||!['OBSERVADA','APLICADA_SIGU'].includes(a.status)));return clone({rows:rows.slice((p-1)*size,p*size),total:rows.length,stats:stats()});}
    case 'getApplication':{const a=apps.find(a=>a.id===args[0]);return clone({application:a,documents:[],history:[{toStatus:'RECIBIDA',timestamp:a.createdAt,reviewer:'Sistema',detail:'Registro ficticio de demostración'}],observations:[],emails:emails.filter(m=>m.applicationId===a.id)});}
    case 'setReviewStatus':{const a=apps.find(a=>a.id===args[0]);a.status=args[2];a.version++;return clone(a);}
    case 'saveDecision':{const d=args[0],a=apps.find(a=>a.id===d.id);if(a.version!==d.version)throw new Error('Actualice el expediente');if(d.decision==='APPROVED'&&!d.siguConfirmed)throw new Error('Confirme SIGU');a.status=d.decision==='APPROVED'?'APLICADA_SIGU':'OBSERVADA';a.version++;a.category=d.category;a.observation=d.observation;a.instructions=d.instructions;a.emailStatus='PENDING';emails.push({key:d.requestId,applicationId:a.id,recipient:a.recipient,type:d.decision,status:'PENDING',createdAt:new Date().toISOString()});return {status:a.status};}
    case 'listEmails':return clone(emails);
    case 'listAudit':return {audit:[],errors:[]};
    case 'runSystemHealthCheck':return {ready:false,issues:['Demostración local: Google Workspace no está conectado.'],triggers:[],quota:0,forms:[]};
    case 'updateSettings':return {ok:true};
    case 'renewCorrection':return {status:'PENDING'};
    case 'exportExcel':throw new Error('La exportación real de Excel está disponible en el despliegue autorizado de Google Apps Script.');
    default:throw new Error('Método de demostración no disponible: '+method);
  }}};
})();
