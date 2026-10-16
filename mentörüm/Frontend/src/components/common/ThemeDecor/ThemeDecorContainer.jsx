import React from 'react';
import { useUIStore } from '../../../store/uiStore';
import SkyDecor from './SkyDecor';
import OceanDecor from './OceanDecor';
import NatureDecor from './NatureDecor';
import CyberDecor from './CyberDecor';
import FormalDecor from './FormalDecor';

export default function ThemeDecorContainer() {
  const { themeStyle } = useUIStore();

  return (
    <>
      {/* Güneş, Ay ve Yıldızlar tüm temalarda daima mevcuttur */}
      <SkyDecor />

      {themeStyle === 'ocean' && <OceanDecor />}
      {themeStyle === 'nature' && <NatureDecor />}
      {themeStyle === 'cyber' && <CyberDecor />}
      {themeStyle === 'formal' && <FormalDecor />}
    </>
  );
}

