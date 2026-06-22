import api from './axios';

function filenameFromDisposition(
  disposition: string | undefined,
  fallback: string,
): string {
  if (!disposition) {
    return fallback;
  }

  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return match?.[1] ?? fallback;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function downloadWorkbook(path: string, fallbackName: string): Promise<void> {
  const response = await api.get<Blob>(path, { responseType: 'blob' });
  const filename = filenameFromDisposition(
    response.headers['content-disposition'],
    fallbackName,
  );
  triggerBrowserDownload(response.data, filename);
}

export function exportCustomersReport(): Promise<void> {
  return downloadWorkbook(
    '/reports/customers-export',
    'customers-detailed-report.xlsx',
  );
}

export function exportSuppliersReport(): Promise<void> {
  return downloadWorkbook(
    '/reports/suppliers-export',
    'suppliers-detailed-report.xlsx',
  );
}
