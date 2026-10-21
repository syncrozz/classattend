var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/firebase-admin.ts
function parseServiceAccountEnv() {
  const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawEnv && rawEnv.trim()) {
    let clean = rawEnv.trim();
    if (clean.startsWith('"') && clean.endsWith('"') || clean.startsWith("'") && clean.endsWith("'")) {
      clean = clean.slice(1, -1).trim();
    }
    let jsonContent = clean;
    if (!clean.startsWith("{")) {
      try {
        const decoded = Buffer.from(clean, "base64").toString("utf-8").trim();
        if (decoded.startsWith("{")) {
          jsonContent = decoded;
        }
      } catch {
      }
    }
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.client_email || typeof parsed.client_email !== "string") {
        return {
          credentials: null,
          error: "FIREBASE_SERVICE_ACCOUNT tidak sah: Medan 'client_email' tiada atau tidak lengkap."
        };
      }
      if (!parsed.private_key || typeof parsed.private_key !== "string") {
        return {
          credentials: null,
          error: "FIREBASE_SERVICE_ACCOUNT tidak sah: Medan 'private_key' tiada atau tidak lengkap."
        };
      }
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      return { credentials: parsed, error: null };
    } catch (parseErr) {
      return {
        credentials: null,
        error: "FIREBASE_SERVICE_ACCOUNT mengandungi JSON tidak sah. Sila pastikan format JSON lengkap atau gunakan format Base64."
      };
    }
  }
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
      return {
        credentials: {
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: privateKey,
          project_id: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId
        },
        error: null
      };
    } catch (discreteErr) {
      return {
        credentials: null,
        error: "Gagal memproses FIREBASE_CLIENT_EMAIL atau FIREBASE_PRIVATE_KEY berasingan."
      };
    }
  }
  return {
    credentials: null,
    error: "Pemboleh ubah persekitaran FIREBASE_SERVICE_ACCOUNT belum dikonfigurasi."
  };
}
function initFirebaseAdmin() {
  if (adminApp && firestoreDb) {
    return { app: adminApp, db: firestoreDb, error: null };
  }
  try {
    const { credentials, error: parseError } = parseServiceAccountEnv();
    const isGcpEnvironment = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE);
    if (!credentials && !isGcpEnvironment) {
      adminInitError = parseError || "Pemboleh ubah persekitaran FIREBASE_SERVICE_ACCOUNT belum dikonfigurasi.";
      return { app: null, db: null, error: adminInitError };
    }
    const { initializeApp, getApps, cert } = require2("firebase-admin/app");
    const { getFirestore } = require2("firebase-admin/firestore");
    const { getStorage } = require2("firebase-admin/storage");
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
    } else {
      const projectId = credentials?.project_id || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== "syncrozz-platform" ? process.env.FIREBASE_PROJECT_ID : firebaseConfig.projectId) || "gen-lang-client-0981591806";
      const storageBucket = (process.env.FIREBASE_STORAGE_BUCKET && !process.env.FIREBASE_STORAGE_BUCKET.includes("syncrozz-platform") ? process.env.FIREBASE_STORAGE_BUCKET : firebaseConfig.storageBucket) || `${projectId}.firebasestorage.app`;
      const appOptions = {
        projectId,
        storageBucket
      };
      if (credentials) {
        appOptions.credential = cert({
          projectId: credentials.project_id || credentials.projectId || projectId,
          clientEmail: credentials.client_email || credentials.clientEmail,
          privateKey: credentials.private_key || credentials.privateKey
        });
      }
      adminApp = initializeApp(appOptions);
    }
    const databaseId = (process.env.FIRESTORE_DATABASE_ID && process.env.FIRESTORE_DATABASE_ID !== "default" ? process.env.FIRESTORE_DATABASE_ID : firebaseConfig.firestoreDatabaseId) || "ai-studio-teamkpmbp-bd501981-2a65-4671-892c-6de5c1a9cd1c";
    try {
      firestoreDb = getFirestore(adminApp, databaseId);
      try {
        if (firestoreDb) {
          firestoreDb.settings({ ignoreUndefinedProperties: true });
        }
      } catch {
      }
    } catch (dbErr) {
      try {
        firestoreDb = getFirestore(adminApp);
        try {
          if (firestoreDb) {
            firestoreDb.settings({ ignoreUndefinedProperties: true });
          }
        } catch {
        }
      } catch {
      }
    }
    try {
      if (adminApp) {
        const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || `${adminApp.options?.projectId || "gen-lang-client-0981591806"}.firebasestorage.app`;
        const storage = getStorage(adminApp);
        storageBucketInstance = storage.bucket(storageBucketName);
      }
    } catch {
    }
    adminInitError = null;
    return { app: adminApp, db: firestoreDb, error: null };
  } catch (err) {
    adminInitError = err.message || "Ralat semasa inisialisasi Firebase Admin";
    return { app: null, db: null, error: adminInitError };
  }
}
function getAdminDb() {
  if (!firestoreDb) {
    initFirebaseAdmin();
  }
  return firestoreDb;
}
function getStorageBucket() {
  if (!storageBucketInstance) {
    initFirebaseAdmin();
  }
  return storageBucketInstance;
}
async function checkFirebaseAdminStatus() {
  if (cachedStatus && Date.now() - cachedStatus.timestamp < 3e4) {
    return cachedStatus.status;
  }
  const { credentials, error: parseError } = parseServiceAccountEnv();
  const projectId = credentials?.project_id || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== "syncrozz-platform" ? process.env.FIREBASE_PROJECT_ID : firebaseConfig.projectId) || "gen-lang-client-0981591806";
  const databaseId = (process.env.FIRESTORE_DATABASE_ID && process.env.FIRESTORE_DATABASE_ID !== "default" ? process.env.FIRESTORE_DATABASE_ID : firebaseConfig.firestoreDatabaseId) || "ai-studio-teamkpmbp-bd501981-2a65-4671-892c-6de5c1a9cd1c";
  const storageBucket = (process.env.FIREBASE_STORAGE_BUCKET && !process.env.FIREBASE_STORAGE_BUCKET.includes("syncrozz-platform") ? process.env.FIREBASE_STORAGE_BUCKET : firebaseConfig.storageBucket) || `${projectId}.firebasestorage.app`;
  const isGcpEnvironment = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE);
  if (!credentials && !isGcpEnvironment) {
    const unconfiguredStatus = {
      configured: false,
      projectId,
      databaseId,
      storageBucket,
      hasServiceAccount: false,
      connectionHealthy: false,
      error: parseError || "Pemboleh ubah persekitaran FIREBASE_SERVICE_ACCOUNT belum dikonfigurasi.",
      guidance: "Untuk mengaktifkan Firestore & Storage di Vercel: Tambah environment variable tunggal FIREBASE_SERVICE_ACCOUNT (Service Account JSON penuh atau Base64) dalam tetapan Vercel."
    };
    cachedStatus = { status: unconfiguredStatus, timestamp: Date.now() };
    return unconfiguredStatus;
  }
  const db = getAdminDb();
  let connectionHealthy = false;
  let testError = parseError || adminInitError || void 0;
  if (db) {
    try {
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Firestore connection check timed out (3500ms)")), 3500)
      );
      await Promise.race([
        db.collection("test").doc("connection").get(),
        timeoutPromise
      ]);
      connectionHealthy = true;
      testError = void 0;
    } catch (err) {
      if (err.code === 7 || err.message?.includes("PERMISSION_DENIED")) {
        testError = "PERMISSION_DENIED: Akses Firestore ditolak. Sila pastikan Service Account mempunyai peranan (Role) Cloud Datastore Owner atau Firebase Admin.";
      } else {
        testError = err.message || "Sambungan ke Firestore ditolak.";
      }
    }
  }
  const isConfigured = Boolean(connectionHealthy || credentials);
  const status = {
    configured: isConfigured,
    projectId,
    databaseId,
    storageBucket,
    hasServiceAccount: Boolean(credentials),
    serviceAccountClientEmail: credentials ? credentials.client_email : void 0,
    connectionHealthy,
    error: connectionHealthy ? void 0 : testError,
    guidance: connectionHealthy ? void 0 : "Untuk mengaktifkan Firestore & Storage di Vercel: Tambah environment variable tunggal FIREBASE_SERVICE_ACCOUNT (Service Account JSON penuh atau Base64) dalam tetapan Vercel."
  };
  cachedStatus = { status, timestamp: Date.now() };
  return status;
}
var import_module, import_fs, import_path, import_url, import_meta, require2, __filename, __dirname, configPath, firebaseConfig, adminApp, firestoreDb, storageBucketInstance, adminInitError, cachedStatus;
var init_firebase_admin = __esm({
  "src/server/firebase-admin.ts"() {
    import_module = require("module");
    import_fs = __toESM(require("fs"), 1);
    import_path = __toESM(require("path"), 1);
    import_url = require("url");
    import_meta = {};
    require2 = (0, import_module.createRequire)(import_meta.url);
    __filename = (0, import_url.fileURLToPath)(import_meta.url);
    __dirname = import_path.default.dirname(__filename);
    configPath = import_path.default.resolve(__dirname, "../../firebase-applet-config.json");
    firebaseConfig = {
      projectId: "gen-lang-client-0981591806",
      firestoreDatabaseId: "ai-studio-teamkpmbp-bd501981-2a65-4671-892c-6de5c1a9cd1c",
      storageBucket: "gen-lang-client-0981591806.firebasestorage.app"
    };
    if (import_fs.default.existsSync(configPath)) {
      try {
        firebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
      } catch {
      }
    }
    adminApp = null;
    firestoreDb = null;
    storageBucketInstance = null;
    adminInitError = null;
    cachedStatus = null;
  }
});

// data/auth_data.json
var auth_data_default;
var init_auth_data = __esm({
  "data/auth_data.json"() {
    auth_data_default = {
      isSetup: true,
      adminEmail: "khaikerr@gmail.com",
      adminPasswordHash: "1c5b4fbca3d984fb5d89c44516cfb04753a7bb6706d54ecf1ccedff57b2cbacd423699b33febcb1dfd985cc626ba4c1c054d2f00f6157dabc2e69dac8191890d",
      adminPasswordSalt: "cd28a2db1e23aaaad7b0bb17caa1e837",
      teamPasscode: "KPMBP2026",
      sessions: {
        c971030518e96b047a8e4ea2e876ea822438e94e2be6e2866bf2494523d48c3a: {
          role: "admin",
          email: "khaikerr@gmail.com",
          expiresAt: 1792504543616
        },
        "21ae76f03b328a570fa504f9711b0a7423e24c1d5267ca986f650c90df163745": {
          role: "admin",
          email: "khaikerr@gmail.com",
          expiresAt: 1792505383686
        },
        "4ea6b9e6c4c6216d7d56541b55bef128bf2457db8240c3a76c4372bcd3d8f59d": {
          role: "team",
          expiresAt: 1792507839862
        },
        "7dbb84347d9db3a6229de72398d9484a25ebe9b0875df9c25677051aa6ffaa34": {
          role: "admin",
          email: "khaikerr@gmail.com",
          expiresAt: 1792507849924
        }
      }
    };
  }
});

