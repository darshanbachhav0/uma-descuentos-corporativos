# UMA: links and daily use

## Links

| Link | Who uses it / purpose |
| --- | --- |
| [Management platform](https://uma-descuentos-corporativos.onrender.com/) | Treasury: sign in with the management username and password, then review applications, documents, decisions and emails. |
| [Student application form](https://docs.google.com/forms/d/e/1FAIpQLSctyzIVBLHoGM49EmwZ_DWoCzena7yeQijPKxjr5uCj75d7mw/viewform) | This is the only link to distribute to students. |
| [Original socioeconomic PDF](https://uma-descuentos-corporativos.onrender.com/ficha-socioeconomica-2027-I.pdf) | Download, complete manually and sign. The same download appears in the form. |
| [Google Sheets records](https://docs.google.com/spreadsheets/d/1MUgKljFRYaYOlv9gHdnnOlZ-kgEIDYAuHDm9O6hpcnQ/edit) | Owner: underlying records, document links, history, emails and errors. Daily review should use the platform. |
| [Private Drive folder](https://drive.google.com/drive/folders/1DrFiMDuw2u1NZI0UeLsd5B7qmbEsQ8N6) | Owner: application folders, document revisions and exports. |
| [Edit initial form](https://docs.google.com/forms/d/1PuyFItzu4cnrW5eOQewyAYtp40JmnHRq0xqKZ81EkCU/edit) | Owner: maintain student fields and upload questions. Preserve exact question titles or rerun question mapping. |
| [Edit correction form](https://docs.google.com/forms/d/1K-loKF5i8pug-jxAKnKBnu4idCS9tjwELy54WbROiyc/edit) | Owner: maintain the correction form. Do not distribute a generic correction URL. |
| [Render hosting dashboard](https://dashboard.render.com/static/srv-dbvpg7l9fdbs73bju90g) | Owner: deployment status, build logs and hosting configuration. |
| [Apps Script project](https://script.google.com/home/projects/1TiZZM47BuA-iPRfS09rcD22BoFUNIUqTeu3lwS9VhbR1OT9rnTWJBVIa/edit) | Owner: backend code, triggers, execution logs and private properties. |
| [Private source repository](https://github.com/darshanbachhav0/uma-descuentos-corporativos) | Owner: source code, deployment configuration, documentation and tests. |
| [SIGU](https://sigu.uma.edu.pe/alumno/entrar) | Official SIGU access. Treasury must actually register the benefit using its authorized SIGU process before approving in this platform. |

The management platform has no Google sign-in option. Direct Google, Render and GitHub administration links still use their own owner accounts. Google Forms requires a Google account for file uploads; the management password does not replace that native Forms requirement.

## Daily use

1. Give the student only the **Student application form** link.
2. The student downloads the original PDF from the form, completes it by hand, signs it and uploads the PDF/JPG/PNG plus supporting documents. They enter their institutional email and optional personal email.
3. The system creates an application ID, stores the records in Sheets and organizes documents in restricted Drive folders. Submission processing runs automatically; reconciliation recovers missed or interrupted events.
4. Open the management platform and enter the credentials supplied by the owner. Use search/filters, then **Revisar**. **Vista previa** and **Descargar** work within the platform without Google sign-in.
5. Choose the appropriate result, review the recipient and confirm once. Decisions, observations, timestamps and email results remain in the application and email history.
6. **Exportar Excel** downloads the filtered records as `.xlsx`. Its document links open the application/document in the management platform and require its login.
7. Use **Cerrar sesión** when finished. The account is shared; actions are recorded under the management username.

## Example: missing signature, then approval

This is an illustration, not a production application or an instruction to send a test approval.

- María submits a PNP application with her own registered email and files. The system assigns an ID such as `UMA-DC-2027-000001`.
- Treasury opens **Revisar** and sees that the socioeconomic form is unsigned. Select **COMPLETADO — CON OBSERVACIÓN**, choose **Falta firma del estudiante**, enter “La ficha socioeconómica no contiene su firma” and instructions such as “Firme la ficha y adjunte nuevamente todas las páginas y sus sustentos.” Confirm the notification.
- The owner’s email trigger sends the observation to María’s registered email, with her personal correction link. She uploads the corrected complete file set through that link. The original application ID is retained; a new document revision appears.
- Treasury reviews the correction and **actually enters the discount in SIGU**. Then choose **COMPLETADO — APROBADO**, tick the SIGU confirmation, optionally add the registration reference, and confirm.
- The status becomes **Aplicada en SIGU**. The approval email is queued from **darshanbachhavapp@gmail.com** to the email from María’s form, using the requested confirmation text and payment instructions.

Email processing normally runs about once a minute, subject to Google quotas and availability. “Aceptado por Google” records acceptance by MailApp, not proof of delivery or reading. Check spam and the email history if a student has not received a message.
