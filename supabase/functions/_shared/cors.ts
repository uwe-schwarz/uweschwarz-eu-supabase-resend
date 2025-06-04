// Allowed origins list
const allowedOrigins = [
  'https://uweschwarz.eu',
  'https://uweschwarz-eu.pages.dev',
  // Wildcard pattern for subdomains
  /^https:\/\/.*\.uweschwarz-eu\.pages\.dev$/
];

// Function to check if an origin is allowed
function isOriginAllowed(origin: string): boolean {
  return allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return origin === allowed;
    } else if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return false;
  });
}

// Function to get CORS headers based on request origin
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  
  // Check if origin is allowed
  const allowedOrigin = isOriginAllowed(origin) ? origin : 'https://uweschwarz.eu';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

// Keep the old export for backwards compatibility (using default origin)
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://uweschwarz.eu',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};