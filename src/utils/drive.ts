/**
 * Utilities for parsing and formatting Google Drive and external URLs
 */

export interface ParsedDriveInfo {
  isDrive: boolean;
  fileId: string | null;
  fileType: 'image' | 'doc' | 'sheet' | 'slide' | 'pdf' | 'file';
  previewUrl: string | null;
  imageUrl: string | null;
  directUrl: string;
}

export function parseGoogleDriveUrl(url: string): ParsedDriveInfo {
  if (!url || typeof url !== 'string') {
    return {
      isDrive: false,
      fileId: null,
      fileType: 'file',
      previewUrl: null,
      imageUrl: null,
      directUrl: '',
    };
  }

  const cleanUrl = url.trim();

  // Pattern matching for various Google Drive / Docs URLs
  const fileIdPatterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /\/drive\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/thumbnail\?id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  let fileId: string | null = null;
  for (const pattern of fileIdPatterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      fileId = match[1];
      break;
    }
  }

  const isGoogle = cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com');

  if (!isGoogle || !fileId) {
    return {
      isDrive: false,
      fileId: null,
      fileType: 'file',
      previewUrl: null,
      imageUrl: cleanUrl,
      directUrl: cleanUrl,
    };
  }

  let type: 'image' | 'doc' | 'sheet' | 'slide' | 'pdf' | 'file' = 'file';
  if (cleanUrl.includes('/document/')) type = 'doc';
  else if (cleanUrl.includes('/spreadsheets/')) type = 'sheet';
  else if (cleanUrl.includes('/presentation/')) type = 'slide';
  else if (cleanUrl.endsWith('.pdf')) type = 'pdf';

  // Reliable Google Drive image preview sources
  const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
  const previewUrl = cleanUrl.includes('docs.google.com')
    ? `${cleanUrl.split('?')[0].replace(/\/edit.*$/, '')}/preview`
    : `https://drive.google.com/file/d/${fileId}/preview`;

  return {
    isDrive: true,
    fileId,
    fileType: type,
    previewUrl,
    imageUrl,
    directUrl: cleanUrl.includes('view') ? cleanUrl : `https://drive.google.com/file/d/${fileId}/view`,
  };
}

/**
 * Validates whether an input is a valid HTTP or HTTPS URL.
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns a friendly label for document types
 */
export function getDocumentTypeLabel(type: string): string {
  switch (type) {
    case 'drive':
      return 'Google Drive';
    case 'pdf':
      return 'PDF Document';
    case 'sheet':
      return 'Spreadsheet';
    case 'doc':
      return 'Document';
    default:
      return 'External Resource';
  }
}
