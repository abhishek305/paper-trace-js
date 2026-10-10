import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

const PREFIX = '#code=';

export const encodeShareHash = (source: string): string => PREFIX + compressToEncodedURIComponent(source);

export function decodeShareHash(hash: string): string | null {
  if (!hash.startsWith(PREFIX)) return null;
  try {
    return decompressFromEncodedURIComponent(hash.slice(PREFIX.length));
  } catch {
    return null;
  }
}
