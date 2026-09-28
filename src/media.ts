import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export const mediaDir = () => {
  const d = new Directory(Paths.document, 'media');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
};

/** Copy a temporary file (camera, picker, recorder) into the app's own media folder. */
export function persist(tempUri: string, id: string, fallbackExt: string) {
  const src = new File(tempUri);
  const ext = (src.extension || fallbackExt).replace(/^\./, '') || fallbackExt.replace(/^\./, '');
  const dest = new File(mediaDir(), id + '.' + ext);
  if (dest.exists) dest.delete();
  src.copySync(dest);
  return dest.uri;
}

export function removeFile(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone — nothing to clean up.
  }
}

export async function takePhoto(fromGallery: boolean): Promise<string | null | 'denied'> {
  const perm = fromGallery
    ? await ImagePicker.requestMediaLibraryPermissionsAsync()
    : await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return 'denied';
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, exif: false };
  const res = fromGallery ? await ImagePicker.launchImageLibraryAsync(opts) : await ImagePicker.launchCameraAsync(opts);
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}

export const fmtDuration = (sec: number | null | undefined) => {
  const s = Math.max(0, Math.round(sec ?? 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
