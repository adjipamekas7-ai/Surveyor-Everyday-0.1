import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Di APK (Android): simpan file ke cache lalu buka menu Bagikan
 * (pilih "Simpan ke File/Drive", WhatsApp, Telegram, dll).
 * Di browser biasa: unduh seperti biasa.
 */
export async function saveOrShareFile(content: string, filename: string, type: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: filename,
      dialogTitle: 'Simpan / kirim file',
      url: written.uri,
    });
    return;
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
