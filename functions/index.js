// functions/index.js — Ready Balance Cloud Functions
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// ── Transporte de email ───────────────────────────────────────────────────────
// Configura con tu cuenta Gmail en Firebase:
// firebase functions:secrets:set GMAIL_USER
// firebase functions:secrets:set GMAIL_PASS
function crearTransporte() {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

// ── Email de bienvenida al registrarse ────────────────────────────────────────
exports.emailBienvenida = functions
  .region('us-central1')
  .auth.user()
  .onCreate(async (user) => {
    const { email, displayName } = user;
    const nombre = displayName || 'Usuario';

    const transporte = crearTransporte();

    const opciones = {
      from: `"Ready Balance" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '¡Bienvenido a Ready Balance! 🥗',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
          <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:#6CBE71;padding:32px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:28px;">Ready Balance</h1>
              <p style="color:#e8f5e9;margin:8px 0 0;">Nutrición de precisión</p>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#2d2d2d;">¡Hola, ${nombre}! 👋</h2>
              <p style="color:#555;line-height:1.6;">
                Tu cuenta ha sido creada exitosamente. 
                Ya puedes acceder a tu plan nutricional personalizado.
              </p>
              <div style="background:#f0faf0;border-left:4px solid #6CBE71;padding:16px;border-radius:4px;margin:20px 0;">
                <p style="margin:0;color:#2d7a35;font-weight:bold;">¿Qué puedes hacer ahora?</p>
                <ul style="color:#555;margin:8px 0 0;padding-left:20px;">
                  <li>Ver tu plan alimenticio personalizado</li>
                  <li>Registrar tu consumo diario</li>
                  <li>Descargar tu reporte en PDF</li>
                  <li>Consultar tu inventario semanal</li>
                </ul>
              </div>
              <div style="text-align:center;margin:28px 0;">
                <a href="https://ready-balance.web.app"
                   style="background:#6CBE71;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;">
                  Ir a mi dashboard
                </a>
              </div>
              <p style="color:#aaa;font-size:12px;text-align:center;">
                Si no creaste esta cuenta, ignora este correo.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporte.sendMail(opciones);
      console.log(`Email de bienvenida enviado a: ${email}`);
    } catch (err) {
      console.error('Error enviando email:', err.message);
    }
  });

// ── Backup diario de Firestore ────────────────────────────────────────────────
// Se ejecuta cada día a las 2:00 AM (hora del servidor)
exports.backupDiario = functions
  .region('us-central1')
  .pubsub.schedule('0 2 * * *')
  .timeZone('America/Mexico_City')
  .onRun(async () => {
    const fecha = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const bucket = admin.storage().bucket();
    const client = new admin.firestore.v1.FirestoreAdminClient();

    const projectId = process.env.GCLOUD_PROJECT || 'ready-balance';
    const databaseName = client.databasePath(projectId, '(default)');
    const outputUri = `gs://${bucket.name}/backups/firestore/${fecha}`;

    try {
      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: outputUri,
        collectionIds: ['usuarios', 'alimentos'],
      });

      // Registrar en Firestore que el backup fue exitoso
      await db.collection('backups').doc(fecha).set({
        fecha,
        estado: 'completado',
        uri: outputUri,
        operacion: operation.name,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Backup completado: ${outputUri}`);
    } catch (err) {
      // Registrar fallo
      await db.collection('backups').doc(fecha).set({
        fecha,
        estado: 'fallido',
        error: err.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.error('Error en backup:', err.message);
    }
  });

// ── Limpieza de backups antiguos (más de 30 días) ─────────────────────────────
exports.limpiarBackupsAntiguos = functions
  .region('us-central1')
  .pubsub.schedule('0 3 * * 0') // Domingo 3:00 AM
  .timeZone('America/Mexico_City')
  .onRun(async () => {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const snapshot = await db
      .collection('backups')
      .where('timestamp', '<', hace30Dias)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`Eliminados ${snapshot.size} registros de backup antiguos`);
  });