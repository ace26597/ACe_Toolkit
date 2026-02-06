// CSRF protection header - required on all state-changing requests (POST/PUT/DELETE/PATCH)
export const CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };

// Dynamic API URL - works with multiple domains (orpheuscore.uk, ultronsolar.in, localhost)
export const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side - use env var
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Map frontend domains to API domains
  if (hostname === 'orpheuscore.uk' || hostname === 'www.orpheuscore.uk' || hostname === 'clawd.orpheuscore.uk') {
    return `${protocol}//api.orpheuscore.uk`;
  }
  if (hostname === 'ai.ultronsolar.in') {
    return `${protocol}//api.ultronsolar.in`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  // Check if hostname is an IP address (local network access)
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    // For IP addresses, use port 8000 instead of api subdomain
    return `${protocol}//${hostname}:8000`;
  }

  // Fallback: try api subdomain of current host
  return `${protocol}//api.${hostname}`;
};
