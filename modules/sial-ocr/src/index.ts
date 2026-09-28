import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

const Native = requireOptionalNativeModule<{ recognize(uri: string): Promise<string[][]> }>('SialOcr');

export const ocrSupported = Platform.OS === 'android' && !!Native;

/** On-device text recognition (ML Kit, Latin script). Returns blocks of lines. */
export async function recognize(uri: string): Promise<string[][]> {
  if (!Native) throw new Error('OCR is not available on this device');
  return Native.recognize(uri);
}
