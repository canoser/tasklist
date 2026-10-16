import React from 'react';
import { useUIStore } from '../../../store/uiStore';
import SkyDecor from './SkyDecor';
import OceanDecor from './OceanDecor';
import NatureDecor from './NatureDecor';

export default function ThemeDecorContainer() {
  const { themeStyle } = useUIStore();

  return (
    <>
      {/* Güneş, Ay ve Yıldızlar tüm temalarda (Classic, Ocean, Nature) daima mevcuttur */}
      <SkyDecor />

      {themeStyle === 'ocean' && <OceanDecor />}
      {themeStyle === 'nature' && <NatureDecor />}
    </>
  );
}

