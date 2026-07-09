import { axiosClient } from '../api/client.js';

function resolveFilename(response, fallback) {
  const disposition = response.headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

export async function downloadPdf(url, filename = 'clinic-booking.pdf') {
  const response = await axiosClient.request({
    url,
    method: 'GET',
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = resolveFilename(response, filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
