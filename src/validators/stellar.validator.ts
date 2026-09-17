/**
 * Regular expression for validating Stellar public key address format.
 * Format requirements:
 * - Starts with 'G'
 * - Exactly 56 characters long
 * - Contains only uppercase alphanumeric characters (A-Z, 0-9)
 */
export const STELLAR_ADDRESS_REGEX = /^G[A-Z0-9]{55}$/;

/**
 * Validates whether a given value follows the Stellar public key address format.
 *
 * @param address - The address value to validate
 * @returns boolean indicating if the address matches the Stellar public key format
 */
export function isValidStellarAddress(address: unknown): boolean {
  if (typeof address !== 'string') {
    return false;
  }
  return STELLAR_ADDRESS_REGEX.test(address);
}

/**
 * Alias for isValidStellarAddress.
 *
 * @param address - The address value to validate
 * @returns boolean indicating if the address matches the Stellar public key format
 */
export function validateStellarAddress(address: unknown): boolean {
  return isValidStellarAddress(address);
}
