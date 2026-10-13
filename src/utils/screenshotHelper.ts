import html2canvas from 'html2canvas';
import {
  ADMIN_WHATSAPP_PHONE,
  ADMIN_WHATSAPP_URL,
  AdminSupportMessageParams,
  generateAdminSupportMessage,
  generateAdminSupportLink
} from './whatsappHelper';

export interface ScreenshotShareOptions {
  element: HTMLElement;
  filename?: string;
  title?: string;
  text?: string;
  whatsappUrl?: string;
}

export interface ScreenshotShareResult {
  success: boolean;
  outcome: 'SHARED' | 'DOWNLOADED' | 'CANCELLED' | 'FAILED';
  blob?: Blob;
  whatsappUrl?: string;
  error?: string;
  userMessage?: string;
}

export interface SmartScreenshotSupportOptions extends AdminSupportMessageParams {
  element?: HTMLElement | null;
  targetElementId?: string;
}

/**
 * Captures an HTML element into a high-DPI PNG Blob.
 * Automatically strips sensitive fields (PINs, tokens, passwords)
 * and elements with data-html2canvas-ignore="true".
 */
export async function captureElementToBlob(element: HTMLElement): Promise<Blob | null> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution for mobile screen readability
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#020617', // Match dark slate theme
      ignoreElements: (el) => {
        // Skip explicitly ignored elements
        if (
          el.getAttribute('data-html2canvas-ignore') === 'true' ||
          el.getAttribute('data-sensitive') === 'true' ||
          el.classList?.contains('no-capture') ||
          el.classList?.contains('pin-input')
        ) {
          return true;
        }

        // Protect sensitive input types, PINs, and authentication tokens
        if (el instanceof HTMLInputElement) {
          const name = el.name?.toLowerCase() || '';
          const id = el.id?.toLowerCase() || '';
          if (
            el.type === 'password' ||
            name.includes('pin') ||
            id.includes('pin') ||
            name.includes('token') ||
            id.includes('token')
          ) {
            return true;
          }
        }
        return false;
      }
    });

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/png',
        0.95
      );
    });
  } catch (err) {
    console.warn('Screenshot capture failed:', err);
    return null;
  }
}

/**
 * Downloads a Blob as a file to the user's device.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Captures screenshot and attempts native Web Share API (mobile priority).
 * If Web Share is not supported or sharing files is unsupported,
 * falls back to downloading the PNG image and opening WhatsApp Admin.
 */
export async function captureAndShareScreenshot(
  options: ScreenshotShareOptions
): Promise<ScreenshotShareResult> {
  const {
    element,
    filename = `ClassAttend_Screenshot_${Date.now()}.png`,
    title = 'Bantuan ClassAttend - KPM Bandar Penawar',
    text = '',
    whatsappUrl = ADMIN_WHATSAPP_URL
  } = options;

  const blob = await captureElementToBlob(element);
  if (!blob) {
    return {
      success: false,
      outcome: 'FAILED',
      whatsappUrl,
      error: 'Gagal menjana tangkapan skrin paparan.',
      userMessage: `Gagal menjana tangkapan skrin. Sila buka WhatsApp Admin terus (${ADMIN_WHATSAPP_PHONE}).`
    };
  }

  const file = new File([blob], filename, { type: 'image/png' });

  // 1. Mobile Priority: Native Web Share API with image file
  if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text
        });
        return {
          success: true,
          outcome: 'SHARED',
          blob,
          whatsappUrl,
          userMessage: 'Tetingkap perkongsian dibuka. Sila pilih WhatsApp untuk menghantar screenshot & maklumat bantuan.'
        };
      }
    } catch (err: any) {
      // User cancelled share dialog
      if (err?.name === 'AbortError') {
        return {
          success: true,
          outcome: 'CANCELLED',
          blob,
          whatsappUrl,
          userMessage: 'Perkongsian dibatalkan oleh pengguna.'
        };
      }
      console.warn('Web Share API error, falling back to download & WhatsApp:', err);
    }
  }

  // 2. Fallback for Desktop / non-supporting browsers: Trigger image download & launch WhatsApp Admin
  try {
    triggerFileDownload(blob, filename);

    // Open WhatsApp Admin chat in new tab/window after triggering download
    if (whatsappUrl && typeof window !== 'undefined') {
      try {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('Unable to popup WhatsApp window, URL provided as fallback:', e);
      }
    }

    return {
      success: true,
      outcome: 'DOWNLOADED',
      blob,
      whatsappUrl,
      userMessage: 'Tangkapan skrin telah dimuat turun! Sila lampirkan fail PNG ini ke dalam perbualan WhatsApp Admin yang telah dibuka.'
    };
  } catch (err) {
    return {
      success: false,
      outcome: 'FAILED',
      whatsappUrl,
      error: 'Gagal memuat turun fail tangkapan skrin.',
      userMessage: `Gagal memuat turun fail. Sila hubungi WhatsApp Admin di talian ${ADMIN_WHATSAPP_PHONE}.`
    };
  }
}

/**
 * End-to-end coordinator for Smart Screenshot & PM Admin workflow.
 * 1. Formats Malay support text and WhatsApp link.
 * 2. Locates target DOM element safely.
 * 3. Captures and shares/downloads screenshot.
 */
export async function performSmartScreenshotSupport(
  options: SmartScreenshotSupportOptions
): Promise<ScreenshotShareResult> {
  const { element, targetElementId, ...messageParams } = options;

  // 1. Prepare Malay support text and WhatsApp URL
  const supportText = generateAdminSupportMessage(messageParams);
  const whatsappUrl = generateAdminSupportLink(messageParams);

  // 2. Identify target element
  let targetEl: HTMLElement | null = element || null;
  if (!targetEl && targetElementId && typeof document !== 'undefined') {
    targetEl = document.getElementById(targetElementId);
  }
  if (!targetEl && typeof document !== 'undefined') {
    targetEl =
      document.getElementById('student-checkin-modal-card') ||
      document.getElementById('student-qr-portal-container') ||
      document.getElementById('root') ||
      document.body;
  }

  if (!targetEl) {
    return {
      success: false,
      outcome: 'FAILED',
      whatsappUrl,
      error: 'Elemen paparan tidak ditemui.',
      userMessage: `Sila hubungi WhatsApp Admin terus di talian ${ADMIN_WHATSAPP_PHONE}.`
    };
  }

  const cleanId = (messageParams.studentId || 'PELAJAR').replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `ClassAttend_Bantuan_${cleanId}_${Date.now()}.png`;

  return await captureAndShareScreenshot({
    element: targetEl,
    filename,
    title: 'Bantuan Kehadiran Pelajar - ClassAttend KPM',
    text: supportText,
    whatsappUrl
  });
}
