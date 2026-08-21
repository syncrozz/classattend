import { Student, AttendanceSession, AttendanceRecord, Lecturer, Subject } from '../types';

export const INITIAL_LECTURERS: Lecturer[] = [];

export const INITIAL_SUBJECTS: Subject[] = [];

export const INITIAL_STUDENTS: Student[] = [
  // DIA_4B (24 students)
  { id: 'PDA-2502-005', studentId: 'PDA-2502-005', name: 'MUHAMMAD AIMAN BIN MUHAMMAD ARIFF', className: 'DIA_4B', phone: '60166982011', email: 'aiman.ariff@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-018', studentId: 'PDA-2502-018', name: 'FATIN ZAFIRA BINTI MOHD FADHLI', className: 'DIA_4B', phone: '60136353712', email: 'zafira.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-060', studentId: 'PDA-2502-060', name: 'NUR ARTIKAH SYAZWANI BINTI MOHAMAD TERMIZI', className: 'DIA_4B', phone: '601117036367', email: 'artikah.termizi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-064', studentId: 'PDA-2502-064', name: 'NUR HAYANI SYAHINDA BINTI MOHD FAIROZ', className: 'DIA_4B', phone: '60102524206', email: 'nur.hayani@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-100', studentId: 'PDA-2502-100', name: 'AMEERA HAIFA BINTI MOHD HAFIZAL', className: 'DIA_4B', phone: '60136066761', email: 'haifa.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-049', studentId: 'PDA-2502-049', name: 'NUR ADLINA BINTI ABDUL RAHMAN', className: 'DIA_4B', phone: '60167183716', email: 'adlina.rahman@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-057', studentId: 'PDA-2502-057', name: 'PUTRI NUR ELISYAH', className: 'DIA_4B', phone: '60137506051', email: 'elisyah@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-059', studentId: 'PDA-2502-059', name: 'DZAQWAN HAQIM BIN MOHD NIZAM', className: 'DIA_4B', phone: '60142119689', email: 'haqim_nizam@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-078', studentId: 'PDA-2502-078', name: 'DANISH AKRAM BIN MARIZAM', className: 'DIA_4B', phone: '60173154593', email: 'danish_marizam@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-089', studentId: 'PDA-2502-089', name: 'MOHAMMAD IRFAN BIN SABABINI @ SARABINI', className: 'DIA_4B', phone: '60103374911', email: 'mohammad.irfan@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-002', studentId: 'PDA-2502-002', name: 'MUHAMMAD RAIYAN DARWISY BIN MOHD ZALANI', className: 'DIA_4B', phone: '60122187981', email: 'raiyan.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-024', studentId: 'PDA-2502-024', name: 'MOHAMAD ARIS ASHMAN BIN SHARIN', className: 'DIA_4B', phone: '601165088912', email: 'aris_ashman@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-070', studentId: 'PDA-2502-070', name: 'NUR AFIQAH BINTI MUHAMAD MUSLIM', className: 'DIA_4B', phone: '60129207404', email: 'afiqah.muslim@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-098', studentId: 'PDA-2502-098', name: 'NURUL ARYANIE JASMINE BINTI HARMIZI', className: 'DIA_4B', phone: '60143315810', email: 'aryanie@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-099', studentId: 'PDA-2502-099', name: 'FATIN AQILAH BINTI ABDUL JELANI', className: 'DIA_4B', phone: '60199924233', email: 'fatin.jelani@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-032', studentId: 'PDA-2502-032', name: 'NURIRDINA NADIA BINTI MOHAMD AIROLNIZAM', className: 'DIA_4B', phone: '60148427917', email: 'nurirdina@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-061', studentId: 'PDA-2502-061', name: 'NUR HAZWANI BINTI KAMAROZZAMAN', className: 'DIA_4B', phone: '60105545970', email: 'hazwani@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-075', studentId: 'PDA-2502-075', name: 'MUHAMMAD FAIZZUDIN BIN AHMAD', className: 'DIA_4B', phone: '601169328567', email: 'faizzudin.ahmad@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-077', studentId: 'PDA-2502-077', name: 'PUTRI ROSYAFIENA BINTI ASMAD', className: 'DIA_4B', phone: '60143828242', email: 'putri.asmad@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-090', studentId: 'PDA-2502-090', name: 'MUHAMMAD NAQIB ASYRAF BIN SAMSUDDIN', className: 'DIA_4B', phone: '601117997924', email: 'm.naqib@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-063', studentId: 'PDA-2502-063', name: 'NUR SYAMIMI BINTI MOHD SHUHAIMI', className: 'DIA_4B', phone: '60104384597', email: 'syamimi.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-072', studentId: 'PDA-2502-072', name: 'NOOR RUS ALYA BINTI MOHD RAFIE RUSIDI', className: 'DIA_4B', phone: '60193678789', email: 'alya.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-074', studentId: 'PDA-2502-074', name: 'NOR NAJMEENA BINTI ABDUL HASSAN', className: 'DIA_4B', phone: '60175931532', email: 'najmeena@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-079', studentId: 'PDA-2502-079', name: 'AININ SOFIYA BINTI MD SAIFUL SA’ADI', className: 'DIA_4B', phone: '601135431705', email: 'ainin.saiful@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },

  // DIA_4C (24 students)
  { id: 'PDA-2502-004', studentId: 'PDA-2502-004', name: 'MUHAMMAD KHAIRUL SYAKIR BIN SAIPUDIN', className: 'DIA_4C', phone: '601131813639', email: 'khairul.saipudin@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-016', studentId: 'PDA-2502-016', name: 'SITI HUMAIRA BINTI YUSOFF', className: 'DIA_4C', phone: '601118868985', email: 'humaira.yusoff@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-022', studentId: 'PDA-2502-022', name: 'NUR AQILAH SYIFAA BINTI MOHD AFFENDY', className: 'DIA_4C', phone: '60194663597', email: 'syifaa.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-092', studentId: 'PDA-2502-092', name: 'NUR ZULAIKHA BINTI AZMAN', className: 'DIA_4C', phone: '60176325963', email: 'zulaikha.azman@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-094', studentId: 'PDA-2502-094', name: 'MUHAMMAD ARIFF HAKIMI BIN CHE ROMZI', className: 'DIA_4C', phone: '172735701', email: 'hakimi.romzi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-033', studentId: 'PDA-2502-033', name: 'NURUL ALIA AQILAH BINTI WAHAB', className: 'DIA_4C', phone: '601115622938', email: 'alia.wahab@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-034', studentId: 'PDA-2502-034', name: 'BALQIS IBTISAM BINTI SANUSI', className: 'DIA_4C', phone: '60179542817', email: 'balqis.sanus@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-056', studentId: 'PDA-2502-056', name: 'MUHAMMAD NABIL ADHA BIN MOHD ADIB', className: 'DIA_4C', phone: '60103155846', email: 'nabil.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-058', studentId: 'PDA-2502-058', name: 'MUHAMMAD TARIQ HAKIMI BIN MOHD HELMY', className: 'DIA_4C', phone: '601165636506', email: 'tariq@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-066', studentId: 'PDA-2502-066', name: 'MUHAMMAD AQIL BIN MUHAMAD INNAMUL HASAN', className: 'DIA_4C', phone: '60174144853', email: 'aqil.hasan@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-028', studentId: 'PDA-2502-028', name: 'DAMIA ALEESYA BINTI KHAIRUDDIN', className: 'DIA_4C', phone: '60107659248', email: 'damia.khairuddin@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-030', studentId: 'PDA-2502-030', name: 'WARDATUL MAISARAH BINTI IBRAHIM', className: 'DIA_4C', phone: '60145729883', email: 'wardatul@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-035', studentId: 'PDA-2502-035', name: 'SHASHA SHAFINA BINTI SHAHIRUN', className: 'DIA_4C', phone: '60103116979', email: 'shafina@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-080', studentId: 'PDA-2502-080', name: 'AMIR NUQMAN BIN KAMARUL ADLI', className: 'DIA_4C', phone: '6011151519260', email: 'nuqman@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-083', studentId: 'PDA-2502-083', name: 'MUHAMMAD SYAHMI BIN MOHD SHAH RIZAL', className: 'DIA_4C', phone: '601157906852', email: 'muhammad_syahmi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-017', studentId: 'PDA-2502-017', name: 'AINA BATRISYA BINTI AZMI RAIS', className: 'DIA_4C', phone: '60167538845', email: 'aina.azmi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-054', studentId: 'PDA-2502-054', name: 'ZAFRAN MUKHRIS BIN SUKRAN', className: 'DIA_4C', phone: '60183787595', email: 'zafran@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-067', studentId: 'PDA-2502-067', name: 'NUR FATIN AFIQAH BINTI MUSTAKIM', className: 'DIA_4C', phone: '60182694077', email: 'nur.fatin@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-076', studentId: 'PDA-2502-076', name: 'MUHAMMAD AZFAR BIN BURHANUDIN', className: 'DIA_4C', phone: '601129591588', email: 'm.azfar@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-006', studentId: 'PDA-2502-006', name: 'MUHAMMAD DANISH BIN SHAMSUDDIN', className: 'DIA_4C', phone: '60168809514', email: 'muhammad.danish@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-012', studentId: 'PDA-2502-012', name: 'DANISH IBTISAM BIN ZAINAL ABIDIN', className: 'DIA_4C', phone: '60143290421', email: 'danish.zainal@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-047', studentId: 'PDA-2502-047', name: 'AMALIA HADIRAH BINTI MOHD SOUFI', className: 'DIA_4C', phone: '60134055040', email: 'amalia.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-081', studentId: 'PDA-2502-081', name: 'NUR AISYAH BINTI ABDUL RASHID', className: 'DIA_4C', phone: '60192023615', email: 'aisyah.rashid@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-087', studentId: 'PDA-2502-087', name: 'IZZATUL AZZAHRA BINTI ISMAIL', className: 'DIA_4C', phone: '601164581941', email: 'izzatul.ismail@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },

  // DIA_4A (23 students)
  { id: 'PDA-2502-036', studentId: 'PDA-2502-036', name: 'AUNI SOLEHAH BINTI MOHD SALLEHIN', className: 'DIA_4A', phone: '60169334869', email: 'auni.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-037', studentId: 'PDA-2502-037', name: 'BATRISYIA BINTI MUSTAFA', className: 'DIA_4A', phone: '601111727281', email: 'batrisyia.mustafa@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-041', studentId: 'PDA-2502-041', name: 'NUR SYAFIQAH BINTI MOHAMAD SHAHDAN', className: 'DIA_4A', phone: '60138097346', email: 'syafiqah.shahdan@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-069', studentId: 'PDA-2502-069', name: 'MOHAMAD LUQMAN HAKIMI BIN MOHD RIZAL', className: 'DIA_4A', phone: '60176122513', email: 'hakimi.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-039', studentId: 'PDA-2502-039', name: 'NOR SANDRA AIN BINTI MOHAMMAD RIDZUAN', className: 'DIA_4A', phone: '60189605127', email: 'sandra@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-068', studentId: 'PDA-2502-068', name: 'MUHAMMAD HAQIMIE SHAHPUTRA BIN ROY RIZALS', className: 'DIA_4A', phone: '601110539395', email: 'haqimie.rizals@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-073', studentId: 'PDA-2502-073', name: 'MUHAMAD AMIR AZROY BIN MUHAMAD ROSLI', className: 'DIA_4A', phone: '601117318701', email: 'amir.rosli@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-101', studentId: 'PDA-2502-101', name: 'NUR NURIN SAFIYAH BINTI MUHAMAD FADLY', className: 'DIA_4A', phone: '601112115581', email: 'nur.safiyah@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-001', studentId: 'PDA-2502-001', name: 'NUR AISYAH BINTI ABDUL RAZAK', className: 'DIA_4A', phone: '601110571550', email: 'aisyah.razak@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-029', studentId: 'PDA-2502-029', name: 'NURUL INTAN HAFIZA BINTI JAFAR', className: 'DIA_4A', phone: '60177575351', email: 'intan.jafar@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-031', studentId: 'PDA-2502-031', name: 'NURUL IRDINA NASRIN BINTI KHAIRUL ANUAR', className: 'DIA_4A', phone: '60179692215', email: 'nasrin.anuar@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-053', studentId: 'PDA-2502-053', name: 'NURUL IZZATI BINTI ZAIDI', className: 'DIA_4A', phone: '601110643013', email: 'izzati.zaidi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-055', studentId: 'PDA-2502-055', name: 'NUR ASYURA BINTI MOHD FAUZI', className: 'DIA_4A', phone: '60108046650', email: 'asyura.fauzi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-040', studentId: 'PDA-2502-040', name: 'NURUL SHUHADA BINTI HAMID', className: 'DIA_4A', phone: '60102718247', email: 'shuhada.hamid@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-051', studentId: 'PDA-2502-051', name: 'NURNADIA AMANI BINTI YASIRARIF', className: 'DIA_4A', phone: '60108735835', email: 'nurnadia@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-065', studentId: 'PDA-2502-065', name: 'NUR AINI ATHIRAH BINTI ZAIMERUDDIN', className: 'DIA_4A', phone: '601111177844', email: 'nur.aini@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-071', studentId: 'PDA-2502-071', name: 'NURIN AISYAH BINTI HALIM', className: 'DIA_4A', phone: '60166412014', email: 'nurin_aisyah@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-086', studentId: 'PDA-2502-086', name: 'MUHAMMAD QHASIF BIN MOHD RIQZUAL', className: 'DIA_4A', phone: '60146960816', email: 'qhasif.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-014', studentId: 'PDA-2502-014', name: 'MUHAMMAD ABID BIN KAMARUDIN', className: 'DIA_4A', phone: '601111029018', email: 'abid.kamarudin@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-019', studentId: 'PDA-2502-019', name: 'MUHAMMAD ADAM HELMI BIN AMIR HADI', className: 'DIA_4A', phone: '601161061950', email: 'helmi.hadi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-046', studentId: 'PDA-2502-046', name: 'MUHAMMAD MU\'IZZUDEEN BIN FAIZI', className: 'DIA_4A', phone: '60139923405', email: 'muizzudeen@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-082', studentId: 'PDA-2502-082', name: 'ASYRAF RAFIUDDIN BIN ABD AZIZ', className: 'DIA_4A', phone: '60109710978', email: 'asyraf.aziz@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-096', studentId: 'PDA-2502-096', name: 'MUHAMMAD FAHRIN ZAKUAN BIN MOHD FAIZ', className: 'DIA_4A', phone: '601160838449', email: 'fahrin.faiz@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },

  // DIA_4D (24 students)
  { id: 'PDA-2502-048', studentId: 'PDA-2502-048', name: 'NUR ALYA QISTINA BINTI ZULHILMI', className: 'DIA_4D', phone: '60177550108', email: 'alya.zulhilmi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-021', studentId: 'PDA-2502-021', name: 'SITI SYAUQINA RIFQAH BINTI ZURIANI', className: 'DIA_4D', phone: '60189881068', email: 'rifqah@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-038', studentId: 'PDA-2502-038', name: 'NUR FARHANAH DAMIA BINTI MUHAMAD FARIK', className: 'DIA_4D', phone: '601113077349', email: 'farhanah@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-010', studentId: 'PDA-2502-010', name: 'MUHAMMAD EZZAD SYAZWAN BIN MOHD ELMINIZAM', className: 'DIA_4D', phone: '601162855790', email: 'ezzad.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-027', studentId: 'PDA-2502-027', name: 'AMIRA FATEEN BINTI KHAIRUL FAHMY', className: 'DIA_4D', phone: '60136465204', email: 'amira.khairul@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-044', studentId: 'PDA-2502-044', name: 'NUR AINA BATRISYIA BINTI ZULHILMI', className: 'DIA_4D', phone: '60177557040', email: 'aina.zulhilmi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-052', studentId: 'PDA-2502-052', name: 'NAJIHA BINTI MOHAMAD AZIZ', className: 'DIA_4D', phone: '601156883612', email: 'najiha.aziz@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-085', studentId: 'PDA-2502-085', name: 'AQIL AL-FAYYAD BIN HAFIZZUDIN', className: 'DIA_4D', phone: '601155370057', email: 'aqil.hafizzudin@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-008', studentId: 'PDA-2502-008', name: 'ANIQ MUHAIMIN BIN AIMAN LUNGHIE', className: 'DIA_4D', phone: '60149431822', email: 'aniq.lunghie@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-015', studentId: 'PDA-2502-015', name: 'MUHAMMAD ADAM WAFRI BIN ROSIDI', className: 'DIA_4D', phone: '60177870534', email: 'wafri.rosidi@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-013', studentId: 'PDA-2502-013', name: 'SRI NORHAFIZAH BINTI ABD HALIM', className: 'DIA_4D', phone: '601136110728', email: 'norhafizah@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-088', studentId: 'PDA-2502-088', name: 'UMAIRA IMAN DARWINA BINTI MOHD ZAKI', className: 'DIA_4D', phone: '601126890038', email: 'umaira_iman@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-020', studentId: 'PDA-2502-020', name: 'MUHAMMAD FARID BIN MUHAMMAD THANI', className: 'DIA_4D', phone: '601137735010', email: 'farid.thani@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-095', studentId: 'PDA-2502-095', name: 'MUHAMMAD AKMAL HAZIQ BIN AWANG HARIS', className: 'DIA_4D', phone: '60196173656', email: 'akmal.haris@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-011', studentId: 'PDA-2502-011', name: 'NURALIEFA BINTI MAZUKI', className: 'DIA_4D', phone: '601198689897', email: 'nuraliefa@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-045', studentId: 'PDA-2502-045', name: 'DINA HANIM BINTI ABD HALIM', className: 'DIA_4D', phone: '60197187710', email: 'hanim.halim@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-093', studentId: 'PDA-2502-093', name: 'NUR ANIZA BINTI MOHAMAD FAIZAL', className: 'DIA_4D', phone: '601112734971', email: 'aniza.faizal@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-009', studentId: 'PDA-2502-009', name: 'SRI NORHIDAYAH BINTI ABD HALIM', className: 'DIA_4D', phone: '60146880642', email: 'norhidayah@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-026', studentId: 'PDA-2502-026', name: 'NUR AWATIF ATIKAH BINTI MHD ROZAHAINI', className: 'DIA_4D', phone: '601110516446', email: 'awatif.mhd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-042', studentId: 'PDA-2502-042', name: 'MUHAMMAD ADIB ZAKWAN BIN MOHD FAIZAL', className: 'DIA_4D', phone: '601157576254', email: 'adib.mohd@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-084', studentId: 'PDA-2502-084', name: 'HAIRIEZ SYAIFFUDIN BIN AMIN HAMZAH', className: 'DIA_4D', phone: '60108474002', email: 'hairiez.amin@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-091', studentId: 'PDA-2502-091', name: 'NURUL ANIS SOFEA BINTI MOHD SUPARDI', className: 'DIA_4D', phone: '60178252872', email: 'anis_sofea@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-007', studentId: 'PDA-2502-007', name: 'MUHAMMAD HAZMI DANISH BIN MUHAMAT NOR HISAM', className: 'DIA_4D', phone: '60189164841', email: 'hazmi.nor@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
  { id: 'PDA-2502-023', studentId: 'PDA-2502-023', name: 'ZULHAILY RAYYAN BIN ZULZASTRI', className: 'DIA_4D', phone: '60168975676', email: 'zulhaily@bpenawar.kpm.edu.my', department: 'Diploma Perakaunan' },
];

export const INITIAL_SESSIONS: AttendanceSession[] = [];

// Initial attendance records for Class sessions
export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [];

// Aliases for compatibility
export const INITIAL_ACTIVITIES = INITIAL_SESSIONS;
export const MOCK_STAFF = INITIAL_STUDENTS;
export const MOCK_EVENTS = INITIAL_SESSIONS;
export const MOCK_ATTENDANCE_RECORDS = INITIAL_ATTENDANCE_RECORDS;

