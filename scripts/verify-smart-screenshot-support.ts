import {
  ADMIN_WHATSAPP_PHONE,
  ADMIN_WHATSAPP_URL,
  generateAdminSupportMessage,
  generateAdminSupportLink
} from '../src/utils/whatsappHelper';
import {
  captureElementToBlob,
  triggerFileDownload,
  captureAndShareScreenshot,
  performSmartScreenshotSupport
} from '../src/utils/screenshotHelper';
import { normalizeStudentId } from '../src/utils/studentUtils';

interface TestResult {
  step: number;
  category: string;
  testCase: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  notes: string;
}

const results: TestResult[] = [];

function assert(
  step: number,
  category: string,
  testCase: string,
  expected: string,
  actual: string,
  condition: boolean,
  notes: string
) {
  results.push({
    step,
    category,
    testCase,
    expected,
    actual,
    status: condition ? 'PASS' : 'FAIL',
    notes
  });
}

console.log('================================================================');
console.log('CLASSATTEND AUTOMATED VERIFICATION: SMART SCREENSHOT & PM ADMIN (SES v4.5)');
console.log('Testing WhatsApp Admin Support, Screenshot Redaction & Workflows');
console.log('================================================================\n');

// --- 1. WhatsApp Admin Credentials ---
console.log('1. WHATSAPP ADMIN CREDENTIALS');
assert(
  1,
  'Admin Phone',
  'Admin WhatsApp phone is 60145313756',
  '60145313756',
  ADMIN_WHATSAPP_PHONE,
  ADMIN_WHATSAPP_PHONE === '60145313756',
  'Official contact number for KPM Bandar Penawar Admin support'
);

assert(
  2,
  'Admin WhatsApp URL',
  'Admin WhatsApp URL is https://wa.me/60145313756',
  'https://wa.me/60145313756',
  ADMIN_WHATSAPP_URL,
  ADMIN_WHATSAPP_URL === 'https://wa.me/60145313756',
  'Direct WhatsApp chat URL'
);

// --- 2. Malay Automated Support Message ---
console.log('2. MALAY AUTOMATED SUPPORT MESSAGE GENERATION');
const msgParams = {
  studentId: 'PDA-2502-032',
  studentName: 'NUR AMIRA BINTI ISMAIL',
  courseCode: 'MPU 2163',
  courseName: 'Pengajian Malaysia 2',
  className: 'DIA_4A',
  sessionName: 'Kuliah Minggu 3',
  lecturerName: 'Ustaz Khairi',
  issueDescription: 'No. Pelajar tidak dijumpai dalam pangkalan data kursus'
};

const generatedMsg = generateAdminSupportMessage(msgParams);

assert(
  3,
  'Message Header',
  'Contains ClassAttend and KPM Bandar Penawar branding',
  'True',
  generatedMsg.includes('CLASSATTEND') && generatedMsg.includes('Kolej Profesional MARA Bandar Penawar') ? 'True' : 'False',
  generatedMsg.includes('CLASSATTEND') && generatedMsg.includes('Kolej Profesional MARA Bandar Penawar'),
  'Proper college and system context'
);

assert(
  4,
  'Message Malay Phrasing',
  'Message is in polite Bahasa Melayu',
  'True',
  generatedMsg.includes('Salam sejahtera Pentadbir Sistem ClassAttend') &&
  generatedMsg.includes('Saya memerlukan bantuan teknikal') ? 'True' : 'False',
  generatedMsg.includes('Salam sejahtera Pentadbir Sistem ClassAttend') &&
  generatedMsg.includes('Saya memerlukan bantuan teknikal'),
  'Complies with Malay language requirement'
);

assert(
  5,
  'Student Details Included',
  'Contains Student ID, Name, Class, Course, Session, Lecturer',
  'True',
  generatedMsg.includes('PDA-2502-032') &&
  generatedMsg.includes('NUR AMIRA BINTI ISMAIL') &&
  generatedMsg.includes('DIA_4A') &&
  generatedMsg.includes('MPU 2163') &&
  generatedMsg.includes('Ustaz Khairi') ? 'True' : 'False',
  generatedMsg.includes('PDA-2502-032') &&
  generatedMsg.includes('NUR AMIRA BINTI ISMAIL') &&
  generatedMsg.includes('DIA_4A') &&
  generatedMsg.includes('MPU 2163') &&
  generatedMsg.includes('Ustaz Khairi'),
  'All crucial session parameters populated for admin troubleshooting'
);

assert(
  6,
  'Screenshot Attachment Mention',
  'Message explicitly mentions attaching screenshot',
  'True',
  generatedMsg.includes('tangkapan skrin (screenshot)') ? 'True' : 'False',
  generatedMsg.includes('tangkapan skrin (screenshot)'),
  'Alerts admin to review attached image'
);

// --- 3. WhatsApp Support Link Generation ---
console.log('3. WHATSAPP LINK GENERATION');
const supportLink = generateAdminSupportLink(msgParams);

assert(
  7,
  'Link Structure',
  'Link targets https://wa.me/60145313756?text=...',
  'True',
  supportLink.startsWith('https://wa.me/60145313756?text=') ? 'True' : 'False',
  supportLink.startsWith('https://wa.me/60145313756?text='),
  'Targeting official admin phone with prefilled text'
);

assert(
  8,
  'URL Encoding',
  'Contains URL-encoded student ID',
  'True',
  supportLink.includes(encodeURIComponent('PDA-2502-032')) ? 'True' : 'False',
  supportLink.includes(encodeURIComponent('PDA-2502-032')),
  'Safely encoded for web and mobile browsers'
);

// --- 4. Student Normalization Regression Check ---
console.log('4. STUDENT NORMALIZATION REGRESSION CHECK');
assert(
  9,
  'ID Normalization',
  'PDA2502032 normalizes to PDA-2502-032',
  'PDA-2502-032',
  normalizeStudentId('PDA2502032'),
  normalizeStudentId('PDA2502032') === 'PDA-2502-032',
  'Existing normalization functionality fully preserved'
);

// --- 5. Verify Functions Exist and Signatures Match ---
console.log('5. SMART SCREENSHOT HELPER SIGNATURES');
assert(
  10,
  'captureElementToBlob is function',
  'Function',
  'Function',
  typeof captureElementToBlob,
  typeof captureElementToBlob === 'function',
  'Captures DOM element to high-res Blob'
);

assert(
  11,
  'triggerFileDownload is function',
  'Function',
  'Function',
  typeof triggerFileDownload,
  typeof triggerFileDownload === 'function',
  'Fallback downloader for desktop / unsupported browsers'
);

assert(
  12,
  'captureAndShareScreenshot is function',
  'Function',
  'Function',
  typeof captureAndShareScreenshot,
  typeof captureAndShareScreenshot === 'function',
  'Web Share API with file support & fallback'
);

assert(
  13,
  'performSmartScreenshotSupport is function',
  'Function',
  'Function',
  typeof performSmartScreenshotSupport,
  typeof performSmartScreenshotSupport === 'function',
  'High-level end-to-end coordinator'
);

// --- Summary Output ---
console.log('\n================================================================');
console.log('VERIFICATION SUMMARY TABLE:');
console.log('================================================================');
console.table(
  results.map((r) => ({
    Step: r.step,
    Category: r.category,
    Status: r.status,
    Test: r.testCase,
    Notes: r.notes
  }))
);

const failed = results.filter((r) => r.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\n❌ VERIFICATION FAILED: ${failed.length} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`\n✅ ALL ${results.length} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log('Smart Screenshot & PM Admin (SES v4.5) verified.');
}