// data/portal_data.json
var portal_data_default;
var init_portal_data = __esm({
  "data/portal_data.json"() {
    portal_data_default = {
      tabs: [
        {
          id: "home",
          label: "Utama",
          order: 1,
          visible: true,
          isSystem: true,
          description: "Hab Maklumat & Operasi Kontinjen"
        },
        {
          id: "gallery",
          label: "Galeri Poster",
          order: 2,
          visible: true,
          isSystem: false,
          description: "Infografik & poster rasmi mengikut kategori"
        },
        {
          id: "schedule",
          label: "Jadual Pertandingan",
          order: 3,
          visible: true,
          isSystem: false,
          description: "Jadual carta, waktu giliran & latihan"
        },
        {
          id: "announcements",
          label: "Hebahan Telegram",
          order: 3,
          visible: true,
          isSystem: false,
          description: "Mesej rasmi, poster & notis segera"
        },
        {
          id: "events",
          label: "Maklumat Acara",
          order: 4,
          visible: true,
          isSystem: false,
          description: "Acara SOAR, syarat & pegawai pasukan"
        },
        {
          id: "locations",
          label: "Lokasi & Pergerakan",
          order: 5,
          visible: true,
          isSystem: false,
          description: "Venue pertandingan, penginapan & bas"
        },
        {
          id: "documents",
          label: "Dokumen & Rujukan",
          order: 6,
          visible: true,
          isSystem: false,
          description: "Buku panduan, borang teknikal & syarat"
        }
      ],
      settings: {
        eventTitle: "KPMBP SOAR 2026 Contingent Hub",
        eventSubtitle: "Hab Maklumat & Operasi Rasmi Kontinjen KPM Bandar Penawar",
        contingentName: "KPM Bandar Penawar (KPMBP)",
        motto: "Kecemerlangan Terbukti, Semangat Menjulang",
        secretariatLocation: "Bilik Gerakan Kontinjen KPMBP, Aras 2 Blok Penginapan",
        emergencyContactName: "Urus Setia Kontinjen (Cikgu Khairi / En. Azman)",
        emergencyContactPhone: "+60 19-700 8921",
        allowPublicGuestView: true,
        activePhase: "pre-final",
        phaseAName: "Fasa A: Persediaan Pra-Final",
        phaseADescription: "Senarai semak, persiapan, jadual taklimat, aturan ketibaan & penginapan",
        phaseBName: "Fasa B: Semasa Pertandingan Final",
        phaseBDescription: "Aktiviti hari ini, masa berkumpul, venue pertandingan, giliran persembahan & keputusan",
        phaseDates: "SOAR 2026"
      },
      categories: [
        {
          id: "symphonic-duo",
          name: "Symphonic Duo",
          shortCode: "SD",
          description: "Saluran Hebahan & Jadual Kategori Symphonic Duo",
          managerName: "Ustazah Noraini (Pengurus Acara)",
          managerPhone: "+60 19-700 8921",
          order: 1,
          visible: true
        },
        {
          id: "islamic-theatre",
          name: "Islamic Theatre",
          shortCode: "IT",
          description: "Saluran Hebahan & Jadual Teater Islamik Kontinjen",
          managerName: "Cikgu Razali (Pengurus Teater)",
          managerPhone: "+60 19-700 8922",
          order: 2,
          visible: true
        },
        {
          id: "battle-of-the-bands",
          name: "Battle of the Bands",
          shortCode: "BOTB",
          description: "Saluran Hebahan & Jadual Battle of the Bands",
          managerName: "En. Shahrul (Pengurus Kugiran)",
          managerPhone: "+60 19-700 8923",
          order: 3,
          visible: true
        },
        {
          id: "tarian-zapin",
          name: "Tarian Zapin",
          shortCode: "TZ",
          description: "Saluran Hebahan & Jadual Pasukan Tarian Zapin",
          managerName: "Puan Faridah (Jurulatih & Pengurus)",
          managerPhone: "+60 19-700 8924",
          order: 4,
          visible: true
        },
        {
          id: "street-dakwah",
          name: "Street Dakwah",
          shortCode: "SDW",
          description: "Saluran Hebahan & Jadual Street Dakwah Terbuka",
          managerName: "Ustaz Haziq (Pembimbing Dakwah)",
          managerPhone: "+60 19-700 8925",
          order: 5,
          visible: true
        },
        {
          id: "majlis-penutupan",
          name: "Majlis Penutupan SOAR",
          shortCode: "MPS",
          description: "Raptai perarakan, atur cara dan pengumuman keputusan rasmi",
          managerName: "Urus Setia Kontinjen KPMBP",
          managerPhone: "+60 19-700 8920",
          order: 6,
          visible: true
        },
        {
          id: "penginapan",
          name: "Penginapan Kontinjen",
          shortCode: "LOG",
          description: "Kolej Kediaman, peraturan bilik & kebajikan peserta",
          managerName: "En. Hafiz (Warden / Urus Setia)",
          managerPhone: "+60 19-700 8926",
          order: 7,
          visible: true
        },
        {
          id: "pengangkutan",
          name: "Pengangkutan & Bas",
          shortCode: "TRN",
          description: "Jadual pergerakan bas kontinjen & koordinasi pemandu",
          managerName: "En. Fauzi (Pegawai Pengangkutan)",
          managerPhone: "+60 19-700 8927",
          order: 8,
          visible: true
        },
        {
          id: "general",
          name: "Urus Setia / Hebahan Am",
          shortCode: "GEN",
          description: "Pemberitahuan rasmi Ketua Kontinjen & Urus Setia KPMBP",
          managerName: "Ketua Kontinjen KPMBP",
          managerPhone: "+60 19-700 8928",
          order: 9,
          visible: true
        }
      ],
      announcements: [
        {
          id: "ann_poster_pendaftaran",
          title: "Infografik Panduan Pendaftaran & Semakan Kad Matrik Peserta",
          content: "Garis panduan rasmi pendaftaran kontinjen: semakan kad matrik asal, borang akuan kesihatan penjaga dan pengagihan tag akreditasi SOAR 2026.",
          priority: "urgent",
          isPinned: true,
          category: "pendaftaran",
          phase: "pre-final",
          status: "published",
          author: "Urus Setia Pendaftaran KPMBP",
          timestamp: "13 Mei 2026, 08:30",
          imageUrl: "/uploads/soar_pendaftaran_peserta.svg",
          imageCaption: "Infografik syarat pendaftaran dan senarai dokumen wajib dibawa oleh peserta.",
          tags: ["Pendaftaran", "KadMatrik", "Wajib", "SOAR2026"],
          importantDates: "14 Mei 2026 (2:00 - 6:00 Petang) @ Foyer Utama",
          lastUpdated: "13 Mei 2026, 08:30"
        },
        {
          id: "ann_poster_penginapan",
          title: "Panduan & Peraturan Penginapan Kolej Kediaman Kontinjen",
          content: "Maklumat penempatan bilik kolej kediaman, etika pergaulan, curfew jam 11:00 malam dan talian kecemasan bilik gerakan kontinjen.",
          priority: "important",
          isPinned: true,
          category: "penginapan",
          phase: "all",
          status: "published",
          author: "Warden & Urus Setia Kebajikan",
          timestamp: "12 Mei 2026, 14:00",
          imageUrl: "/uploads/soar_penginapan_panduan.svg",
          imageCaption: "Pelan kolej kediaman, pembahagian blok lelaki/wanita dan nombor bilik gerakan 24 jam.",
          tags: ["Penginapan", "Asrama", "Curfew", "Kebajikan"],
          importantDates: "Curfew: 11:00 Malam Setiap Hari",
          lastUpdated: "12 Mei 2026, 14:00"
        },
        {
          id: "ann_poster_jadual",
          title: "Carta Giliran & Waktu Persembahan Peringkat Akhir",
          content: "Jadual rasmi giliran bertanding bagi Symphonic Duo, Tarian Zapin, Battle of the Bands dan Street Dakwah kontinjen KPMBP.",
          priority: "urgent",
          isPinned: true,
          category: "jadual",
          phase: "during-final",
          status: "published",
          author: "Jawatankuasa Teknikal Kontinjen",
          timestamp: "13 Mei 2026, 10:00",
          imageUrl: "/uploads/soar_jadual_pertandingan.svg",
          imageCaption: "Jadual masa berlepas bas dan waktu giliran di auditorium & pentas budaya.",
          tags: ["Jadual", "Giliran", "PentasUtama", "Pertandingan"],
          importantDates: "15-16 Mei 2026 (Rujuk infografik giliran)",
          lastUpdated: "13 Mei 2026, 10:00"
        },
        {
          id: "ann_poster_jadual_old",
          title: "Jadual Awal Raptai & Soundcheck (Versi Terdahulu)",
          content: "Jadual draf awal slot soundcheck sebelum pengemaskinian masa oleh penganjur pusat.",
          priority: "general",
          isPinned: false,
          category: "jadual",
          phase: "pre-final",
          status: "published",
          author: "Jawatankuasa Teknikal Kontinjen",
          timestamp: "10 Mei 2026, 09:00",
          imageUrl: "/uploads/soar_jadual_pertandingan.svg",
          imageCaption: "Versi draf awal \u2014 telah digantikan oleh carta waktu rasmi bertarikh 13 Mei.",
          tags: ["Jadual", "Arkib"],
          isSuperseded: true,
          supersededReason: "Digantikan oleh Carta Giliran & Waktu Persembahan Rasmi terkini.",
          lastUpdated: "10 Mei 2026, 09:00"
        },
        {
          id: "ann_soar_01",
          title: "Taklimat Akhir & Raptai Perjalanan Kontinjen KPMBP",
          content: "PENGUMUMAN URUS SETIA KONTINJEN KPMBP:\n\nSemua pengurus pasukan, jurulatih dan ketua peserta bagi setiap acara (Symphonic Duo, Islamic Theatre, Battle of the Bands, Tarian Zapin & Street Dakwah) diminta hadir ke Taklimat Akhir Kontinjen.\n\nTarikh: 14 Mei 2026\nMasa: 8:30 Malam\nTempat: Bilik Gerakan Kontinjen (Aras 2)\n\nAgenda:\n1. Semakan dokumen pendaftaran dan kad matrik\n2. Jadual pergerakan bas ke venue pertandingan\n3. Pengagihan tag kontinjen dan t-shirt rasmi\n4. Arahan disiplin dan kebajikan peserta\n\nHarap maklum dan patuhi ketetapan masa.",
          priority: "urgent",
          isPinned: true,
          category: "general",
          phase: "pre-final",
          status: "published",
          author: "Ketua Kontinjen KPMBP",
          timestamp: "12 Mei 2026, 09:00",
          externalUrlLabel: "Saluran Telegram Rasmi KPMBP",
          lastUpdated: "12 Mei 2026, 09:00"
        },
        {
          id: "ann_soar_02",
          title: "Makluman Slot Soundcheck & Rehearsal Symphonic Duo",
          content: "PERHATIAN PASUKAN SYMPHONIC DUO:\n\nSlot ujian bunyi (soundcheck) dan rehearsal teknikal di pentas utama telah ditetapkan:\n- Tarikh: 15 Mei 2026\n- Masa: 10:00 Pagi - 10:45 Pagi\n- Tempat: Auditorium Utama SOAR 2026\n\nSila pastikan semua instrumen akustik dan kabel audio telah diserahkan kepada kru teknikal 15 minit lebih awal. Pasukan diiringi oleh Ustazah Noraini.",
          priority: "important",
          isPinned: true,
          category: "symphonic-duo",
          phase: "all",
          status: "published",
          author: "Pengurus Acara Symphonic Duo",
          timestamp: "12 Mei 2026, 11:30",
          lastUpdated: "12 Mei 2026, 11:30"
        },
        {
          id: "ann_soar_03",
          title: "Peraturan Bilik & Disiplin di Kolej Kediaman Kontinjen",
          content: "MAKLUMAN PENGINAPAN KONTINJEN KPMBP:\n\n1. Waktu berkurung (curfew) adalah pada jam 11:00 malam setiap hari.\n2. Peserta tidak dibenarkan keluar dari kawasan kampus tanpa kebenaran bertulis warden atau ketua kontinjen.\n3. Kebersihan bilik hendaklah dipelihara sepanjang masa.\n4. Sebarang kecemasan perubatan sila hubungi Bilik Gerakan segera: +60 19-700 8921.",
          priority: "general",
          isPinned: false,
          category: "penginapan",
          phase: "all",
          status: "published",
          author: "Urus Setia Kebajikan",
          timestamp: "11 Mei 2026, 16:00",
          lastUpdated: "11 Mei 2026, 16:00"
        }
      ],
      schedules: [
        {
          id: "sch_soar_01",
          categoryName: "Symphonic Duo",
          subcategory: "Peringkat Akhir Kebangsaan",
          date: "15 Mei 2026",
          time: "14:30 - 17:00",
          venue: "Auditorium Utama Kompleks Seni",
          performanceOrder: "Giliran ke-4 (Sesi Petang)",
          notes: "Soundcheck jam 10:00 pagi. Berada di bilik menunggu (holding room) jam 13:45.",
          phase: "during-final",
          status: "published",
          order: 1,
          lastUpdated: "12 Mei 2026"
        },
        {
          id: "sch_soar_02",
          categoryName: "Tarian Zapin",
          subcategory: "Pertandingan Tarian Tradisional",
          date: "15 Mei 2026",
          time: "20:30 - 23:00",
          venue: "Pentas Terbuka Budaya",
          performanceOrder: "Giliran ke-2",
          notes: "Persiapan busana dan solekan bermula jam 17:00 di bilik persalinan kontinjen.",
          phase: "during-final",
          status: "published",
          order: 2,
          lastUpdated: "12 Mei 2026"
        },
        {
          id: "sch_soar_03",
          categoryName: "Battle of the Bands",
          subcategory: "Pentas Akhir Kombo",
          date: "16 Mei 2026",
          time: "15:00 - 18:30",
          venue: "Dewan Perdana SOAR",
          performanceOrder: "Giliran ke-5",
          notes: "Loading gear muzik jam 12:00 tengah hari. Patuhi senarai lagu yang telah diluluskan.",
          phase: "during-final",
          status: "published",
          order: 3,
          lastUpdated: "12 Mei 2026"
        },
        {
          id: "sch_soar_04",
          categoryName: "Street Dakwah",
          subcategory: "Pidato Dakwah Kontemporari",
          date: "16 Mei 2026",
          time: "09:00 - 12:30",
          venue: "Plaza Terbuka Pavilion",
          performanceOrder: "Giliran ke-3",
          notes: "Peserta dinasihatkan membuat pemanasan vokal jam 08:00 pagi bersama pembimbing.",
          phase: "during-final",
          status: "published",
          order: 4,
          lastUpdated: "12 Mei 2026"
        }
      ],
      documents: [
        {
          id: "doc_soar_01",
          title: "Buku Panduan & Syarat Am Pertandingan SOAR 2026",
          category: "Syarat & Garis Panduan",
          description: "Garis panduan rasmi penganjur, kriteria permarkahan dan peraturan disiplin peserta.",
          fileUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
          fileType: "pdf",
          phase: "all",
          status: "published",
          order: 1,
          isPinned: true,
          lastUpdated: "10 Mei 2026"
        },
        {
          id: "doc_soar_02",
          title: "Jadual Induk Pergerakan & Pengangkutan Kontinjen KPMBP",
          category: "Jadual & Pergerakan",
          description: "Carta waktu perjalanan bas dari KPM Bandar Penawar ke lokasi festival dan pergerakan harian.",
          fileUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/edit",
          fileType: "sheet",
          phase: "all",
          status: "published",
          order: 2,
          isPinned: true,
          lastUpdated: "11 Mei 2026"
        },
        {
          id: "doc_soar_03",
          title: "Senarai Semak Pendaftaran & Dokumen Rasmi Peserta",
          category: "Borang & Senarai Semak",
          description: "Checklist semakan kad pengenalan, surat kebenaran ibu bapa dan insurans peserta.",
          fileUrl: "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/edit",
          fileType: "doc",
          phase: "pre-final",
          status: "published",
          order: 3,
          isPinned: false,
          lastUpdated: "09 Mei 2026"
        }
      ],
      eventSections: [
        {
          id: "sec_soar_01",
          title: "Atur Cara Hari Pertama & Ketibaan Kontinjen",
          category: "Rundown",
          type: "rundown",
          description: "Jadual atur cara hari ketibaan kontinjen KPM Bandar Penawar.",
          phase: "pre-final",
          status: "published",
          order: 1,
          items: [
            {
              id: "item_rd_01",
              title: "Pelepasan Bas Kontinjen dari KPM Bandar Penawar",
              subtitle: "Kolej Profesional MARA Bandar Penawar",
              time: "08:00 Pagi",
              badge: "Perjalanan",
              detail: "Semua peserta dan pengurus berkumpul di perkarangan Kolej jam 07:30 pagi untuk pendaftaran bagasi dan doa selamat."
            },
            {
              id: "item_rd_02",
              title: "Ketibaan & Pendaftaran Bilik Kediaman",
              subtitle: "Kolej Kediaman Festival SOAR",
              time: "14:00 Petang",
              badge: "Check-in",
              detail: "Pengambilan kunci bilik oleh pengurus pasukan dan taklimat ringkas peraturan asrama."
            },
            {
              id: "item_rd_03",
              title: "Taklimat Pengurus Kontinjen & Pengundian Giliran",
              subtitle: "Bilik Mesyuarat Utama Urus Setia Pusat",
              time: "20:00 Malam",
              badge: "Wajib",
              detail: "Pengundian giliran bertanding bagi semua kategori disertai Kontinjen KPMBP."
            }
          ]
        },
        {
          id: "sec_soar_02",
          title: "Direktori Pegawai & Pengurus Pasukan KPMBP",
          category: "Pegawai",
          type: "contacts",
          description: "Senarai pegawai kontinjen dan talian telefon untuk dihubungi.",
          phase: "all",
          status: "published",
          order: 2,
          items: [
            {
              id: "item_of_01",
              title: "Cikgu Khairul Anuar",
              subtitle: "Ketua Kontinjen KPMBP",
              badge: "Pucuk Pimpinan",
              contactNumber: "+60 19-700 8920",
              detail: "Bertanggungjawab ke atas keseluruhan operasi dan kebajikan kontinjen."
            },
            {
              id: "item_of_02",
              title: "Cikgu Khairi (khaikerr@gmail.com)",
              subtitle: "Penyelaras Urus Setia & Pentadbir Hab",
              badge: "Urus Setia",
              contactNumber: "+60 19-700 8921",
              detail: "Pengurusan maklumat hab, kemas kini hebahan Telegram dan logistik."
            },
            {
              id: "item_of_03",
              title: "Puan Faridah",
              subtitle: "Pengurus Pasukan Seni & Budaya",
              badge: "Jurulatih",
              contactNumber: "+60 19-700 8924",
              detail: "Penyelaras pasukan Tarian Zapin dan Teater Islamik."
            }
          ]
        }
      ],
      locations: [
        {
          id: "loc_soar_01",
          name: "Bilik Gerakan Kontinjen KPMBP",
          category: "assembly",
          address: "Aras 2, Blok B Kolej Kediaman Siswa",
          notes: "Pusat operasi 24 jam urus setia kontinjen. Sebarang pertanyaan dan kecemasan.",
          contactPerson: "Cikgu Khairi",
          contactPhone: "+60 19-700 8921",
          phase: "all",
          status: "published",
          order: 1
        },
        {
          id: "loc_soar_02",
          name: "Auditorium Utama Kompleks Seni",
          category: "venue",
          address: "Kompleks Seni & Warisan Kampus",
          notes: "Venue bagi pertandingan Symphonic Duo dan Teater Islamik.",
          mapUrl: "https://maps.google.com",
          scheduleTimes: "Pertandingan bermula jam 14:00",
          phase: "during-final",
          status: "published",
          order: 2
        },
        {
          id: "loc_soar_03",
          name: "Pusat Hentian Bas Kontinjen (Pick-Up Point)",
          category: "transport",
          address: "Parkir Bas Utama Hadapan Kolej Kediaman",
          notes: "Bas bergerak 45 minit sebelum setiap sesi acara bermula. Patuhi waktu berlepas.",
          scheduleTimes: "Sesi Pagi: 07:45 | Sesi Petang: 13:15 | Sesi Malam: 19:30",
          contactPerson: "En. Fauzi (Pegawai Pengangkutan)",
          contactPhone: "+60 19-700 8927",
          phase: "all",
          status: "published",
          order: 3
        }
      ],
      customTabsContent: {}
    };
  }
});

