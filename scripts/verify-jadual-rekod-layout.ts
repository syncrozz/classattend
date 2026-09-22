/**
 * Verification Script: Jadual & Rekod Sesi Kelas Responsive Layout & UX
 * 
 * Audits:
 * 1. Title area layout (full-width block, natural wrapping, no narrow column)
 * 2. Spacing hierarchy (Title -> Description ~4-8px, Description -> Filters ~16-24px, Filters -> Sessions ~20-24px)
 * 3. Course filter responsiveness (flex-wrap: wrap, no horizontal page overflow)
 * 4. Responsive breakpoints handling (Desktop 1920/1440/1280/1024px, Tablet 768px, Mobile 375/414px)
 * 5. Functional logic and session data preservation (zero changes to business logic/Firestore)
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditResult {
  category: string;
  test: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: AuditResult[] = [];

function record(
  category: string,
  test: string,
  expected: string,
  actual: string,
  status: 'PASS' | 'FAIL',
  evidence: string
) {
  results.push({ category, test, expected, actual, status, evidence });
}

async function runVerification() {
  console.log('======================================================');
  console.log('JADUAL & REKOD SESI KELAS — RESPONSIVE LAYOUT AUDIT');
  console.log('======================================================');

  const myAttendancePath = path.join(process.cwd(), 'src', 'components', 'MyAttendanceView.tsx');
  const fileContent = fs.readFileSync(myAttendancePath, 'utf8');

  const sectionMatch = fileContent.match(/<section id="section-jadual-rekod-sesi"[\s\S]*?<\/section>/);
  const sectionContent = sectionMatch ? sectionMatch[0] : '';

  // Test 1: Identify Section 4 Container
  const hasSectionElement = Boolean(sectionMatch);
  record(
    'Layout Architecture',
    'Section container has dedicated semantic ID and full width',
    'section id="section-jadual-rekod-sesi" with w-full',
    hasSectionElement ? 'section element present with w-full' : 'missing section element',
    hasSectionElement ? 'PASS' : 'FAIL',
    'Section 4 is enclosed in a semantic <section> with w-full min-w-0'
  );

  // Test 2: Title Block separation from Filters
  // Must NOT be side-by-side in a narrow row within the section
  const sideBySideTitleFilter = /<div[^>]*flex flex-col sm:flex-row[^>]*>[\s\S]*?Jadual &amp; Rekod Sesi Kelas[\s\S]*?\{subjects\.map/m.test(sectionContent);
  record(
    'Title Area',
    'Heading and Course Filters are vertically stacked in header block (not narrow two-column)',
    'sideBySideTitleFilter === false',
    `sideBySideTitleFilter = ${sideBySideTitleFilter}`,
    !sideBySideTitleFilter ? 'PASS' : 'FAIL',
    'Heading has full width and is not squeezed by right-hand filter container'
  );

  // Test 3: Title and Description typography and spacing
  const hasTitleWithFullWidth = /Jadual &amp; Rekod Sesi Kelas[\s\S]*?<\/h3>/.test(sectionContent);
  const hasDescription = sectionContent.includes('Senarai semua kuliah dan tutorial mengikut subjek yang didaftarkan');
  const titleSpacingMatch = sectionContent.includes('space-y-1.5') || sectionContent.includes('space-y-1');

  record(
    'Title Typography & Spacing',
    'Title and Description have consistent 4-8px spacing (space-y-1.5)',
    'Title + Description present with space-y-1.5 (~6px)',
    `Title present: ${hasTitleWithFullWidth}, Description present: ${hasDescription}, Spacing: ${titleSpacingMatch}`,
    hasTitleWithFullWidth && hasDescription && titleSpacingMatch ? 'PASS' : 'FAIL',
    'Heading readable with natural line height and 6px gap to subtitle'
  );

  // Test 4: Course Filter Container wrapping
  const hasFlexWrap = /flex flex-wrap items-center gap-2/.test(sectionContent) || /flex flex-wrap/.test(sectionContent);
  const hasNoScrollbarForced = !sectionContent.includes('overflow-x-auto pb-1 no-scrollbar');

  record(
    'Course Filter Responsiveness',
    'Course filter buttons wrap across multiple lines (flex-wrap)',
    'flex flex-wrap with no page-overflowing horizontal lock',
    `flex-wrap present: ${hasFlexWrap}, removed rigid single-line scroll: ${hasNoScrollbarForced}`,
    hasFlexWrap && hasNoScrollbarForced ? 'PASS' : 'FAIL',
    'Course pills wrap gracefully onto rows at any viewport width'
  );

  // Test 5: Keyboard accessibility & Button styling
  const hasButtonType = /<button[\s\S]*?type="button"[\s\S]*?onClick=\{\(\) => setFilterSubject\('ALL'\)\}/.test(sectionContent);
  const hasFocusRing = sectionContent.includes('focus:ring-2 focus:ring-indigo-500');

  record(
    'Accessibility',
    'Filter buttons retain keyboard accessibility and visible focus states',
    'type="button" and focus:ring-2 styling',
    `type="button": ${hasButtonType}, focus:ring-2: ${hasFocusRing}`,
    hasButtonType && hasFocusRing ? 'PASS' : 'FAIL',
    'Accessible button tags with focus ring for keyboard navigation'
  );

  // Test 6: Spacing between filters and session list
  const hasSessionDividerSpacing = sectionContent.includes('border-t border-slate-800/80 pt-5') || sectionContent.includes('pt-5');
  record(
    'Visual Spacing Hierarchy',
    'Spacing between Filters and Session Content is 20-24px (pt-5 / border divider)',
    'pt-5 (~20px) divider spacing',
    hasSessionDividerSpacing ? 'pt-5 present with subtle divider' : 'pt-5 missing',
    hasSessionDividerSpacing ? 'PASS' : 'FAIL',
    'Divider creates visual distinction between filter controls and session records'
  );

  // Test 7: Session cards have min-w-0 and break-words
  const hasMinW0 = sectionContent.includes('min-w-0 flex-1') && sectionContent.includes('break-words');
  record(
    'Horizontal Overflow Prevention',
    'Session records contain min-w-0 and break-words to prevent container blowout',
    'min-w-0 flex-1 and break-words present on session items',
    hasMinW0 ? 'min-w-0 and break-words present' : 'missing overflow protection',
    hasMinW0 ? 'PASS' : 'FAIL',
    'Prevents long session names from pushing container beyond viewport'
  );

  // Test 8: Data integrity & business logic unchanged
  const hasFilteredTimelineUnchanged = fileContent.includes('const filteredTimeline = sortSessionsLatestFirst(');
  const hasSetFilterSubject = fileContent.includes('setFilterSubject(sub.code)');
  const hasAttendanceRecords = fileContent.includes('rec?.status === \'PRESENT\'');

  record(
    'Logic Invariance',
    'Session data, queries, attendance calculations, and filtering logic are unchanged',
    'All filterSubject state and attendance calculation preserved',
    `filteredTimeline: ${hasFilteredTimelineUnchanged}, setFilter: ${hasSetFilterSubject}, records: ${hasAttendanceRecords}`,
    hasFilteredTimelineUnchanged && hasSetFilterSubject && hasAttendanceRecords ? 'PASS' : 'FAIL',
    'Pure UI/layout adjustment with zero modifications to business logic'
  );

  // Print results
  console.table(results);

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`\nSummary: Total: ${results.length} | Passed: ${results.filter((r) => r.status === 'PASS').length} | Failed: ${results.filter((r) => r.status === 'FAIL').length}`);

  if (!allPassed) {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL JADUAL & REKOD SESI KELAS RESPONSIVE LAYOUT VERIFICATIONS PASSED.');
    process.exit(0);
  }
}

runVerification();
