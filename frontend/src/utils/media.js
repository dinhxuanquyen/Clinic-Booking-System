const DEFAULT_API_BASE_URL = 'http://localhost:5000';

function getApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_URL;
  const source = configuredApiUrl ? String(configuredApiUrl).trim() : DEFAULT_API_BASE_URL;
  const baseUrl = source.replace(/\/api\/?$/, '').replace(/\/$/, '');

  return baseUrl || DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = getApiBaseUrl();

export function resolveMediaUrl(path, placeholder = '/placeholder-clinic.svg') {
  if (!path) return placeholder;

  const value = String(path).trim();
  if (!value) return placeholder;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/uploads')) return `${API_BASE_URL}${value}`;
  if (value.startsWith('/placeholder')) return value;

  return value;
}

export function useImageFallback(event, placeholder) {
  const image = event.currentTarget;
  if (image.getAttribute('src') === placeholder || image.src.endsWith(placeholder)) return;

  console.warn('Image failed to load:', image.src);
  image.src = placeholder;
}
