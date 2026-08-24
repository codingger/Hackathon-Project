// Guaranteed 10-digit numeric ID generator for PS7 spec compliance
let counter = 100;

export function generateId(prefix = '2') {
  // Generate prefix (1 digit) + 8 digit random timestamp hash + 1 digit counter modulo = 10 digits numeric string
  const base = Math.floor(10000000 + Math.random() * 90000000).toString();
  const suffix = (counter++ % 10).toString();
  const rawId = `${prefix}${base}${suffix}`;
  
  // Ensure exactly 10 digits
  return rawId.slice(0, 10).padStart(10, '2');
}
