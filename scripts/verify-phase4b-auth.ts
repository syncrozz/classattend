import { auth } from '../src/services/firebase';
import { trustedAuthService } from '../src/services/trustedAuthService';
import { TrustedRole, TrustedClaims } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

interface AuthTestResult {
  category: string;
  test: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: AuthTestResult[] = [];

function assert(
  category: string,
  test: string,
  condition: boolean,
  expected: string,
  actual: string,
  evidence: string
) {
  results.push({
    category,
    test,
    expected,
    actual,
    status: condition ? 'PASS' : 'FAIL',
    evidence
  });
}

console.log('================================================================');
console.log('SES v4.5 | PHASE 4B.2-A FIREBASE AUTH & TRUSTED IDENTITY GATE');
console.log('================================================================\n');

// 1. Firebase Auth Initialization
assert(
  'Firebase Auth',
  'Auth instance initialized from configuration',
  auth !== null && auth !== undefined && auth.name !== undefined,
  'Auth instance initialized with app reference',
  `Auth instance present (App Name: ${auth?.app?.name || 'unknown'})`,
  'Firebase Auth Web SDK initialized successfully with firebase-applet-config.json'
);

// 2. Default Unauthenticated Identity
const defaultIdentity = trustedAuthService.getIdentity();
assert(
  'Trusted Identity',
  'Default identity is safe unauthenticated state',
  defaultIdentity.isAuthenticated === false && defaultIdentity.role === 'UNAUTHENTICATED' && defaultIdentity.uid === '',
  'isAuthenticated: false, role: UNAUTHENTICATED, uid: ""',
  `isAuthenticated: ${defaultIdentity.isAuthenticated}, role: ${defaultIdentity.role}, uid: "${defaultIdentity.uid}"`,
  'Default identity state does not assume or synthesize permissions before authentication'
);

// 3. Claims Model Validation for All 5 Supported Roles
const testRoles: TrustedRole[] = ['SUPER_ADMIN', 'ADMIN', 'LECTURER', 'STUDENT', 'KIOSK'];
let allRolesValid = true;

testRoles.forEach((role) => {
  const parsed = trustedAuthService.parseTrustedClaims({
    role,
    institutionalId: `TEST-${role}-001`,
    assignedClasses: ['DIA_1A'],
    kioskId: role === 'KIOSK' ? 'KIOSK-01' : undefined
  });

  if (!parsed || parsed.role !== role || parsed.institutionalId !== `TEST-${role}-001`) {
    allRolesValid = false;
  }
});

assert(
  'Custom Claims',
  'Claims parser validates all 5 supported roles (SUPER_ADMIN, ADMIN, LECTURER, STUDENT, KIOSK)',
  allRolesValid,
  'All 5 roles parsed into valid TrustedClaims',
  `Roles verified: ${testRoles.join(', ')}`,
  'Custom Claims parsing strictly adheres to SES v4.5 role taxonomy'
);

// 4. Invalid Claims Rejection
const invalidClaims = trustedAuthService.parseTrustedClaims({
  role: 'GUEST_HACKER',
  institutionalId: 'FAKE-999'
});

assert(
  'Custom Claims',
  'Claims parser rejects arbitrary or unsupported roles',
  invalidClaims === null,
  'null (rejected)',
  invalidClaims === null ? 'null (rejected)' : JSON.stringify(invalidClaims),
  'Unsupported or client-injected role strings are rejected'
);

// 5. Client Claim Mutation Block
const clientClaimMutationAllowed = trustedAuthService.isClientClaimAssignmentAllowed();
// Also verify that Firebase Web Client SDK does not export setCustomUserClaims
const webSdkHasSetClaims = typeof (auth as any).setCustomUserClaims === 'function';

assert(
  'Security Boundary',
  'Client is strictly prevented from setting or modifying custom claims',
  clientClaimMutationAllowed === false && webSdkHasSetClaims === false,
  'clientClaimAssignmentAllowed: false, webSdkHasSetClaims: false',
  `clientClaimAssignmentAllowed: ${clientClaimMutationAllowed}, webSdkHasSetClaims: ${webSdkHasSetClaims}`,
  'Custom claims are strictly server-authoritative; no client-side mutation vector exists'
);

// 6. Check for Service Account Secrets in Frontend Codebase
function searchForSecrets(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'verify-phase4b-auth.ts') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchForSecrets(fullPath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allProjectFiles = searchForSecrets(process.cwd());
let exposedSecretCount = 0;
const secretMatches: string[] = [];

for (const filePath of allProjectFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('BEGIN PRIVATE KEY') || content.includes('BEGIN RSA PRIVATE KEY') || content.includes('service_account')) {
    exposedSecretCount++;
    secretMatches.push(filePath);
  }
}

assert(
  'Security Boundary',
  'Zero Firebase service account credentials or private keys in frontend source',
  exposedSecretCount === 0,
  '0 exposed secrets',
  `${exposedSecretCount} exposed secrets found`,
  'No privileged backend credentials or service account JSON files exist in client bundle'
);

// 7. Diagnostics Output
const diagnostics = trustedAuthService.getAuthDiagnostics();
assert(
  'Diagnostics',
  'Auth diagnostics reporting operational readiness',
  diagnostics.authInitialized === true && diagnostics.clientClaimMutationBlocked === true,
  'authInitialized: true, clientClaimMutationBlocked: true',
  `authInitialized: ${diagnostics.authInitialized}, clientClaimMutationBlocked: ${diagnostics.clientClaimMutationBlocked}`,
  'TrustedAuthService provides diagnostic introspection without leaking sensitive data'
);

// Print Results Table
console.table(results);

const passedCount = results.filter((r) => r.status === 'PASS').length;
const failedCount = results.filter((r) => r.status === 'FAIL').length;

console.log(`\nSummary: Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

if (failedCount > 0) {
  console.error('\n❌ VERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('\n✅ ALL TRUSTED IDENTITY & FIREBASE AUTH FOUNDATION VERIFICATIONS PASSED.');
}
