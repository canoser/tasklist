import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const FOLDERS = {
    GELENLER: 'Mentorum/dosyalar/gelenler',
    GIDENLER: 'Mentorum/dosyalar/gidenler',
};

export async function ensureFolders() {
    if (!Capacitor.isNativePlatform()) return;
    for (const path of [FOLDERS.GELENLER, FOLDERS.GIDENLER]) {
        try {
            await Filesystem.mkdir({ path, directory: Directory.Documents, recursive: true });
        } catch {
            // zaten var
        }
    }
}

export async function saveFile(relPath, base64) {
    if (!Capacitor.isNativePlatform()) return relPath;
    await ensureFolders();
    await Filesystem.writeFile({ path: relPath, data: base64, directory: Directory.Documents });
    return relPath;
}

export async function readFileIfExists(relPath) {
    if (!Capacitor.isNativePlatform()) return null;
    try {
        const res = await Filesystem.readFile({ path: relPath, directory: Directory.Documents });
        return res.data;
    } catch {
        return null;
    }
}
