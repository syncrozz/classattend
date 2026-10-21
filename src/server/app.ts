import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { repository, hashPassword } from './repository';
import { checkFirebaseAdminStatus, getStorageBucket } from './firebase-admin';
import { executeDataMigration } from './migration';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const PUBLIC_UPLOADS_DIR = path.resolve(ROOT_DIR, 'public', 'uploads');

// Safe server-side Gemini AI client initialization
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Ensure local directories exist
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}
}
if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
  try { fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true }); } catch {}
}

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Vercel Serverless & Reverse Proxy URL Normalization (applies strictly to API subroutes)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // 1. Reconstruct from Vercel dynamic catch-all route if path query param is passed
    const pathParam = (req.query as any)?.path || (req.params as any)?.path;
    if (pathParam) {
      const subpath = Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam);
      req.url = `/api/${subpath}`;
      return next();
    }

    // 2. Restore from originalUrl if req.url was collapsed to /api and originalUrl had a subpath
    const orig = req.originalUrl;
    if (orig && (req.url === '/api' || req.url === '/api/') && orig !== req.url && orig.startsWith('/api/')) {
      req.url = orig;
      return next();
    }

    // 3. Strip any /api/index.ts or /api/index prefix
    if (req.url.startsWith('/api/index.ts')) {
      req.url = req.url.replace('/api/index.ts', '/api');
    } else if (req.url.startsWith('/api/index')) {
      req.url = req.url.replace('/api/index', '/api');
    }

    // 4. If path is a known API prefix that had /api stripped by upstream rewrite (e.g. /auth/status, /portal/data):
    const knownApiPrefixes = [
      '/auth/',
      '/portal/',
      '/announcements',
      '/schedules',
      '/documents',
      '/events',
      '/locations',
      '/ai/',
      '/admin/',
      '/health',
    ];
    const isKnownApi = knownApiPrefixes.some((prefix) => req.url.startsWith(prefix));
    if (isKnownApi) {
      req.url = '/api' + req.url;
    }

    next();
  });

  // Base API health / ping endpoints (only for /api and /api/health)
  app.get('/api', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'KPMBP Contingent SOAR Portal API',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'KPMBP Contingent SOAR Portal API',
      timestamp: new Date().toISOString(),
    });
  });

  // Helper to extract session from Authorization Bearer header
  async function getSessionFromReq(req: Request): Promise<{ role: 'admin' | 'team'; email?: string } | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7).trim();
    if (!token) return null;

    const session = await repository.getSession(token);
    return session;
  }

  // Authentication Middleware
  async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const session = await getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Access restricted. Please authenticate to view this portal.' });
      return;
    }
    (req as any).user = session;
    next();
  }

  async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const session = await getSessionFromReq(req);
    if (!session || session.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized. Administrator privileges required.' });
      return;
    }
    (req as any).user = session;
    next();
  }

  // Serve static uploads (from public/uploads first, then data/uploads fallback)
  if (fs.existsSync(PUBLIC_UPLOADS_DIR)) {
    app.use('/uploads', express.static(PUBLIC_UPLOADS_DIR, { maxAge: '1d' }));
  }
  if (fs.existsSync(UPLOADS_DIR)) {
    app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1d' }));
  }

  // Also support /api/uploads/:filename route for Vercel rewrites
  app.get('/api/uploads/:filename', (req: Request, res: Response) => {
    const filename = path.basename(req.params.filename);
    const publicPath = path.join(PUBLIC_UPLOADS_DIR, filename);
    const dataPath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(publicPath)) {
      res.sendFile(publicPath);
      return;
    }
    if (fs.existsSync(dataPath)) {
      res.sendFile(dataPath);
      return;
    }
    res.status(404).json({ error: 'File not found.' });
  });

  // ======================== AUTH ROUTES ========================

  app.get('/api/auth/status', async (req: Request, res: Response) => {
    try {
      const authStore = await repository.getAuthStore();
      const session = await getSessionFromReq(req);

      res.json({
        isSetup: authStore?.isSetup ?? true,
        adminEmail: authStore?.adminEmail || 'khaikerr@gmail.com',
        isAuthenticated: !!session,
        role: session ? session.role : null,
        email: session ? session.email : undefined,
      });
    } catch (err: any) {
      console.error('Error in /api/auth/status:', err);
      res.json({
        isSetup: true,
        adminEmail: 'khaikerr@gmail.com',
        isAuthenticated: false,
        role: null,
      });
    }
  });

  app.post('/api/auth/setup', async (req: Request, res: Response) => {
    try {
      const authStore = await repository.getAuthStore();
      if (authStore.isSetup) {
        res.status(400).json({ error: 'System is already initialized.' });
        return;
      }

      const { adminPassword, teamPasscode } = req.body;
      if (!adminPassword || adminPassword.length < 6) {
        res.status(400).json({ error: 'Administrator password must be at least 6 characters.' });
        return;
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(adminPassword, salt);
      const passcode = teamPasscode ? teamPasscode.trim() : 'KPMBP2026';

      await repository.saveAuthConfig({
        adminPasswordSalt: salt,
        adminPasswordHash: passwordHash,
        teamPasscode: passcode,
        isSetup: true,
      });

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
      await repository.createSession(token, {
        role: 'admin',
        email: authStore.adminEmail,
        expiresAt,
      });

      res.json({
        success: true,
        token,
        role: 'admin',
        email: authStore.adminEmail,
      });
    } catch (err: any) {
      console.error('Error in /api/auth/setup:', err);
      res.status(500).json({ error: 'Failed to complete initial setup.' });
    }
  });

  app.post('/api/auth/admin-login', async (req: Request, res: Response) => {
    try {
      const { password, email } = req.body;
      const authStore = await repository.getAuthStore();

      if (!authStore.isSetup) {
        res.status(400).json({ error: 'System is not initialized. Please complete initial setup.' });
        return;
      }

      if (email && email.toLowerCase().trim() !== authStore.adminEmail.toLowerCase().trim()) {
        res.status(401).json({ error: 'Invalid administrator email address.' });
        return;
      }

      const incomingHash = hashPassword(password || '', authStore.adminPasswordSalt);
      if (incomingHash !== authStore.adminPasswordHash) {
        res.status(401).json({ error: 'Incorrect administrator password.' });
        return;
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
      await repository.createSession(token, {
        role: 'admin',
        email: authStore.adminEmail,
        expiresAt,
      });

      res.json({
        token,
        role: 'admin',
        email: authStore.adminEmail,
      });
    } catch (err: any) {
      console.error('Error in /api/auth/admin-login:', err);
      res.status(500).json({ error: 'Login authentication error.' });
    }
  });

  app.post('/api/auth/firebase-login', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const authStore = await repository.getAuthStore();

      const normalizedEmail = (email || '').toLowerCase().trim();
      const allowedAdminEmails = [
        authStore.adminEmail.toLowerCase().trim(),
        'khaikerr@gmail.com',
        'kpmbppsn@gmail.com',
      ];

      if (!normalizedEmail || !allowedAdminEmails.includes(normalizedEmail)) {
        res.status(401).json({ error: 'This account is not authorized as an administrator for Competition Hub KPMBP.' });
        return;
      }

      if (!authStore.isSetup) {
        await repository.saveAuthConfig({ isSetup: true });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
      await repository.createSession(token, {
        role: 'admin',
        email: normalizedEmail,
        expiresAt,
      });

      res.json({
        token,
        role: 'admin',
        email: normalizedEmail,
      });
    } catch (err: any) {
      console.error('Error in /api/auth/firebase-login:', err);
      res.status(500).json({ error: 'Failed to process Google sign-in.' });
    }
  });

  app.post('/api/auth/team-login', async (req: Request, res: Response) => {
    try {
      const { passcode } = req.body;
      const authStore = await repository.getAuthStore();

      if (!authStore.isSetup) {
        res.status(400).json({ error: 'Portal is not configured yet.' });
        return;
      }

      if (!passcode || passcode.trim().toUpperCase() !== authStore.teamPasscode.toUpperCase()) {
        res.status(401).json({ error: 'Invalid team passcode. Please check with your team coordinator.' });
        return;
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
      await repository.createSession(token, {
        role: 'team',
        expiresAt,
      });

      res.json({
        token,
        role: 'team',
      });
    } catch (err: any) {
      console.error('Error in /api/auth/team-login:', err);
      res.status(500).json({ error: 'Failed to verify team passcode.' });
    }
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        await repository.deleteSession(token);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.json({ success: true });
    }
  });

  app.post('/api/auth/update-credentials', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword, teamPasscode } = req.body;
      const authStore = await repository.getAuthStore();

      const updates: any = {};

      if (newPassword) {
        if (!currentPassword) {
          res.status(400).json({ error: 'Current password is required to change administrator password.' });
          return;
        }
        const currentHash = hashPassword(currentPassword, authStore.adminPasswordSalt);
        if (currentHash !== authStore.adminPasswordHash) {
          res.status(401).json({ error: 'Current administrator password is incorrect.' });
          return;
        }
        if (newPassword.length < 6) {
          res.status(400).json({ error: 'New password must be at least 6 characters long.' });
          return;
        }
        const salt = crypto.randomBytes(16).toString('hex');
        updates.adminPasswordSalt = salt;
        updates.adminPasswordHash = hashPassword(newPassword, salt);
      }

      if (teamPasscode && typeof teamPasscode === 'string') {
        if (teamPasscode.trim().length < 3) {
          res.status(400).json({ error: 'Team access passcode must be at least 3 characters long.' });
          return;
        }
        updates.teamPasscode = teamPasscode.trim();
      }

      await repository.saveAuthConfig(updates);
      res.json({ success: true, message: 'Security credentials updated successfully.' });
    } catch (err: any) {
      console.error('Error in update-credentials:', err);
      res.status(500).json({ error: 'Failed to update credentials.' });
    }
  });

  // ======================== UPLOAD & STORAGE ROUTES ========================

  // Direct Poster / Image / Document upload (Admin only)
  app.post('/api/upload', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fileName, fileData, contentType } = req.body;
      if (!fileData || !fileName) {
        res.status(400).json({ error: 'File data and file name are required.' });
        return;
      }

      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.svg'];
      const originalExt = path.extname(fileName).toLowerCase();
      const targetExt = allowedExts.includes(originalExt) ? originalExt : '.png';

      const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > 15 * 1024 * 1024) {
        res.status(400).json({ error: 'File exceeds maximum limit of 15MB.' });
        return;
      }

      const uniqueId = `soar_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const cleanFileName = `${uniqueId}${targetExt}`;

      // 1. Try uploading to Firebase Storage if bucket is available
      const bucket = getStorageBucket();
      let storageUrl = '';
      if (bucket) {
        try {
          const fileRef = bucket.file(`uploads/${cleanFileName}`);
          await fileRef.save(buffer, {
            contentType: contentType || 'image/png',
            metadata: {
              cacheControl: 'public, max-age=86400',
            },
          });
          // Check if bucket allows public or signed URL
          try {
            await fileRef.makePublic();
            storageUrl = `https://storage.googleapis.com/${bucket.name}/uploads/${cleanFileName}`;
          } catch {
            storageUrl = `/uploads/${cleanFileName}`;
          }
        } catch (storageErr: any) {
          console.warn('[Upload] Firebase Storage upload skipped, saving locally:', storageErr.message);
        }
      }

      // 2. Also save to public/uploads & data/uploads for static CDN & local serving
      try {
        const publicPath = path.join(PUBLIC_UPLOADS_DIR, cleanFileName);
        const dataPath = path.join(UPLOADS_DIR, cleanFileName);
        fs.writeFileSync(publicPath, buffer);
        fs.writeFileSync(dataPath, buffer);
      } catch (fsErr: any) {
        console.warn('[Upload] Local filesystem write warning:', fsErr.message);
      }

      res.json({
        url: storageUrl || `/uploads/${cleanFileName}`,
        fileName: cleanFileName,
        size: buffer.length,
        contentType: contentType || 'image/png',
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload image.' });
    }
  });

  // Upload authorization for direct-to-cloud client uploads (removes server function payload limits)
  app.post('/api/upload/authorize', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fileName, contentType } = req.body;
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.svg'];
      const originalExt = path.extname(fileName || '').toLowerCase();
      const targetExt = allowedExts.includes(originalExt) ? originalExt : '.png';
      const cleanFileName = `soar_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${targetExt}`;

      const bucket = getStorageBucket();
      if (bucket) {
        try {
          const fileRef = bucket.file(`uploads/${cleanFileName}`);
          const [signedUrl] = await fileRef.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: contentType || 'image/png',
          });

          res.json({
            directUploadSupported: true,
            uploadUrl: signedUrl,
            fileName: cleanFileName,
            publicUrl: `https://storage.googleapis.com/${bucket.name}/uploads/${cleanFileName}`,
            fallbackUrl: `/uploads/${cleanFileName}`,
          });
          return;
        } catch (signedErr: any) {
          console.warn('[Upload Auth] Signed URL generation skipped:', signedErr.message);
        }
      }

      // Fallback to standard server-side upload endpoint
      res.json({
        directUploadSupported: false,
        uploadEndpoint: '/api/upload',
        fileName: cleanFileName,
        fallbackUrl: `/uploads/${cleanFileName}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to authorize upload.' });
    }
  });

  // ======================== AI IMAGE CLASSIFICATION & ANALYSIS ========================

  app.post('/api/ai/analyse-image', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fileData, imageUrl, fileName, mimeType } = req.body;

      let base64Data = '';
      let resolvedMimeType = mimeType || 'image/png';

      if (fileData) {
        if (fileData.startsWith('data:')) {
          const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            resolvedMimeType = matches[1];
            base64Data = matches[2];
          } else {
            base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
          }
        } else {
          base64Data = fileData;
        }
      } else if (imageUrl) {
        if (imageUrl.startsWith('/uploads/')) {
          const localFileName = path.basename(imageUrl);
          const localFilePath = fs.existsSync(path.join(PUBLIC_UPLOADS_DIR, localFileName))
            ? path.join(PUBLIC_UPLOADS_DIR, localFileName)
            : path.join(UPLOADS_DIR, localFileName);

          if (fs.existsSync(localFilePath)) {
            const fileBuf = fs.readFileSync(localFilePath);
            base64Data = fileBuf.toString('base64');
            const ext = path.extname(localFileName).toLowerCase();
            if (ext === '.jpg' || ext === '.jpeg') resolvedMimeType = 'image/jpeg';
            else if (ext === '.webp') resolvedMimeType = 'image/webp';
            else if (ext === '.gif') resolvedMimeType = 'image/gif';
            else if (ext === '.pdf') resolvedMimeType = 'application/pdf';
            else if (ext === '.svg') resolvedMimeType = 'image/svg+xml';
            else resolvedMimeType = 'image/png';
          }
        } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          // Fetch remote image buffer
          try {
            const fetchRes = await fetch(imageUrl);
            if (fetchRes.ok) {
              const arrayBuf = await fetchRes.arrayBuffer();
              base64Data = Buffer.from(arrayBuf).toString('base64');
              const ct = fetchRes.headers.get('content-type');
              if (ct) resolvedMimeType = ct;
            }
          } catch (fetchErr: any) {
            console.warn('[AI] Remote image fetch failed:', fetchErr.message);
          }
        }
      }

      if (!base64Data) {
        res.status(400).json({ error: 'No image data or valid image URL provided for AI analysis.' });
        return;
      }

      // Context categories from portal store
      const portalStore = await repository.getPortalData(true);
      const categories = portalStore.categories || [];
      const categoriesContext = categories
        .map((c) => `- ID: "${c.id}", Nama: "${c.name}" (${c.description || ''})`)
        .join('\n');

      if (!ai) {
        const derivedTitle = fileName
          ? path.parse(fileName).name.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Poster Hebahan Rasmi';
        res.json({
          suggestedCategory: 'general',
          suggestedTitle: derivedTitle,
          suggestedDescription: 'Poster grafik hebahan rasmi Kontinjen KPMBP SOAR 2026.',
          relevantEvent: null,
          suggestedTags: ['Poster', 'Hebahan', 'SOAR2026'],
          extractedDatesAndInstructions: '',
          verificationRequired: true,
          serviceUnavailable: true,
          message: 'Perkhidmatan AI tidak disambungkan. Sila semak atau lengkapkan butiran secara manual.',
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
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMimeType,
                data: base64Data,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsedResult: any = {};
      try {
        parsedResult = JSON.parse(responseText);
      } catch {
        parsedResult = {};
      }

      res.json({
        suggestedCategory: parsedResult.suggestedCategory || 'general',
        suggestedTitle: parsedResult.suggestedTitle || (fileName ? path.parse(fileName).name : 'Poster Hebahan Rasmi'),
        suggestedDescription: parsedResult.suggestedDescription || 'Hebahan visual rasmi Kontinjen KPMBP.',
        relevantEvent: parsedResult.relevantEvent || null,
        suggestedTags: Array.isArray(parsedResult.suggestedTags) ? parsedResult.suggestedTags : ['Poster', 'SOAR2026'],
        extractedDatesAndInstructions: parsedResult.extractedDatesAndInstructions || '',
        verificationRequired: Boolean(parsedResult.verificationRequired),
        serviceUnavailable: false,
      });
    } catch (err: any) {
      console.error('AI Image Analysis error:', err);
      const fallbackTitle = req.body.fileName
        ? path.parse(req.body.fileName).name.replace(/[_-]+/g, ' ')
        : 'Poster Hebahan Rasmi';

      res.json({
        suggestedCategory: 'general',
        suggestedTitle: fallbackTitle,
        suggestedDescription: 'Poster rasmi kontinjen KPMBP SOAR 2026.',
        relevantEvent: null,
        suggestedTags: ['Poster', 'SOAR2026'],
        extractedDatesAndInstructions: '',
        verificationRequired: true,
        serviceUnavailable: true,
        message: 'Perkhidmatan AI menghadapi ralat sementara. Anda boleh melengkapkan butiran secara manual.',
      });
    }
  });

  // ======================== PORTAL DATA ROUTES ========================

  app.get('/api/portal/data', async (req: Request, res: Response) => {
    try {
      const session = await getSessionFromReq(req);
      const isAdmin = session?.role === 'admin';
      const data = await repository.getPortalData(isAdmin);
      res.json(data);
    } catch (err: any) {
      console.error('Error in /api/portal/data:', err);
      try {
        const { getLocalPortalStore } = await import('./repository');
        res.json(getLocalPortalStore());
      } catch {
        res.status(500).json({ error: 'Failed to retrieve portal data.' });
      }
    }
  });

  app.put('/api/portal/settings', requireAdmin, async (req: Request, res: Response) => {
    try {
      const updated = await repository.updateSettings(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update portal settings.' });
    }
  });

  app.put('/api/portal/phase', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { activePhase } = req.body;
      if (activePhase !== 'pre-final' && activePhase !== 'during-final') {
        res.status(400).json({ error: 'Invalid phase. Must be pre-final or during-final.' });
        return;
      }
      const updated = await repository.updateActivePhase(activePhase);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update phase.' });
    }
  });

  app.put('/api/portal/categories', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { categories } = req.body;
      if (!Array.isArray(categories)) {
        res.status(400).json({ error: 'Categories must be an array.' });
        return;
      }
      const updated = await repository.updateCategories(categories);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update categories.' });
    }
  });

  app.put('/api/portal/tabs', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { tabs } = req.body;
      if (!Array.isArray(tabs)) {
        res.status(400).json({ error: 'Tabs must be an array.' });
        return;
      }
      const updated = await repository.updateTabs(tabs);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update tabs.' });
    }
  });

  // Announcements CRUD
  app.post('/api/portal/announcements', requireAdmin, async (req: Request, res: Response) => {
    try {
      const saved = await repository.saveAnnouncement(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create announcement.' });
    }
  });

  app.post('/api/portal/announcements/batch', requireAdmin, async (req: Request, res: Response) => {
    try {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      const savedItems = await repository.saveBatchAnnouncements(items);
      res.json({ success: true, count: savedItems.length, items: savedItems });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to batch create announcements.' });
    }
  });

  app.put('/api/portal/announcements/:id/supersede', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { isSuperseded, supersededReason } = req.body;
      const updated = await repository.supersedeAnnouncement(req.params.id, isSuperseded, supersededReason);
      res.json(updated);
    } catch (err: any) {
      res.status(404).json({ error: err.message || 'Announcement not found.' });
    }
  });

  app.put('/api/portal/announcements/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const updated = await repository.saveAnnouncement({ ...req.body, id: req.params.id });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update announcement.' });
    }
  });

  app.delete('/api/portal/announcements/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await repository.deleteAnnouncement(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete announcement.' });
    }
  });

  // Schedules CRUD
  app.post('/api/portal/schedules', requireAdmin, async (req: Request, res: Response) => {
    try {
      const saved = await repository.saveSchedule(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create schedule.' });
    }
  });

  app.put('/api/portal/schedules/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const saved = await repository.saveSchedule({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update schedule.' });
    }
  });

  app.delete('/api/portal/schedules/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await repository.deleteSchedule(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete schedule.' });
    }
  });

  // Documents CRUD
  app.post('/api/portal/documents', requireAdmin, async (req: Request, res: Response) => {
    try {
      const saved = await repository.saveDocument(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create document.' });
    }
  });

  app.put('/api/portal/documents/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const saved = await repository.saveDocument({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update document.' });
    }
  });

  app.delete('/api/portal/documents/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await repository.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete document.' });
    }
  });

  // Event Sections CRUD
  app.post('/api/portal/event-info', requireAdmin, async (req: Request, res: Response) => {
    try {
      const saved = await repository.saveEventSection(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create event section.' });
    }
  });

  app.put('/api/portal/event-info/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const saved = await repository.saveEventSection({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update event section.' });
    }
  });

  app.delete('/api/portal/event-info/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await repository.deleteEventSection(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete event section.' });
    }
  });

  // Locations CRUD
  app.post('/api/portal/locations', requireAdmin, async (req: Request, res: Response) => {
    try {
      const saved = await repository.saveLocation(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create location.' });
    }
  });

  app.put('/api/portal/locations/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const saved = await repository.saveLocation({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update location.' });
    }
  });

  app.delete('/api/portal/locations/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await repository.deleteLocation(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete location.' });
    }
  });

  // Custom Tabs
  app.put('/api/portal/custom-tab/:tabId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { tabId } = req.params;
      const { content } = req.body;
      await repository.updateCustomTab(tabId, content || '');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update custom tab content.' });
    }
  });

  // ======================== SYSTEM & MIGRATION DIAGNOSTICS ========================

  app.get('/api/admin/system-status', async (_req: Request, res: Response) => {
    try {
      const adminStatus = await checkFirebaseAdminStatus();
      res.json({
        platform: process.env.VERCEL ? 'vercel-serverless' : 'node-express',
        environment: process.env.NODE_ENV || 'development',
        firebaseAdmin: adminStatus,
        geminiAiConfigured: Boolean(process.env.GEMINI_API_KEY),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/migrate-data', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { dryRun, forceOverwrite } = req.body || {};
      const report = await executeDataMigration({
        dryRun: Boolean(dryRun),
        forceOverwrite: Boolean(forceOverwrite),
      });
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Migration execution failed.' });
    }
  });

  // Catch-all ONLY for unknown /api/* routes: MUST return JSON error, NEVER the SPA HTML!
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl || req.url || req.path,
      method: req.method,
    });
  });

  return app;
}

export const app = createApp();
export default app;