// src/server/repository.ts
var repository_exports = {};
__export(repository_exports, {
  DEFAULT_SOAR_CATEGORIES: () => DEFAULT_SOAR_CATEGORIES,
  getLocalAuthStore: () => getLocalAuthStore,
  getLocalPortalStore: () => getLocalPortalStore,
  hashPassword: () => hashPassword,
  repository: () => repository,
  saveLocalAuthStore: () => saveLocalAuthStore,
  saveLocalPortalStore: () => saveLocalPortalStore
});
function hashPassword(password, salt) {
  return import_crypto.default.pbkdf2Sync(password, salt, 1e5, 64, "sha512").toString("hex");
}
function getLocalAuthStore() {
  if (import_fs2.default.existsSync(AUTH_FILE)) {
    try {
      const parsed = JSON.parse(import_fs2.default.readFileSync(AUTH_FILE, "utf-8"));
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
    }
  }
  const fallback = JSON.parse(JSON.stringify(auth_data_default));
  try {
    import_fs2.default.writeFileSync(AUTH_FILE, JSON.stringify(fallback, null, 2), "utf-8");
  } catch {
  }
  return fallback;
}
function saveLocalAuthStore(store) {
  try {
    import_fs2.default.writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Repository] Could not write local auth file (expected in serverless):", err.message);
  }
}
function getLocalPortalStore() {
  if (import_fs2.default.existsSync(PORTAL_FILE)) {
    try {
      const parsed = JSON.parse(import_fs2.default.readFileSync(PORTAL_FILE, "utf-8"));
      if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        if (!parsed.categories || parsed.categories.length === 0) {
          parsed.categories = DEFAULT_SOAR_CATEGORIES;
        }
        if (!parsed.settings?.activePhase) {
          parsed.settings = parsed.settings || {};
          parsed.settings.activePhase = "pre-final";
        }
        return parsed;
      }
    } catch {
    }
  }
  const fallback = JSON.parse(JSON.stringify(portal_data_default));
  try {
    import_fs2.default.writeFileSync(PORTAL_FILE, JSON.stringify(fallback, null, 2), "utf-8");
  } catch {
  }
  return fallback;
}
function saveLocalPortalStore(store) {
  try {
    import_fs2.default.writeFileSync(PORTAL_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Repository] Could not write local portal file (expected in serverless):", err.message);
  }
}
var import_fs2, import_path2, import_crypto, import_url2, import_meta2, __filename2, __dirname2, ROOT_DIR, DATA_DIR, AUTH_FILE, PORTAL_FILE, sessionMemoryCache, DEFAULT_SOAR_CATEGORIES, PortalRepository, repository;
var init_repository = __esm({
  "src/server/repository.ts"() {
    import_fs2 = __toESM(require("fs"), 1);
    import_path2 = __toESM(require("path"), 1);
    import_crypto = __toESM(require("crypto"), 1);
    import_url2 = require("url");
    init_firebase_admin();
    init_auth_data();
    init_portal_data();
    import_meta2 = {};
    __filename2 = (0, import_url2.fileURLToPath)(import_meta2.url);
    __dirname2 = import_path2.default.dirname(__filename2);
    ROOT_DIR = process.cwd();
    DATA_DIR = import_path2.default.resolve(ROOT_DIR, "data");
    AUTH_FILE = import_path2.default.join(DATA_DIR, "auth_data.json");
    PORTAL_FILE = import_path2.default.join(DATA_DIR, "portal_data.json");
    if (!import_fs2.default.existsSync(DATA_DIR)) {
      try {
        import_fs2.default.mkdirSync(DATA_DIR, { recursive: true });
      } catch {
      }
    }
    sessionMemoryCache = /* @__PURE__ */ new Map();
    DEFAULT_SOAR_CATEGORIES = [
      { id: "symphonic-duo", name: "Symphonic Duo", shortCode: "SD", description: "Kategori Muzik & Vokal Dua Alat", order: 1, visible: true },
      { id: "islamic-theatre", name: "Islamic Theatre", shortCode: "IT", description: "Teater & Lakonan Islamik Tematik", order: 2, visible: true },
      { id: "battle-of-the-bands", name: "Battle of the Bands", shortCode: "BOB", description: "Pertandingan Kugiran & Muzik Kombo", order: 3, visible: true },
      { id: "tarian-zapin", name: "Tarian Zapin", shortCode: "TZ", description: "Tarian Tradisional Melayu Zapin", order: 4, visible: true },
      { id: "street-dakwah", name: "Street Dakwah", shortCode: "SDW", description: "Pidato & Pengucapan Awam Dakwah Terbuka", order: 5, visible: true },
      { id: "majlis-penutupan", name: "Majlis Penutupan SOAR", shortCode: "MPS", description: "Raptai, Perarakan & Majlis Penutup Rasmi", order: 6, visible: true },
      { id: "penginapan", name: "Penginapan Kontinjen", shortCode: "LOG", description: "Kolej Kediaman, Bilik & Kebajikan Kontinjen", order: 7, visible: true },
      { id: "pengangkutan", name: "Pengangkutan & Bas", shortCode: "TRN", description: "Jadual Pergerakan Bas & Perjalanan", order: 8, visible: true },
      { id: "general", name: "Urus Setia / Hebahan Am", shortCode: "GEN", description: "Makluman Rasmi Urus Setia Kontinjen KPMBP", order: 9, visible: true }
    ];
    PortalRepository = class {
      async isFirestoreAvailable() {
        try {
          const status = await checkFirebaseAdminStatus();
          return Boolean(status.connectionHealthy);
        } catch {
          return false;
        }
      }
      // ---------------- AUTH STORE & SESSIONS ----------------
      async getAuthStore() {
        try {
          const db = getAdminDb();
          if (db && await this.isFirestoreAvailable()) {
            try {
              const configDoc = await db.collection("auth").doc("config").get();
              if (configDoc.exists) {
                const data = configDoc.data();
                return {
                  isSetup: Boolean(data.isSetup),
                  adminEmail: data.adminEmail || "khaikerr@gmail.com",
                  adminPasswordHash: data.adminPasswordHash || "",
                  adminPasswordSalt: data.adminPasswordSalt || "",
                  teamPasscode: data.teamPasscode || "KPMBP2026",
                  sessions: {}
                };
              }
            } catch (err) {
              console.warn("[Repository] Firestore getAuthStore failed, falling back to local file:", err.message);
            }
          }
        } catch (err) {
          console.warn("[Repository] Firestore check failed in getAuthStore:", err.message);
        }
        return getLocalAuthStore();
      }
      async saveAuthConfig(config) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("auth").doc("config").set({
              isSetup: config.isSetup,
              adminEmail: config.adminEmail,
              adminPasswordHash: config.adminPasswordHash,
              adminPasswordSalt: config.adminPasswordSalt,
              teamPasscode: config.teamPasscode,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
            return;
          } catch (err) {
            console.warn("[Repository] Firestore saveAuthConfig failed, falling back:", err.message);
          }
        }
        const local = getLocalAuthStore();
        const updated = { ...local, ...config, sessions: local.sessions };
        saveLocalAuthStore(updated);
      }
      async getSession(token) {
        if (!token) return null;
        const cached = sessionMemoryCache.get(token);
        if (cached) {
          if (Date.now() > cached.expiresAt) {
            sessionMemoryCache.delete(token);
            return null;
          }
          return cached;
        }
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            const tokenHash = import_crypto.default.createHash("sha256").update(token).digest("hex");
            const sessionDoc = await db.collection("sessions").doc(tokenHash).get();
            if (sessionDoc.exists) {
              const data = sessionDoc.data();
              if (Date.now() > data.expiresAt) {
                await db.collection("sessions").doc(tokenHash).delete();
                return null;
              }
              const session2 = {
                role: data.role,
                email: data.email,
                expiresAt: data.expiresAt
              };
              sessionMemoryCache.set(token, session2);
              return session2;
            }
            return null;
          } catch (err) {
            console.warn("[Repository] Firestore getSession failed, falling back:", err.message);
          }
        }
        const local = getLocalAuthStore();
        const session = local.sessions[token];
        if (session) {
          if (Date.now() > session.expiresAt) {
            delete local.sessions[token];
            saveLocalAuthStore(local);
            return null;
          }
          sessionMemoryCache.set(token, session);
          return session;
        }
        return null;
      }
      async createSession(token, session) {
        sessionMemoryCache.set(token, session);
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            const tokenHash = import_crypto.default.createHash("sha256").update(token).digest("hex");
            await db.collection("sessions").doc(tokenHash).set({
              role: session.role,
              email: session.email || null,
              expiresAt: session.expiresAt,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
            return;
          } catch (err) {
            console.warn("[Repository] Firestore createSession failed, falling back:", err.message);
          }
        }
        const local = getLocalAuthStore();
        local.sessions[token] = session;
        saveLocalAuthStore(local);
      }
      async deleteSession(token) {
        sessionMemoryCache.delete(token);
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            const tokenHash = import_crypto.default.createHash("sha256").update(token).digest("hex");
            await db.collection("sessions").doc(tokenHash).delete();
            return;
          } catch (err) {
            console.warn("[Repository] Firestore deleteSession failed:", err.message);
          }
        }
        const local = getLocalAuthStore();
        if (local.sessions[token]) {
          delete local.sessions[token];
          saveLocalAuthStore(local);
        }
      }
      // ---------------- PORTAL DATA (PUBLIC & ADMIN) ----------------
      async getPortalData(isAdmin = false) {
        try {
          const db = getAdminDb();
          if (db && await this.isFirestoreAvailable()) {
            try {
              const [settingsDoc, tabsSnap, categoriesDoc, customTabsDoc] = await Promise.all([
                db.collection("portal").doc("settings").get(),
                db.collection("tabs").orderBy("order", "asc").get(),
                db.collection("portal").doc("categories").get(),
                db.collection("portal").doc("customTabs").get()
              ]);
              let announcementsQuery = db.collection("announcements");
              let schedulesQuery = db.collection("schedules");
              let documentsQuery = db.collection("documents");
              let eventSectionsQuery = db.collection("eventSections");
              let locationsQuery = db.collection("locations");
              const [announcementsSnap, schedulesSnap, documentsSnap, eventSectionsSnap, locationsSnap] = await Promise.all([
                announcementsQuery.get(),
                schedulesQuery.get(),
                documentsQuery.get(),
                eventSectionsQuery.get(),
                locationsQuery.get()
              ]);
              let announcements = announcementsSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
              let schedules = schedulesSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
              let documents = documentsSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
              let eventSections = eventSectionsSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
              let locations = locationsSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
              schedules.sort((a, b) => (a.order || 0) - (b.order || 0));
              documents.sort((a, b) => (a.order || 0) - (b.order || 0));
              eventSections.sort((a, b) => (a.order || 0) - (b.order || 0));
              locations.sort((a, b) => (a.order || 0) - (b.order || 0));
              if (!isAdmin) {
                announcements = announcements.filter((a) => a.status !== "draft");
                schedules = schedules.filter((s) => s.status !== "draft");
                documents = documents.filter((d) => d.status !== "draft");
                eventSections = eventSections.filter((e) => e.status !== "draft");
                locations = locations.filter((l) => l.status !== "draft");
              }
              const settings = settingsDoc.exists ? settingsDoc.data() : getLocalPortalStore().settings;
              const tabs = tabsSnap.docs.length > 0 ? tabsSnap.docs.map((d) => ({ ...d.data(), id: d.id })) : getLocalPortalStore().tabs;
              const categories = categoriesDoc.exists && categoriesDoc.data()?.items ? categoriesDoc.data()?.items : getLocalPortalStore().categories;
              const customTabsContent = customTabsDoc.exists ? customTabsDoc.data() : {};
              return {
                tabs,
                settings,
                categories,
                announcements,
                schedules,
                documents,
                eventSections,
                locations,
                customTabsContent
              };
            } catch (err) {
              console.warn("[Repository] Firestore getPortalData failed, using local file:", err.message);
            }
          }
        } catch (outerErr) {
          console.warn("[Repository] Firestore connection check error in getPortalData:", outerErr.message);
        }
        const local = getLocalPortalStore();
        if (isAdmin) return local;
        return {
          ...local,
          announcements: local.announcements.filter((a) => a.status !== "draft"),
          schedules: local.schedules.filter((s) => s.status !== "draft"),
          documents: local.documents.filter((d) => d.status !== "draft"),
          eventSections: local.eventSections.filter((e) => e.status !== "draft"),
          locations: local.locations.filter((l) => l.status !== "draft")
        };
      }
      // ---------------- SETTINGS & PHASE ----------------
      async updateSettings(settings) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("portal").doc("settings").set(settings, { merge: true });
            const updated = await db.collection("portal").doc("settings").get();
            return updated.data();
          } catch (err) {
            console.warn("[Repository] Firestore updateSettings failed, falling back:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.settings = { ...local.settings, ...settings };
        saveLocalPortalStore(local);
        return local.settings;
      }
      async updateActivePhase(phase) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("portal").doc("settings").set({ activePhase: phase }, { merge: true });
            return { activePhase: phase };
          } catch (err) {
            console.warn("[Repository] Firestore updateActivePhase failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.settings.activePhase = phase;
        saveLocalPortalStore(local);
        return { activePhase: phase };
      }
      // ---------------- CATEGORIES & TABS ----------------
      async updateCategories(categories) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("portal").doc("categories").set({ items: categories, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
            return categories;
          } catch (err) {
            console.warn("[Repository] Firestore updateCategories failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.categories = categories;
        saveLocalPortalStore(local);
        return local.categories;
      }
      async updateTabs(tabs) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            const batch = db.batch();
            for (const tab of tabs) {
              const ref = db.collection("tabs").doc(tab.id);
              batch.set(ref, tab, { merge: true });
            }
            await batch.commit();
            return tabs;
          } catch (err) {
            console.warn("[Repository] Firestore updateTabs failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.tabs = tabs;
        saveLocalPortalStore(local);
        return local.tabs;
      }
      // ---------------- ANNOUNCEMENTS ----------------
      async saveAnnouncement(item) {
        const id = item.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fullItem = {
          id,
          title: item.title || "Hebahan SOAR 2026",
          content: item.content || "",
          priority: item.priority || "general",
          isPinned: Boolean(item.isPinned),
          category: item.category || "general",
          phase: item.phase || "all",
          status: item.status || "published",
          author: item.author || "Urus Setia KPMBP",
          timestamp: item.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
          imageUrl: item.imageUrl || "",
          imageCaption: item.imageCaption || "",
          externalUrl: item.externalUrl || "",
          externalUrlLabel: item.externalUrlLabel || "",
          telegramRawText: item.telegramRawText || "",
          tags: Array.isArray(item.tags) ? item.tags : [],
          isSuperseded: Boolean(item.isSuperseded),
          supersededReason: item.supersededReason || "",
          collectionId: item.collectionId || "",
          collectionName: item.collectionName || "",
          collectionIndex: typeof item.collectionIndex === "number" ? item.collectionIndex : void 0,
          importantDates: item.importantDates || "",
          verificationRequired: Boolean(item.verificationRequired),
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("announcements").doc(id).set(fullItem, { merge: true });
            return fullItem;
          } catch (err) {
            console.warn("[Repository] Firestore saveAnnouncement failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        const index = local.announcements.findIndex((a) => a.id === id);
        if (index >= 0) {
          local.announcements[index] = fullItem;
        } else {
          local.announcements.unshift(fullItem);
        }
        saveLocalPortalStore(local);
        return fullItem;
      }
      async saveBatchAnnouncements(items) {
        const saved = [];
        for (const item of items) {
          saved.push(await this.saveAnnouncement(item));
        }
        return saved;
      }
      async supersedeAnnouncement(id, isSuperseded, supersededReason) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            const updateData = {
              isSuperseded: Boolean(isSuperseded),
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            };
            if (supersededReason !== void 0) {
              updateData.supersededReason = supersededReason;
            }
            await db.collection("announcements").doc(id).set(updateData, { merge: true });
            const doc = await db.collection("announcements").doc(id).get();
            return { ...doc.data(), id: doc.id };
          } catch (err) {
            console.warn("[Repository] Firestore supersedeAnnouncement failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        const index = local.announcements.findIndex((a) => a.id === id);
        if (index >= 0) {
          local.announcements[index].isSuperseded = Boolean(isSuperseded);
          if (supersededReason !== void 0) {
            local.announcements[index].supersededReason = supersededReason;
          }
          local.announcements[index].lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
          saveLocalPortalStore(local);
          return local.announcements[index];
        }
        throw new Error("Announcement not found");
      }
      async deleteAnnouncement(id) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("announcements").doc(id).delete();
            return;
          } catch (err) {
            console.warn("[Repository] Firestore deleteAnnouncement failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.announcements = local.announcements.filter((a) => a.id !== id);
        saveLocalPortalStore(local);
      }
      // ---------------- SCHEDULES ----------------
      async saveSchedule(item) {
        const id = item.id || `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fullItem = {
          id,
          categoryName: item.categoryName || "Kategori Acara",
          subcategory: item.subcategory || "",
          date: item.date || "",
          time: item.time || "",
          venue: item.venue || "",
          imageUrl: item.imageUrl || "",
          sourceDocUrl: item.sourceDocUrl || "",
          notes: item.notes || "",
          phase: item.phase || "all",
          status: item.status || "published",
          performanceOrder: item.performanceOrder || "",
          order: typeof item.order === "number" ? item.order : 1,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("schedules").doc(id).set(fullItem, { merge: true });
            return fullItem;
          } catch (err) {
            console.warn("[Repository] Firestore saveSchedule failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        const index = local.schedules.findIndex((s) => s.id === id);
        if (index >= 0) {
          local.schedules[index] = fullItem;
        } else {
          local.schedules.push(fullItem);
        }
        saveLocalPortalStore(local);
        return fullItem;
      }
      async deleteSchedule(id) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("schedules").doc(id).delete();
            return;
          } catch (err) {
            console.warn("[Repository] Firestore deleteSchedule failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.schedules = local.schedules.filter((s) => s.id !== id);
        saveLocalPortalStore(local);
      }
      // ---------------- DOCUMENTS ----------------
      async saveDocument(item) {
        const id = item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fullItem = {
          id,
          title: item.title || "Dokumen Rujukan",
          category: item.category || "general",
          description: item.description || "",
          fileUrl: item.fileUrl || "",
          fileType: item.fileType || "drive",
          phase: item.phase || "all",
          status: item.status || "published",
          order: typeof item.order === "number" ? item.order : 1,
          isPinned: Boolean(item.isPinned),
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("documents").doc(id).set(fullItem, { merge: true });
            return fullItem;
          } catch (err) {
            console.warn("[Repository] Firestore saveDocument failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        const index = local.documents.findIndex((d) => d.id === id);
        if (index >= 0) {
          local.documents[index] = fullItem;
        } else {
          local.documents.push(fullItem);
        }
        saveLocalPortalStore(local);
        return fullItem;
      }
      async deleteDocument(id) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("documents").doc(id).delete();
            return;
          } catch (err) {
            console.warn("[Repository] Firestore deleteDocument failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.documents = local.documents.filter((d) => d.id !== id);
        saveLocalPortalStore(local);
      }
      // ---------------- EVENT SECTIONS ----------------
      async saveEventSection(item) {
        const id = item.id || `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fullItem = {
          id,
          title: item.title || "Maklumat Acara",
          category: item.category || "general",
          type: item.type || "rundown",
          description: item.description || "",
          phase: item.phase || "all",
          status: item.status || "published",
          items: item.items || [],
          rawContent: item.rawContent || "",
          order: typeof item.order === "number" ? item.order : 1
        };
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("eventSections").doc(id).set(fullItem, { merge: true });
            return fullItem;
          } catch (err) {
            console.warn("[Repository] Firestore saveEventSection failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        const index = local.eventSections.findIndex((e) => e.id === id);
        if (index >= 0) {
          local.eventSections[index] = fullItem;
        } else {
          local.eventSections.push(fullItem);
        }
        saveLocalPortalStore(local);
        return fullItem;
      }
      async deleteEventSection(id) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("eventSections").doc(id).delete();
            return;
          } catch (err) {
            console.warn("[Repository] Firestore deleteEventSection failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.eventSections = local.eventSections.filter((e) => e.id !== id);
        saveLocalPortalStore(local);
      }
      // ---------------- LOCATIONS ----------------
      async saveLocation(item) {
        const id = item.id || `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fullItem = {
          id,
          name: item.name || "Lokasi / Pergerakan",
          category: item.category || "venue",
          address: item.address || "",
          mapUrl: item.mapUrl || "",
          coordinates: item.coordinates || "",
          scheduleTimes: item.scheduleTimes || "",
          routeDetails: item.routeDetails || "",
          notes: item.notes || "",
          floorplanUrl: item.floorplanUrl || "",
          contactPerson: item.contactPerson || "",
          contactPhone: item.contactPhone || "",
          phase: item.phase || "all",
          status: item.status || "published",
          order: typeof item.order === "number" ? item.order : 1
        };
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("locations").doc(id).set(fullItem, { merge: true });
            return fullItem;
          } catch (err) {
            console.warn("[Repository] Firestore saveLocation failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        const index = local.locations.findIndex((l) => l.id === id);
        if (index >= 0) {
          local.locations[index] = fullItem;
        } else {
          local.locations.push(fullItem);
        }
        saveLocalPortalStore(local);
        return fullItem;
      }
      async deleteLocation(id) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("locations").doc(id).delete();
            return;
          } catch (err) {
            console.warn("[Repository] Firestore deleteLocation failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.locations = local.locations.filter((l) => l.id !== id);
        saveLocalPortalStore(local);
      }
      // ---------------- CUSTOM TABS CONTENT ----------------
      async updateCustomTab(tabId, content) {
        const db = getAdminDb();
        if (db && await this.isFirestoreAvailable()) {
          try {
            await db.collection("portal").doc("customTabs").set({ [tabId]: content }, { merge: true });
            return;
          } catch (err) {
            console.warn("[Repository] Firestore updateCustomTab failed:", err.message);
          }
        }
        const local = getLocalPortalStore();
        local.customTabsContent[tabId] = content;
        saveLocalPortalStore(local);
      }
    };
    repository = new PortalRepository();
  }
});

// api/index.ts
var index_exports = {};
__export(index_exports, {
  app: () => app_default,
  default: () => handler
});
module.exports = __toCommonJS(index_exports);

// src/server/app.ts
var import_express = __toESM(require("express"), 1);
var import_fs4 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var import_url4 = require("url");
var import_genai = require("@google/genai");
init_repository();
init_firebase_admin();

// src/server/migration.ts
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_url3 = require("url");
init_firebase_admin();
init_repository();
var import_meta3 = {};
var __filename3 = (0, import_url3.fileURLToPath)(import_meta3.url);
var __dirname3 = import_path3.default.dirname(__filename3);
var ROOT_DIR2 = import_path3.default.resolve(__dirname3, "../../");
var DATA_DIR2 = import_path3.default.resolve(ROOT_DIR2, "data");
var UPLOADS_DIR = import_path3.default.resolve(DATA_DIR2, "uploads");
var PUBLIC_UPLOADS_DIR = import_path3.default.resolve(ROOT_DIR2, "public", "uploads");
function validateSourceData(portalStore, authStore) {
  const errors = [];
  if (!portalStore.settings || !portalStore.settings.eventTitle) {
    errors.push("PortalStore settings missing or invalid.");
  }
  if (!Array.isArray(portalStore.tabs) || portalStore.tabs.length === 0) {
    errors.push("PortalStore navigation tabs missing or empty.");
  }
  if (!Array.isArray(portalStore.announcements)) {
    errors.push("PortalStore announcements array invalid.");
  }
  if (!Array.isArray(portalStore.schedules)) {
    errors.push("PortalStore schedules array invalid.");
  }
  if (!Array.isArray(portalStore.documents)) {
    errors.push("PortalStore documents array invalid.");
  }
  if (!Array.isArray(portalStore.locations)) {
    errors.push("PortalStore locations array invalid.");
  }
  if (!Array.isArray(portalStore.eventSections)) {
    errors.push("PortalStore eventSections array invalid.");
  }
  return { isValid: errors.length === 0, errors };
}
async function executeDataMigration(options = {}) {
  const dryRun = Boolean(options.dryRun);
  const forceOverwrite = Boolean(options.forceOverwrite);
  const report = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: "aborted",
    dryRun,
    canConnectToFirestore: false,
    canConnectToStorage: false,
    details: {
      settings: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      tabs: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      categories: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      announcements: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      schedules: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      documents: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      eventSections: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      locations: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      customTabs: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      authConfig: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      sessions: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      uploads: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 }
    },
    reconciliation: {
      totalSourceEntities: 0,
      totalTargetCreated: 0,
      totalTargetSkipped: 0,
      totalFailures: 0,
      isFullyReconciled: false
    },
    errors: [],
    warnings: [],
    message: ""
  };
  const adminStatus = await checkFirebaseAdminStatus();
  report.canConnectToFirestore = adminStatus.connectionHealthy;
  const db = getAdminDb();
  if (!db || !adminStatus.connectionHealthy) {
    report.errors.push(
      `Sambungan Firestore belum disahkan: ${adminStatus.error || "Kredensial Firebase Admin tiada"}`
    );
    report.message = "Migrasi dihentikan: Tidak dapat menulis ke Firestore. Sila tetapkan FIREBASE_SERVICE_ACCOUNT dalam environment variables Vercel.";
    return report;
  }
  const portalStore = getLocalPortalStore();
  const authStore = getLocalAuthStore();
  const validation = validateSourceData(portalStore, authStore);
  if (!validation.isValid) {
    report.errors.push(...validation.errors);
    report.message = "Source data validation failed. Aborting migration to protect destination integrity.";
    return report;
  }
  report.reconciliation.totalSourceEntities = 1 + // settings
  portalStore.tabs.length + (portalStore.categories?.length || DEFAULT_SOAR_CATEGORIES.length) + portalStore.announcements.length + portalStore.schedules.length + portalStore.documents.length + portalStore.eventSections.length + portalStore.locations.length + Object.keys(portalStore.customTabsContent || {}).length + 1 + // authConfig
  Object.keys(authStore.sessions || {}).length;
  try {
    report.details.settings.read = 1;
    const settingsRef = db.collection("portal").doc("settings");
    const existingSettings = await settingsRef.get();
    if (!existingSettings.exists || forceOverwrite) {
      if (!dryRun) await settingsRef.set({ ...portalStore.settings, migratedAt: (/* @__PURE__ */ new Date()).toISOString() });
      report.details.settings.migrated = 1;
    } else {
      report.details.settings.skippedExisting = 1;
    }
    const categoriesRef = db.collection("portal").doc("categories");
    const categoriesToMigrate = portalStore.categories && portalStore.categories.length > 0 ? portalStore.categories : DEFAULT_SOAR_CATEGORIES;
    report.details.categories.read = categoriesToMigrate.length;
    const existingCategories = await categoriesRef.get();
    if (!existingCategories.exists || forceOverwrite) {
      if (!dryRun) await categoriesRef.set({ items: categoriesToMigrate, migratedAt: (/* @__PURE__ */ new Date()).toISOString() });
      report.details.categories.migrated = categoriesToMigrate.length;
    } else {
      report.details.categories.skippedExisting = categoriesToMigrate.length;
    }
    report.details.tabs.read = portalStore.tabs.length;
    for (const tab of portalStore.tabs) {
      const tabRef = db.collection("tabs").doc(tab.id);
      const existingTab = await tabRef.get();
      if (!existingTab.exists || forceOverwrite) {
        if (!dryRun) await tabRef.set(tab);
        report.details.tabs.migrated++;
      } else {
        report.details.tabs.skippedExisting++;
      }
    }
    report.details.announcements.read = portalStore.announcements.length;
    for (const ann of portalStore.announcements) {
      const annRef = db.collection("announcements").doc(ann.id);
      const existingAnn = await annRef.get();
      if (!existingAnn.exists || forceOverwrite) {
        if (!dryRun) await annRef.set(ann);
        report.details.announcements.migrated++;
      } else {
        report.details.announcements.skippedExisting++;
      }
    }
    report.details.schedules.read = portalStore.schedules.length;
    for (const sch of portalStore.schedules) {
      const schRef = db.collection("schedules").doc(sch.id);
      const existingSch = await schRef.get();
      if (!existingSch.exists || forceOverwrite) {
        if (!dryRun) await schRef.set(sch);
        report.details.schedules.migrated++;
      } else {
        report.details.schedules.skippedExisting++;
      }
    }
    report.details.documents.read = portalStore.documents.length;
    for (const docItem of portalStore.documents) {
      const docRef = db.collection("documents").doc(docItem.id);
      const existingDoc = await docRef.get();
      if (!existingDoc.exists || forceOverwrite) {
        if (!dryRun) await docRef.set(docItem);
        report.details.documents.migrated++;
      } else {
        report.details.documents.skippedExisting++;
      }
    }
    report.details.eventSections.read = portalStore.eventSections.length;
    for (const sec of portalStore.eventSections) {
      const secRef = db.collection("eventSections").doc(sec.id);
      const existingSec = await secRef.get();
      if (!existingSec.exists || forceOverwrite) {
        if (!dryRun) await secRef.set(sec);
        report.details.eventSections.migrated++;
      } else {
        report.details.eventSections.skippedExisting++;
      }
    }
    report.details.locations.read = portalStore.locations.length;
    for (const loc of portalStore.locations) {
      const locRef = db.collection("locations").doc(loc.id);
      const existingLoc = await locRef.get();
      if (!existingLoc.exists || forceOverwrite) {
        if (!dryRun) await locRef.set(loc);
        report.details.locations.migrated++;
      } else {
        report.details.locations.skippedExisting++;
      }
    }
    const customTabsEntries = Object.entries(portalStore.customTabsContent || {});
    report.details.customTabs.read = customTabsEntries.length;
    if (customTabsEntries.length > 0) {
      const customTabsRef = db.collection("portal").doc("customTabs");
      const existingCustom = await customTabsRef.get();
      if (!existingCustom.exists || forceOverwrite) {
        if (!dryRun) await customTabsRef.set(portalStore.customTabsContent || {});
        report.details.customTabs.migrated = customTabsEntries.length;
      } else {
        report.details.customTabs.skippedExisting = customTabsEntries.length;
      }
    }
    report.details.authConfig.read = 1;
    const authConfigRef = db.collection("auth").doc("config");
    const existingAuthConfig = await authConfigRef.get();
    if (!existingAuthConfig.exists || forceOverwrite) {
      if (!dryRun) {
        await authConfigRef.set({
          isSetup: authStore.isSetup,
          adminEmail: authStore.adminEmail,
          adminPasswordHash: authStore.adminPasswordHash,
          adminPasswordSalt: authStore.adminPasswordSalt,
          teamPasscode: authStore.teamPasscode,
          migratedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      report.details.authConfig.migrated = 1;
    } else {
      report.details.authConfig.skippedExisting = 1;
    }
    const sessionEntries = Object.entries(authStore.sessions || {});
    report.details.sessions.read = sessionEntries.length;
    for (const [token, session] of sessionEntries) {
      if (session.expiresAt && session.expiresAt > Date.now()) {
        const tokenHash = require("crypto").createHash("sha256").update(token).digest("hex");
        const sessionRef = db.collection("sessions").doc(tokenHash);
        const existingSession = await sessionRef.get();
        if (!existingSession.exists || forceOverwrite) {
          if (!dryRun) {
            await sessionRef.set({
              role: session.role,
              email: session.email || null,
              expiresAt: session.expiresAt,
              migratedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          report.details.sessions.migrated++;
        } else {
          report.details.sessions.skippedExisting++;
        }
      } else {
        report.details.sessions.skippedExisting++;
      }
    }
    const bucket = getStorageBucket();
    if (bucket) {
      report.canConnectToStorage = true;
      const uploadFiles = [
        "soar_jadual_pertandingan.svg",
        "soar_pendaftaran_peserta.svg",
        "soar_penginapan_panduan.svg"
      ];
      report.details.uploads.read = uploadFiles.length;
      for (const fileName of uploadFiles) {
        const localPath = import_fs3.default.existsSync(import_path3.default.join(PUBLIC_UPLOADS_DIR, fileName)) ? import_path3.default.join(PUBLIC_UPLOADS_DIR, fileName) : import_path3.default.join(UPLOADS_DIR, fileName);
        if (import_fs3.default.existsSync(localPath)) {
          try {
            const destinationFile = bucket.file(`uploads/${fileName}`);
            const [exists] = await destinationFile.exists();
            if (!exists || forceOverwrite) {
              if (!dryRun) {
                await bucket.upload(localPath, {
                  destination: `uploads/${fileName}`,
                  metadata: {
                    contentType: "image/svg+xml",
                    cacheControl: "public, max-age=86400"
                  }
                });
              }
              report.details.uploads.migrated++;
            } else {
              report.details.uploads.skippedExisting++;
            }
          } catch (uploadErr) {
            report.warnings.push(`Storage upload warning for ${fileName}: ${uploadErr.message}`);
            report.details.uploads.failed++;
          }
        }
      }
    } else {
      report.warnings.push("Firebase Storage bucket not directly accessible. Local static files in public/uploads/ remain available via CDN.");
    }
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    for (const key of Object.keys(report.details)) {
      totalMigrated += report.details[key].migrated;
      totalSkipped += report.details[key].skippedExisting;
      totalFailed += report.details[key].failed;
    }
    report.reconciliation.totalTargetCreated = totalMigrated;
    report.reconciliation.totalTargetSkipped = totalSkipped;
    report.reconciliation.totalFailures = totalFailed;
    report.reconciliation.isFullyReconciled = totalFailed === 0;
    report.status = dryRun ? "dry_run_success" : "completed";
    report.message = dryRun ? `Dry run successful: ${totalMigrated} records to create, ${totalSkipped} existing records detected.` : `Migration completed: ${totalMigrated} records written, ${totalSkipped} reconciled existing records, 0 data loss.`;
    return report;
  } catch (err) {
    report.status = "aborted";
    report.errors.push(err.message || "Unknown error during migration");
    report.message = `Migration aborted due to error: ${err.message}`;
    return report;
  }
}

// src/server/app.ts
var import_meta4 = {};
var __filename4 = (0, import_url4.fileURLToPath)(import_meta4.url);
var __dirname4 = import_path4.default.dirname(__filename4);
var ROOT_DIR3 = import_path4.default.resolve(__dirname4, "../../");
var DATA_DIR3 = import_path4.default.resolve(ROOT_DIR3, "data");
var UPLOADS_DIR2 = import_path4.default.resolve(DATA_DIR3, "uploads");
var PUBLIC_UPLOADS_DIR2 = import_path4.default.resolve(ROOT_DIR3, "public", "uploads");
var geminiApiKey = process.env.GEMINI_API_KEY;
var ai = geminiApiKey ? new import_genai.GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
}) : null;
if (!import_fs4.default.existsSync(DATA_DIR3)) {
  try {
    import_fs4.default.mkdirSync(DATA_DIR3, { recursive: true });
  } catch {
  }
}
if (!import_fs4.default.existsSync(UPLOADS_DIR2)) {
  try {
    import_fs4.default.mkdirSync(UPLOADS_DIR2, { recursive: true });
  } catch {
  }
}
if (!import_fs4.default.existsSync(PUBLIC_UPLOADS_DIR2)) {
  try {
    import_fs4.default.mkdirSync(PUBLIC_UPLOADS_DIR2, { recursive: true });
  } catch {
  }
}
function createApp() {
  const app2 = (0, import_express.default)();
  app2.use(import_express.default.json({ limit: "25mb" }));
  app2.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
  app2.use((req, _res, next) => {
    const pathParam = req.query?.path || req.params?.path;
    if (pathParam) {
      const subpath = Array.isArray(pathParam) ? pathParam.join("/") : String(pathParam);
      req.url = `/api/${subpath}`;
      return next();
    }
    const orig = req.originalUrl;
    if (orig && (req.url === "/api" || req.url === "/api/") && orig !== req.url && orig.startsWith("/api/")) {
      req.url = orig;
      return next();
    }
    if (req.url.startsWith("/api/index.ts")) {
      req.url = req.url.replace("/api/index.ts", "/api");
    } else if (req.url.startsWith("/api/index")) {
      req.url = req.url.replace("/api/index", "/api");
    }
    const knownApiPrefixes = [
      "/auth/",
      "/portal/",
      "/announcements",
      "/schedules",
      "/documents",
      "/events",
      "/locations",
      "/ai/",
      "/admin/",
      "/health"
    ];
    const isKnownApi = knownApiPrefixes.some((prefix) => req.url.startsWith(prefix));
    if (isKnownApi) {
      req.url = "/api" + req.url;
    }
    next();
  });
  app2.get("/api", (_req, res) => {
    res.json({
      status: "ok",
      service: "KPMBP Contingent SOAR Portal API",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "KPMBP Contingent SOAR Portal API",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  async function getSessionFromReq(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7).trim();
    if (!token) return null;
    const session = await repository.getSession(token);
    return session;
  }
  async function requireAuth(req, res, next) {
    const session = await getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: "Access restricted. Please authenticate to view this portal." });
      return;
    }
    req.user = session;
    next();
  }
  async function requireAdmin(req, res, next) {
    const session = await getSessionFromReq(req);
    if (!session || session.role !== "admin") {
      res.status(403).json({ error: "Unauthorized. Administrator privileges required." });
      return;
    }
    req.user = session;
    next();
  }
  if (import_fs4.default.existsSync(PUBLIC_UPLOADS_DIR2)) {
    app2.use("/uploads", import_express.default.static(PUBLIC_UPLOADS_DIR2, { maxAge: "1d" }));
  }
  if (import_fs4.default.existsSync(UPLOADS_DIR2)) {
    app2.use("/uploads", import_express.default.static(UPLOADS_DIR2, { maxAge: "1d" }));
  }
  app2.get("/api/uploads/:filename", (req, res) => {
    const filename = import_path4.default.basename(req.params.filename);
    const publicPath = import_path4.default.join(PUBLIC_UPLOADS_DIR2, filename);
    const dataPath = import_path4.default.join(UPLOADS_DIR2, filename);
    if (import_fs4.default.existsSync(publicPath)) {
      res.sendFile(publicPath);
      return;
    }
    if (import_fs4.default.existsSync(dataPath)) {
      res.sendFile(dataPath);
      return;
    }
    res.status(404).json({ error: "File not found." });
  });
  app2.get("/api/auth/status", async (req, res) => {
    try {
      const authStore = await repository.getAuthStore();
      const session = await getSessionFromReq(req);
      res.json({
        isSetup: authStore?.isSetup ?? true,
        adminEmail: authStore?.adminEmail || "khaikerr@gmail.com",
        isAuthenticated: !!session,
        role: session ? session.role : null,
        email: session ? session.email : void 0
      });
    } catch (err) {
      console.error("Error in /api/auth/status:", err);
      res.json({
        isSetup: true,
        adminEmail: "khaikerr@gmail.com",
        isAuthenticated: false,
        role: null
      });
    }
  });
  app2.post("/api/auth/setup", async (req, res) => {
    try {
      const authStore = await repository.getAuthStore();
      if (authStore.isSetup) {
        res.status(400).json({ error: "System is already initialized." });
        return;
      }
      const { adminPassword, teamPasscode } = req.body;
      if (!adminPassword || adminPassword.length < 6) {
        res.status(400).json({ error: "Administrator password must be at least 6 characters." });
        return;
      }
      const salt = import_crypto2.default.randomBytes(16).toString("hex");
      const passwordHash = hashPassword(adminPassword, salt);
      const passcode = teamPasscode ? teamPasscode.trim() : "KPMBP2026";
      await repository.saveAuthConfig({
        adminPasswordSalt: salt,
        adminPasswordHash: passwordHash,
        teamPasscode: passcode,
        isSetup: true
      });
      const token = import_crypto2.default.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 1e3 * 60 * 60 * 24 * 7;
      await repository.createSession(token, {
        role: "admin",
        email: authStore.adminEmail,
        expiresAt
      });
      res.json({
        success: true,
        token,
        role: "admin",
        email: authStore.adminEmail
      });
    } catch (err) {
      console.error("Error in /api/auth/setup:", err);
      res.status(500).json({ error: "Failed to complete initial setup." });
    }
  });
  app2.post("/api/auth/admin-login", async (req, res) => {
    try {
      const { password, email } = req.body;
      const authStore = await repository.getAuthStore();
      if (!authStore.isSetup) {
        res.status(400).json({ error: "System is not initialized. Please complete initial setup." });
        return;
      }
      if (email && email.toLowerCase().trim() !== authStore.adminEmail.toLowerCase().trim()) {
        res.status(401).json({ error: "Invalid administrator email address." });
        return;
      }
      const incomingHash = hashPassword(password || "", authStore.adminPasswordSalt);
      if (incomingHash !== authStore.adminPasswordHash) {
        res.status(401).json({ error: "Incorrect administrator password." });
        return;
      }
      const token = import_crypto2.default.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 1e3 * 60 * 60 * 24 * 7;
      await repository.createSession(token, {
        role: "admin",
        email: authStore.adminEmail,
        expiresAt
      });
      res.json({
        token,
        role: "admin",
        email: authStore.adminEmail
      });
    } catch (err) {
      console.error("Error in /api/auth/admin-login:", err);
      res.status(500).json({ error: "Login authentication error." });
    }
  });
  app2.post("/api/auth/firebase-login", async (req, res) => {
    try {
      const { email } = req.body;
      const authStore = await repository.getAuthStore();
      const normalizedEmail = (email || "").toLowerCase().trim();
      const allowedAdminEmails = [
        authStore.adminEmail.toLowerCase().trim(),
        "khaikerr@gmail.com",
        "kpmbppsn@gmail.com"
      ];
      if (!normalizedEmail || !allowedAdminEmails.includes(normalizedEmail)) {
        res.status(401).json({ error: "This account is not authorized as an administrator for Competition Hub KPMBP." });
        return;
      }
      if (!authStore.isSetup) {
        await repository.saveAuthConfig({ isSetup: true });
      }
      const token = import_crypto2.default.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 1e3 * 60 * 60 * 24 * 7;
      await repository.createSession(token, {
        role: "admin",
        email: normalizedEmail,
        expiresAt
      });
      res.json({
        token,
        role: "admin",
        email: normalizedEmail
      });
    } catch (err) {
      console.error("Error in /api/auth/firebase-login:", err);
      res.status(500).json({ error: "Failed to process Google sign-in." });
    }
  });
  app2.post("/api/auth/team-login", async (req, res) => {
    try {
      const { passcode } = req.body;
      const authStore = await repository.getAuthStore();
      if (!authStore.isSetup) {
        res.status(400).json({ error: "Portal is not configured yet." });
        return;
      }
      if (!passcode || passcode.trim().toUpperCase() !== authStore.teamPasscode.toUpperCase()) {
        res.status(401).json({ error: "Invalid team passcode. Please check with your team coordinator." });
        return;
      }
      const token = import_crypto2.default.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 1e3 * 60 * 60 * 24 * 7;
      await repository.createSession(token, {
        role: "team",
        expiresAt
      });
      res.json({
        token,
        role: "team"
      });
    } catch (err) {
      console.error("Error in /api/auth/team-login:", err);
      res.status(500).json({ error: "Failed to verify team passcode." });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        await repository.deleteSession(token);
      }
      res.json({ success: true });
    } catch (err) {
      res.json({ success: true });
    }
  });
  app2.post("/api/auth/update-credentials", requireAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword, teamPasscode } = req.body;
      const authStore = await repository.getAuthStore();
      const updates = {};
      if (newPassword) {
        if (!currentPassword) {
          res.status(400).json({ error: "Current password is required to change administrator password." });
          return;
        }
        const currentHash = hashPassword(currentPassword, authStore.adminPasswordSalt);
        if (currentHash !== authStore.adminPasswordHash) {
          res.status(401).json({ error: "Current administrator password is incorrect." });
          return;
        }
        if (newPassword.length < 6) {
          res.status(400).json({ error: "New password must be at least 6 characters long." });
          return;
        }
        const salt = import_crypto2.default.randomBytes(16).toString("hex");
        updates.adminPasswordSalt = salt;
        updates.adminPasswordHash = hashPassword(newPassword, salt);
      }
      if (teamPasscode && typeof teamPasscode === "string") {
        if (teamPasscode.trim().length < 3) {
          res.status(400).json({ error: "Team access passcode must be at least 3 characters long." });
          return;
        }
        updates.teamPasscode = teamPasscode.trim();
      }
      await repository.saveAuthConfig(updates);
      res.json({ success: true, message: "Security credentials updated successfully." });
    } catch (err) {
      console.error("Error in update-credentials:", err);
      res.status(500).json({ error: "Failed to update credentials." });
    }
  });
  app2.post("/api/upload", requireAdmin, async (req, res) => {
    try {
      const { fileName, fileData, contentType } = req.body;
      if (!fileData || !fileName) {
        res.status(400).json({ error: "File data and file name are required." });
        return;
      }
      const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".svg"];
      const originalExt = import_path4.default.extname(fileName).toLowerCase();
      const targetExt = allowedExts.includes(originalExt) ? originalExt : ".png";
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length > 15 * 1024 * 1024) {
        res.status(400).json({ error: "File exceeds maximum limit of 15MB." });
        return;
      }
      const uniqueId = `soar_${Date.now()}_${import_crypto2.default.randomBytes(4).toString("hex")}`;
      const cleanFileName = `${uniqueId}${targetExt}`;
      const bucket = getStorageBucket();
      let storageUrl = "";
      if (bucket) {
        try {
          const fileRef = bucket.file(`uploads/${cleanFileName}`);
          await fileRef.save(buffer, {
            contentType: contentType || "image/png",
            metadata: {
              cacheControl: "public, max-age=86400"
            }
          });
          try {
            await fileRef.makePublic();
            storageUrl = `https://storage.googleapis.com/${bucket.name}/uploads/${cleanFileName}`;
          } catch {
            storageUrl = `/uploads/${cleanFileName}`;
          }
        } catch (storageErr) {
          console.warn("[Upload] Firebase Storage upload skipped, saving locally:", storageErr.message);
        }
      }
      try {
        const publicPath = import_path4.default.join(PUBLIC_UPLOADS_DIR2, cleanFileName);
        const dataPath = import_path4.default.join(UPLOADS_DIR2, cleanFileName);
        import_fs4.default.writeFileSync(publicPath, buffer);
        import_fs4.default.writeFileSync(dataPath, buffer);
      } catch (fsErr) {
        console.warn("[Upload] Local filesystem write warning:", fsErr.message);
      }
      res.json({
        url: storageUrl || `/uploads/${cleanFileName}`,
        fileName: cleanFileName,
        size: buffer.length,
        contentType: contentType || "image/png"
      });
    } catch (err) {
      console.error("File upload error:", err);
      res.status(500).json({ error: err.message || "Failed to upload image." });
    }
  });
  app2.post("/api/upload/authorize", requireAdmin, async (req, res) => {
    try {
      const { fileName, contentType } = req.body;
      const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".svg"];
      const originalExt = import_path4.default.extname(fileName || "").toLowerCase();
      const targetExt = allowedExts.includes(originalExt) ? originalExt : ".png";
      const cleanFileName = `soar_${Date.now()}_${import_crypto2.default.randomBytes(4).toString("hex")}${targetExt}`;
      const bucket = getStorageBucket();
      if (bucket) {
        try {
          const fileRef = bucket.file(`uploads/${cleanFileName}`);
          const [signedUrl] = await fileRef.getSignedUrl({
            version: "v4",
            action: "write",
            expires: Date.now() + 15 * 60 * 1e3,
            // 15 minutes
            contentType: contentType || "image/png"
          });
          res.json({
            directUploadSupported: true,
            uploadUrl: signedUrl,
            fileName: cleanFileName,
            publicUrl: `https://storage.googleapis.com/${bucket.name}/uploads/${cleanFileName}`,
            fallbackUrl: `/uploads/${cleanFileName}`
          });
          return;
        } catch (signedErr) {
          console.warn("[Upload Auth] Signed URL generation skipped:", signedErr.message);
        }
      }
      res.json({
        directUploadSupported: false,
        uploadEndpoint: "/api/upload",
        fileName: cleanFileName,
        fallbackUrl: `/uploads/${cleanFileName}`
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to authorize upload." });
    }
  });
  app2.post("/api/ai/analyse-image", requireAdmin, async (req, res) => {
    try {
      const { fileData, imageUrl, fileName, mimeType } = req.body;
      let base64Data = "";
      let resolvedMimeType = mimeType || "image/png";
      if (fileData) {
        if (fileData.startsWith("data:")) {
          const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            resolvedMimeType = matches[1];
            base64Data = matches[2];
          } else {
            base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
          }
        } else {
          base64Data = fileData;
        }
      } else if (imageUrl) {
        if (imageUrl.startsWith("/uploads/")) {
          const localFileName = import_path4.default.basename(imageUrl);
          const localFilePath = import_fs4.default.existsSync(import_path4.default.join(PUBLIC_UPLOADS_DIR2, localFileName)) ? import_path4.default.join(PUBLIC_UPLOADS_DIR2, localFileName) : import_path4.default.join(UPLOADS_DIR2, localFileName);
          if (import_fs4.default.existsSync(localFilePath)) {
            const fileBuf = import_fs4.default.readFileSync(localFilePath);
            base64Data = fileBuf.toString("base64");
            const ext = import_path4.default.extname(localFileName).toLowerCase();
            if (ext === ".jpg" || ext === ".jpeg") resolvedMimeType = "image/jpeg";
            else if (ext === ".webp") resolvedMimeType = "image/webp";
            else if (ext === ".gif") resolvedMimeType = "image/gif";
            else if (ext === ".pdf") resolvedMimeType = "application/pdf";
            else if (ext === ".svg") resolvedMimeType = "image/svg+xml";
            else resolvedMimeType = "image/png";
          }
        } else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          try {
            const fetchRes = await fetch(imageUrl);
            if (fetchRes.ok) {
              const arrayBuf = await fetchRes.arrayBuffer();
              base64Data = Buffer.from(arrayBuf).toString("base64");
              const ct = fetchRes.headers.get("content-type");
              if (ct) resolvedMimeType = ct;
            }
          } catch (fetchErr) {
            console.warn("[AI] Remote image fetch failed:", fetchErr.message);
          }
        }
      }
      if (!base64Data) {
        res.status(400).json({ error: "No image data or valid image URL provided for AI analysis." });
        return;
      }
      const portalStore = await repository.getPortalData(true);
      const categories = portalStore.categories || [];
      const categoriesContext = categories.map((c) => `- ID: "${c.id}", Nama: "${c.name}" (${c.description || ""})`).join("\n");
      if (!ai) {
        const derivedTitle = fileName ? import_path4.default.parse(fileName).name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Poster Hebahan Rasmi";
        res.json({
          suggestedCategory: "general",
          suggestedTitle: derivedTitle,
          suggestedDescription: "Poster grafik hebahan rasmi Kontinjen KPMBP SOAR 2026.",
          relevantEvent: null,
          suggestedTags: ["Poster", "Hebahan", "SOAR2026"],
          extractedDatesAndInstructions: "",
          verificationRequired: true,
          serviceUnavailable: true,
          message: "Perkhidmatan AI tidak disambungkan. Sila semak atau lengkapkan butiran secara manual."
        });
        return;
      }
      const promptText = `Anda ialah pembantu AI pintar untuk Kontinjen KPM Bandar Penawar (KPMBP) dalam festival SOAR 2026.
Tugas anda: Analisis gambar poster rasmi, jadual infografik, notis penginapan/pengangkutan, atau hebahan Telegram yang disertakan.

Kategori Acara / Saluran yang tersedia di portal:
${categoriesContext}
- ID: "general", Nama: "Pengumuman Umum / Urus Setia"
- ID: "pendaftaran", Nama: "Pendaftaran Peserta"
- ID: "jadual", Nama: "Jadual Pertandingan"
- ID: "peraturan", Nama: "Peraturan & Syarat"
- ID: "penginapan", Nama: "Penginapan & Pengangkutan"
- ID: "persediaan", Nama: "Persediaan Acara"
- ID: "lokasi", Nama: "Lokasi & Venue"
- ID: "keputusan", Nama: "Keputusan Pertandingan"
- ID: "majlis-penutupan", Nama: "Majlis Penutup"

PERATURAN PENTING:
1. "suggestedCategory": Pilih ID kategori paling sepadan daripada senarai di atas.
2. "suggestedTitle": Tajuk poster ringkas, padat & bermakna dalam Bahasa Melayu (maksimum 10 perkataan).
3. "suggestedDescription": Huraian ringkas kandungan poster dalam 1 hingga 3 ayat Bahasa Melayu.
4. "relevantEvent": Nama acara khusus jika poster berkaitan acara tertentu, atau null jika makluman am.
5. "suggestedTags": 2 hingga 5 tag relevan.
6. "extractedDatesAndInstructions": Sebarang tarikh, masa, lokasi atau arahan penting yang JELAS TERBACA pada poster. JANGAN mereka-reka maklumat yang tiada dalam gambar.
7. "verificationRequired": Tetapkan true jika teks kabur atau sebahagian terpotong.

Berikan output dalam format JSON:
{
  "suggestedCategory": "string",
  "suggestedTitle": "string",
  "suggestedDescription": "string",
  "relevantEvent": "string atau null",
  "suggestedTags": ["string"],
  "extractedDatesAndInstructions": "string",
  "verificationRequired": false
}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMimeType,
                data: base64Data
              }
            },
            {
              text: promptText
            }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });
      const responseText = response.text || "{}";
      let parsedResult = {};
      try {
        parsedResult = JSON.parse(responseText);
      } catch {
        parsedResult = {};
      }
      res.json({
        suggestedCategory: parsedResult.suggestedCategory || "general",
        suggestedTitle: parsedResult.suggestedTitle || (fileName ? import_path4.default.parse(fileName).name : "Poster Hebahan Rasmi"),
        suggestedDescription: parsedResult.suggestedDescription || "Hebahan visual rasmi Kontinjen KPMBP.",
        relevantEvent: parsedResult.relevantEvent || null,
        suggestedTags: Array.isArray(parsedResult.suggestedTags) ? parsedResult.suggestedTags : ["Poster", "SOAR2026"],
        extractedDatesAndInstructions: parsedResult.extractedDatesAndInstructions || "",
        verificationRequired: Boolean(parsedResult.verificationRequired),
        serviceUnavailable: false
      });
    } catch (err) {
      console.error("AI Image Analysis error:", err);
      const fallbackTitle = req.body.fileName ? import_path4.default.parse(req.body.fileName).name.replace(/[_-]+/g, " ") : "Poster Hebahan Rasmi";
      res.json({
        suggestedCategory: "general",
        suggestedTitle: fallbackTitle,
        suggestedDescription: "Poster rasmi kontinjen KPMBP SOAR 2026.",
        relevantEvent: null,
        suggestedTags: ["Poster", "SOAR2026"],
        extractedDatesAndInstructions: "",
        verificationRequired: true,
        serviceUnavailable: true,
        message: "Perkhidmatan AI menghadapi ralat sementara. Anda boleh melengkapkan butiran secara manual."
      });
    }
  });
  app2.get("/api/portal/data", async (req, res) => {
    try {
      const session = await getSessionFromReq(req);
      const isAdmin = session?.role === "admin";
      const data = await repository.getPortalData(isAdmin);
      res.json(data);
    } catch (err) {
      console.error("Error in /api/portal/data:", err);
      try {
        const { getLocalPortalStore: getLocalPortalStore2 } = await Promise.resolve().then(() => (init_repository(), repository_exports));
        res.json(getLocalPortalStore2());
      } catch {
        res.status(500).json({ error: "Failed to retrieve portal data." });
      }
    }
  });
  app2.put("/api/portal/settings", requireAdmin, async (req, res) => {
    try {
      const updated = await repository.updateSettings(req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update portal settings." });
    }
  });
  app2.put("/api/portal/phase", requireAdmin, async (req, res) => {
    try {
      const { activePhase } = req.body;
      if (activePhase !== "pre-final" && activePhase !== "during-final") {
        res.status(400).json({ error: "Invalid phase. Must be pre-final or during-final." });
        return;
      }
      const updated = await repository.updateActivePhase(activePhase);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update phase." });
    }
  });
  app2.put("/api/portal/categories", requireAdmin, async (req, res) => {
    try {
      const { categories } = req.body;
      if (!Array.isArray(categories)) {
        res.status(400).json({ error: "Categories must be an array." });
        return;
      }
      const updated = await repository.updateCategories(categories);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update categories." });
    }
  });
  app2.put("/api/portal/tabs", requireAdmin, async (req, res) => {
    try {
      const { tabs } = req.body;
      if (!Array.isArray(tabs)) {
        res.status(400).json({ error: "Tabs must be an array." });
        return;
      }
      const updated = await repository.updateTabs(tabs);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update tabs." });
    }
  });
  app2.post("/api/portal/announcements", requireAdmin, async (req, res) => {
    try {
      const saved = await repository.saveAnnouncement(req.body);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to create announcement." });
    }
  });
  app2.post("/api/portal/announcements/batch", requireAdmin, async (req, res) => {
    try {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      const savedItems = await repository.saveBatchAnnouncements(items);
      res.json({ success: true, count: savedItems.length, items: savedItems });
    } catch (err) {
      res.status(500).json({ error: "Failed to batch create announcements." });
    }
  });
  app2.put("/api/portal/announcements/:id/supersede", requireAdmin, async (req, res) => {
    try {
      const { isSuperseded, supersededReason } = req.body;
      const updated = await repository.supersedeAnnouncement(req.params.id, isSuperseded, supersededReason);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ error: err.message || "Announcement not found." });
    }
  });
  app2.put("/api/portal/announcements/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await repository.saveAnnouncement({ ...req.body, id: req.params.id });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update announcement." });
    }
  });
  app2.delete("/api/portal/announcements/:id", requireAdmin, async (req, res) => {
    try {
      await repository.deleteAnnouncement(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete announcement." });
    }
  });
  app2.post("/api/portal/schedules", requireAdmin, async (req, res) => {
    try {
      const saved = await repository.saveSchedule(req.body);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to create schedule." });
    }
  });
  app2.put("/api/portal/schedules/:id", requireAdmin, async (req, res) => {
    try {
      const saved = await repository.saveSchedule({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to update schedule." });
    }
  });
  app2.delete("/api/portal/schedules/:id", requireAdmin, async (req, res) => {
    try {
      await repository.deleteSchedule(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete schedule." });
    }
  });
  app2.post("/api/portal/documents", requireAdmin, async (req, res) => {
    try {
      const saved = await repository.saveDocument(req.body);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to create document." });
    }
  });
  app2.put("/api/portal/documents/:id", requireAdmin, async (req, res) => {
    try {
      const saved = await repository.saveDocument({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to update document." });
    }
  });
  app2.delete("/api/portal/documents/:id", requireAdmin, async (req, res) => {
    try {
      await repository.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete document." });
    }
  });
  app2.post("/api/portal/event-info", requireAdmin, async (req, res) => {
    try {
      const saved = await repository.saveEventSection(req.body);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to create event section." });
    }
  });
  app2.put("/api/portal/event-info/:id", requireAdmin, async (req, res) => {
    try {
      const saved = await repository.saveEventSection({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to update event section." });
    }
  });
  app2.delete("/api/portal/event-info/:id", requireAdmin, async (req, res) => {
    try {
      await repository.deleteEventSection(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete event section." });
    }
  });
  app2.post("/api/portal/locations", requireAdmin, async (req, res) => {
    try {
      const saved = await repository.saveLocation(req.body);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to create location." });
    }
  });
  app2.put("/api/portal/locations/:id", requireAdmin, async (req, res) => {
    try {
      const saved = await repository.saveLocation({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to update location." });
    }
  });
  app2.delete("/api/portal/locations/:id", requireAdmin, async (req, res) => {
    try {
      await repository.deleteLocation(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete location." });
    }
  });
  app2.put("/api/portal/custom-tab/:tabId", requireAdmin, async (req, res) => {
    try {
      const { tabId } = req.params;
      const { content } = req.body;
      await repository.updateCustomTab(tabId, content || "");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update custom tab content." });
    }
  });
  app2.get("/api/admin/system-status", async (_req, res) => {
    try {
      const adminStatus = await checkFirebaseAdminStatus();
      res.json({
        platform: process.env.VERCEL ? "vercel-serverless" : "node-express",
        environment: process.env.NODE_ENV || "development",
        firebaseAdmin: adminStatus,
        geminiAiConfigured: Boolean(process.env.GEMINI_API_KEY),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/admin/migrate-data", requireAdmin, async (req, res) => {
    try {
      const { dryRun, forceOverwrite } = req.body || {};
      const report = await executeDataMigration({
        dryRun: Boolean(dryRun),
        forceOverwrite: Boolean(forceOverwrite)
      });
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: err.message || "Migration execution failed." });
    }
  });
  app2.all("/api/*", (req, res) => {
    res.status(404).json({
      error: "API endpoint not found",
      path: req.originalUrl || req.url || req.path,
      method: req.method
    });
  });
  return app2;
}
var app = createApp();
var app_default = app;

// api/index.ts
function handler(req, res) {
  return app_default(req, res);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
