
/**
 * YOKE Security Utilities - Phase 23: Cryptographic Fortress
 */

export const sanitizeInput = (text: string): string => {
  // Remove potentially malicious script tags or dangerous HTML
  return text
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    .replace(/on\w+="[^"]*"/gim, "")
    .replace(/javascript:/gim, "")
    .trim();
};

export const sanitizeOutput = (text: string): string => {
  // Basic HTML entity encoding for output safety
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const detectDebugger = (): boolean => {
  // Simple check for debugger presence (simulated protection)
  const startTime = performance.now();
  debugger;
  const endTime = performance.now();
  return endTime - startTime > 100;
};
