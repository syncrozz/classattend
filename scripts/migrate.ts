import { executeDataMigration } from '../src/server/migration';
import { checkFirebaseAdminStatus } from '../src/server/firebase-admin';

async function main() {
  console.log('===========================================================');
  console.log('SYNCROZZ SES v4.5 — FIRESTORE & STORAGE CONTROLLED MIGRATION');
  console.log('===========================================================');

  const status = await checkFirebaseAdminStatus();
  console.log('Target Firebase Project:', status.projectId);
  console.log('Target Firestore Database:', status.databaseId);
  console.log('Target Storage Bucket:', status.storageBucket);
  console.log('Service Account Configured:', status.hasServiceAccount);
  if (status.serviceAccountClientEmail) {
    console.log('Service Account Email:', status.serviceAccountClientEmail);
  }
  console.log('Firestore Connection Healthy:', status.connectionHealthy);

  if (!status.connectionHealthy) {
    console.warn('\n⚠️ AMARAN: Tidak dapat mengesahkan sambungan ke Firestore dengan Firebase Admin SDK.');
    console.warn('Sebab:', status.error || 'Kredensial tiada.');
    console.warn('Panduan:', status.guidance);
    console.warn('Operasi dihentikan untuk melindungi integriti destinasi produksi.');
    process.exit(1);
  }

  const isDryRun = process.argv.includes('--dry-run');
  const forceOverwrite = process.argv.includes('--force');

  console.log(`\nExecuting migration (dryRun: ${isDryRun}, forceOverwrite: ${forceOverwrite})...\n`);

  const report = await executeDataMigration({ dryRun: isDryRun, forceOverwrite });

  console.log('---------------- MIGRATION REPORT ----------------');
  console.log('Status:', report.status);
  console.log('Message:', report.message);
  console.log('Source Entities Read:', report.reconciliation.totalSourceEntities);
  console.log('Target Records Created:', report.reconciliation.totalTargetCreated);
  console.log('Target Records Reconciled/Skipped:', report.reconciliation.totalTargetSkipped);
  console.log('Failures:', report.reconciliation.totalFailures);
  console.log('Reconciliation Succeeded:', report.reconciliation.isFullyReconciled);

  if (report.warnings.length > 0) {
    console.log('\nWarnings:');
    report.warnings.forEach((w) => console.log(' -', w));
  }

  if (report.errors.length > 0) {
    console.log('\nErrors:');
    report.errors.forEach((e) => console.log(' -', e));
    process.exit(1);
  }

  console.log('\n✅ Controlled migration completed successfully.');
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
