/**
 * HTML Sanitizer Utility
 * Prevents XSS attacks in user-provided HTML content (e.g., email templates)
 */

// List of allowed HTML tags for email templates
const ALLOWED_TAGS = new Set([
  'a', 'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'div', 'span', 'img',
  'blockquote', 'pre', 'code',
]);

// List of allowed attributes per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  '*': new Set(['style', 'class', 'id']),
  'a': new Set(['href', 'target', 'rel']),
  'img': new Set(['src', 'alt', 'width', 'height']),
  'td': new Set(['colspan', 'rowspan', 'align', 'valign']),
  'th': new Set(['colspan', 'rowspan', 'align', 'valign']),
  'table': new Set(['border', 'cellpadding', 'cellspacing', 'width']),
};

// Dangerous patterns to remove
const DANGEROUS_PATTERNS = [
  // Script tags
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<script[^>]*\/?>/gi,
  // Event handlers
  /\s+on\w+\s*=\s*["'][^"']*["']/gi,
  /\s+on\w+\s*=\s*[^\s>]+/gi,
  // JavaScript URLs
  /javascript\s*:/gi,
  // Data URLs (can be used for XSS)
  /data\s*:\s*text\/html/gi,
  // VBScript URLs
  /vbscript\s*:/gi,
  // Expression (IE-specific XSS)
  /expression\s*\(/gi,
  // Dangerous tags
  /<(iframe|object|embed|form|input|button|meta|link|base)[^>]*>[\s\S]*?<\/\1>/gi,
  /<(iframe|object|embed|form|input|button|meta|link|base)[^>]*\/?>/gi,
];

/**
 * Sanitizes HTML content by removing potentially dangerous elements
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  let result = html;
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    result = result.replace(pattern, '');
  }
  
  // Additional cleanup for nested attempts
  result = result.replace(/<!--[\s\S]*?-->/g, ''); // Remove HTML comments (can hide malicious code)
  
  return result;
}

/**
 * Validates that a URL is safe (not javascript:, data:, etc.)
 * @param url - The URL to validate
 * @returns true if the URL is safe
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return true;
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  return !dangerousProtocols.some(protocol => trimmed.startsWith(protocol));
}

/**
 * Sanitizes email template content before saving
 * @param template - The email template HTML
 * @returns Sanitized template HTML
 */
export function sanitizeEmailTemplate(template: string): string {
  let result = sanitizeHtml(template);
  
  // Additional email-specific sanitization
  // Ensure all links have rel="noopener noreferrer" for security
  result = result.replace(
    /<a([^>]*)\s+target\s*=\s*["']_blank["']([^>]*)>/gi,
    (match, before, after) => {
      if (!/rel\s*=/i.test(match)) {
        return `<a${before} target="_blank" rel="noopener noreferrer"${after}>`;
      }
      return match;
    }
  );
  
  return result;
}

/**
 * Creates a safe preview of HTML by rendering it in a sandboxed context
 * @param html - The HTML to preview
 * @returns Object with sandbox attributes for iframe
 */
export function getSafePreviewSandbox(): string {
  // Restrictive sandbox that prevents script execution and form submission
  return 'allow-same-origin';
}
