import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

function getOrCreateWebUid() {
    let uid = localStorage.getItem('mentorum_device_uid');
    if (!uid) {
        uid = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'web-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('mentorum_device_uid', uid);
    }
    return uid;
}

export async function getDeviceId() {
    if (Capacitor.isNativePlatform()) {
        const info = await Device.getId();
        return info.identifier || 'native-' + Date.now();
    }
    return getOrCreateWebUid();
}

export async function getPlatform() {
    if (Capacitor.isNativePlatform()) {
        const info = await Device.getInfo();
        return info.platform === 'ios' ? 'ios' : 'android';
    }
    return 'web';
}

export async function getDeviceLabel() {
    if (Capacitor.isNativePlatform()) {
        const info = await Device.getInfo();
        const label = `${info.manufacturer || ''} ${info.model || ''}`.trim();
        return label || 'Cihaz';
    }
    return 'Tarayıcı (Web)';
}

export async function registerCurrentDevice() {
    const deviceUid = await getDeviceId();
    const platform = await getPlatform();
    const label = await getDeviceLabel();
    return { deviceUid, platform, label };
}

export function isNative() {
    return Capacitor.isNativePlatform();
}
