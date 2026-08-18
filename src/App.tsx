import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  Student,
  Subject,
  Lecturer,
  AttendanceActivity,
  AttendanceSession,
  AttendanceRecord,
  EventStatus,
  ScanResult,
  AttendanceMethod,
  UserRole
} from './types';
import { attendanceEngine } from './services/attendanceEngine';
import { soundService } from './services/soundService';

import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { DashboardView } from './components/DashboardView';
import { ScannerView } from './components/ScannerView';
import { EventManagementView } from './components/EventManagementView';
import { StaffDirectoryView } from './components/StaffDirectoryView';
import { MyAttendanceView } from './components/MyAttendanceView';
import { ReportsView } from './components/ReportsView';
import { ConceptGuideView } from './components/ConceptGuideView';
import { AdminPinModal } from './components/AdminPinModal';
import { CSVImportModal } from './components/CSVImportModal';
import { PWAInstallModal } from './components/PWAInstallModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');

  // Real-time state from Attendance Engine
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [activeLecturer, setActiveLecturer] = useState<Lecturer | null>(attendanceEngine.getActiveLecturer());
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Admin Mode & Modal States
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [adminActionTitle, setAdminActionTitle] = useState<string>('Sila Sahkan Akses Admin / Pensyarah');
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);

  // PWA Installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Subscriptions to Engine / Firestore
  useEffect(() => {
    const unsubStudents = attendanceEngine.subscribeStudents((data) => setStudents(data));
    const unsubSubjects = attendanceEngine.subscribeSubjects((data) => setSubjects(data));
    const unsubLecturers = attendanceEngine.subscribeLecturers((data) => setLecturers(data));
    const unsubSessions = attendanceEngine.subscribeSessions((data) => setSessions(data));
    const unsubRecords = attendanceEngine.subscribeRecords((data) => setAttendanceRecords(data));

    // Update active lecturer from engine
    setActiveLecturer(attendanceEngine.getActiveLecturer());

    return () => {
      unsubStudents();
      unsubSubjects();
      unsubLecturers();
      unsubSessions();
      unsubRecords();
    };
  }, []);

  const activeSession = sessions.find((s) => s.status === 'OPEN') || null;

  // Toggle Admin / Lecturer Auth Mode
  const handleToggleAdminMode = () => {
    if (isAdmin && activeLecturer) {
      setAdminActionTitle('Tukar / Sahkan Identiti Pensyarah');
      setIsAdminPinModalOpen(true);
    } else if (isAdmin) {
      setIsAdmin(false);
      soundService.playSuccess();
    } else {
      setAdminActionTitle('Pengesahan Identiti Pensyarah (@bpenawar.kpm.edu.my)');
      setIsAdminPinModalOpen(true);
    }
  };

  // Logout Lecturer
  const handleLogoutLecturer = () => {
    attendanceEngine.logoutLecturer();
    setActiveLecturer(null);
    soundService.playClick();
  };

  // Request Admin Access with Context
  const handleRequestAdminAccess = (actionName?: string) => {
    if (!isAdmin || !activeLecturer) {
      setAdminActionTitle(actionName ? `Akses Diperlukan: ${actionName}` : 'Pengesahan Pensyarah Diperlukan');
      setIsAdminPinModalOpen(true);
    }
  };

  // Session Status Change (OPEN / CLOSED / ARCHIVED)
  const handleSetSessionStatus = (sessionId: string, newStatus: EventStatus) => {
    const updated = attendanceEngine.setSessionStatus(sessionId, newStatus);
    setSessions(updated);
    if (newStatus === 'CLOSED') {
      soundService.playClick();
    }
  };

  // Delete Session
  const handleDeleteSession = (sessionId: string) => {
    const updated = attendanceEngine.deleteSession(sessionId);
    setSessions(updated);
    soundService.playClick();
  };

  // Create Subject
  const handleCreateSubject = (newSubject: Subject) => {
    attendanceEngine.addSubject(newSubject);
    setSubjects(attendanceEngine.getSubjects());
    soundService.playSuccess();
  };

  // Delete Subject
  const handleDeleteSubject = (subjectId: string) => {
    attendanceEngine.deleteSubject(subjectId);
    setSubjects(attendanceEngine.getSubjects());
    soundService.playClick();
  };

  // Create Session
  const handleCreateSession = (session: AttendanceSession) => {
    const updated = attendanceEngine.addSession(session);
    setSessions(updated);
    soundService.playSuccess();
  };

  // Process Scan
  const handleProcessScan = (
    qrString: string,
    method: AttendanceMethod = 'CAMERA_SCAN',
    targetSessionId?: string
  ): ScanResult => {
    const result = attendanceEngine.processScan(qrString, method, targetSessionId);
    setAttendanceRecords(attendanceEngine.getAttendanceRecords());
    return result;
  };

  // Quick Simulator Scan
  const handleQuickSimulateScan = (studentId: string): ScanResult => {
    return handleProcessScan(`STUDENT|${studentId}`, 'SIMULATOR');
  };

  // Add Single Student
  const handleAddStudent = (newStudent: Student) => {
    attendanceEngine.addStudent(newStudent);
    setStudents(attendanceEngine.getStudents());
  };

  // Delete Student
  const handleDeleteStudent = (studentId: string) => {
    attendanceEngine.deleteStudent(studentId);
    setStudents(attendanceEngine.getStudents());
  };

  // Import CSV Students
  const handleImportStudents = (newStudentsList: Student[]) => {
    // Merge with existing students by ID
    const existingMap = new Map<string, Student>(students.map((s) => [s.id, s]));
    newStudentsList.forEach((s) => existingMap.set(s.id, s));
    const merged = Array.from(existingMap.values());

    attendanceEngine.saveStudentsList(merged);
    setStudents(merged);
  };

  // Reset Data to Default 95 Students
  const handleResetData = () => {
    if (window.confirm('Adakah anda pasti untuk mengeset semula data kepada Master 95 Pelajar asal?')) {
      attendanceEngine.resetToDefaultData();
      setStudents(attendanceEngine.getStudents());
      setSubjects(attendanceEngine.getSubjects());
      setLecturers(attendanceEngine.getLecturers());
      setSessions(attendanceEngine.getSessions());
      setAttendanceRecords(attendanceEngine.getAttendanceRecords());
      setActiveLecturer(attendanceEngine.getActiveLecturer());
      soundService.playSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* App Header */}
      <Header
        activeSession={activeSession}
        activeLecturer={activeLecturer}
        soundEnabled={soundEnabled}
        isAdmin={isAdmin}
        currentRole={currentRole}
        onRoleChange={(role) => setCurrentRole(role)}
        onToggleSound={(enabled) => setSoundEnabled(enabled)}
        onResetData={handleResetData}
        onOpenScanner={() => setActiveTab('scanner')}
        onToggleAdminMode={handleToggleAdminMode}
        onLogoutLecturer={handleLogoutLecturer}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <SidebarNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          activeSessionName={activeSession?.sessionName}
          totalRecordsCount={attendanceRecords.length}
          onOpenPWAInstall={() => setIsPWAInstallModalOpen(true)}
        />

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              activeSession={activeSession}
              subjects={subjects}
              sessions={sessions}
              students={students}
              attendanceRecords={attendanceRecords}
              lecturers={lecturers}
              activeLecturer={activeLecturer}
              onOpenScanner={() => setActiveTab('scanner')}
              onGoToActivities={() => setActiveTab('activities')}
              onGoToStudents={() => setActiveTab('students')}
              onGoToReports={() => setActiveTab('reports')}
              onCloseActiveSession={(id) => handleSetSessionStatus(id, 'CLOSED')}
              onQuickSimulateScan={handleQuickSimulateScan}
            />
          )}

          {activeTab === 'scanner' && (
            <ScannerView
              activeSession={activeSession}
              allSessions={sessions}
              students={students}
              attendanceRecords={attendanceRecords}
              isAdmin={isAdmin}
              onRequestAdminAccess={handleRequestAdminAccess}
              onProcessScan={handleProcessScan}
              onGoToActivities={() => setActiveTab('activities')}
              soundEnabled={soundEnabled}
              onToggleSound={(enabled) => setSoundEnabled(enabled)}
            />
          )}

          {(activeTab === 'activities' || activeTab === 'classes') && (
            <EventManagementView
              subjects={subjects}
              sessions={sessions}
              attendanceRecords={attendanceRecords}
              activeLecturer={activeLecturer}
              isAdmin={isAdmin}
              onSetSessionStatus={handleSetSessionStatus}
              onCreateSubject={handleCreateSubject}
              onCreateSession={handleCreateSession}
              onDeleteSession={handleDeleteSession}
              onDeleteSubject={handleDeleteSubject}
              onOpenScannerForSession={(sessionId) => {
                handleSetSessionStatus(sessionId, 'OPEN');
                setActiveTab('scanner');
              }}
              onRequestAdminAccess={handleRequestAdminAccess}
            />
          )}

          {activeTab === 'students' && (
            <StaffDirectoryView
              students={students}
              sessions={sessions}
              subjects={subjects}
              attendanceRecords={attendanceRecords}
              isAdmin={isAdmin}
              onAddStudent={handleAddStudent}
              onDeleteStudent={handleDeleteStudent}
              onOpenCSVImport={() => setIsCSVModalOpen(true)}
              onRequestAdminAccess={handleRequestAdminAccess}
              onQuickSimulateScan={handleQuickSimulateScan}
            />
          )}

          {activeTab === 'my-attendance' && (
            <MyAttendanceView
              students={students}
              sessions={sessions}
              subjects={subjects}
              attendanceRecords={attendanceRecords}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              students={students}
              sessions={sessions}
              subjects={subjects}
              attendanceRecords={attendanceRecords}
            />
          )}

          {activeTab === 'guide' && <ConceptGuideView />}
        </main>
      </div>

      {/* Lecturer PIN / IC Verification Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={(lec) => {
          setIsAdmin(true);
          if (lec) {
            setActiveLecturer(lec);
          } else {
            setActiveLecturer(attendanceEngine.getActiveLecturer());
          }
        }}
        actionTitle={adminActionTitle}
      />

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={handleImportStudents}
      />

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => setDeferredPrompt(null)}
      />
    </div>
  );
}
