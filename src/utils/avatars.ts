export interface AvatarDefinition {
  id: string;
  name: string;
  svg: string;
}

export const RETRO_AVATARS: AvatarDefinition[] = [
  {
    id: 'retro_coder',
    name: 'Retro Coder',
    svg: `<svg viewBox="0 0 16 16" width="100%" height="100%" style="image-rendering:pixelated;"><rect width="16" height="16" fill="#000080"/><rect x="2" y="2" width="12" height="12" fill="#c0c0c0"/><rect x="4" y="3" width="8" height="6" fill="#808080"/><rect x="5" y="4" width="6" height="4" fill="#00ff00"/><rect x="6" y="5" width="2" height="2" fill="#ffffff"/><rect x="3" y="10" width="10" height="3" fill="#000000"/><rect x="5" y="11" width="6" height="1" fill="#ffff00"/></svg>`
  },
  {
    id: 'cyber_punk',
    name: 'Cyber Punk',
    svg: `<svg viewBox="0 0 16 16" width="100%" height="100%" style="image-rendering:pixelated;"><rect width="16" height="16" fill="#800080"/><rect x="2" y="2" width="12" height="12" fill="#ff00ff"/><rect x="4" y="3" width="8" height="5" fill="#00ffff"/><rect x="5" y="4" width="2" height="2" fill="#000"/><rect x="9" y="4" width="2" height="2" fill="#000"/><rect x="4" y="9" width="8" height="3" fill="#ffff00"/><path d="M4,12 H12 V14 H4 Z" fill="#ff0000"/></svg>`
  },
  {
    id: 'classic_nerd',
    name: 'Internet Explorer',
    svg: `<svg viewBox="0 0 16 16" width="100%" height="100%" style="image-rendering:pixelated;"><rect width="16" height="16" fill="#008080"/><rect x="3" y="3" width="10" height="10" fill="#ffffcc"/><rect x="4" y="4" width="3" height="3" fill="#0000ff"/><rect x="9" y="4" width="3" height="3" fill="#0000ff"/><rect x="7" y="6" width="2" height="3" fill="#ff0000"/><rect x="4" y="10" width="8" height="1" fill="#000000"/></svg>`
  },
  {
    id: 'ascii_cat',
    name: 'ASCII Cat',
    svg: `<svg viewBox="0 0 16 16" width="100%" height="100%" style="image-rendering:pixelated;"><rect width="16" height="16" fill="#808080"/><rect x="3" y="2" width="2" height="2" fill="#000"/><rect x="11" y="2" width="2" height="2" fill="#000"/><rect x="3" y="4" width="10" height="8" fill="#fff"/><rect x="5" y="6" width="2" height="2" fill="#00f"/><rect x="9" y="6" width="2" height="2" fill="#00f"/><rect x="7" y="8" width="2" height="1" fill="#ff00ff"/><rect x="5" y="10" width="6" height="1" fill="#000"/></svg>`
  },
  {
    id: 'ms_wizard',
    name: 'mIRC Wizard',
    svg: `<svg viewBox="0 0 16 16" width="100%" height="100%" style="image-rendering:pixelated;"><rect width="16" height="16" fill="#000033"/><path d="M8,1 L14,7 L2,7 Z" fill="#0000ff"/><rect x="3" y="7" width="10" height="7" fill="#ffff00"/><rect x="5" y="9" width="2" height="2" fill="#000"/><rect x="9" y="9" width="2" height="2" fill="#000"/><rect x="6" y="12" width="4" height="1" fill="#ff0000"/></svg>`
  },
  {
    id: 'floppy_disk',
    name: 'Floppy Disk',
    svg: `<svg viewBox="0 0 16 16" width="100%" height="100%" style="image-rendering:pixelated;"><rect width="16" height="16" fill="#333333"/><rect x="1" y="1" width="14" height="14" fill="#000099"/><rect x="3" y="1" width="10" height="4" fill="#ffffff"/><rect x="4" y="2" width="3" height="2" fill="#c0c0c0"/><rect x="3" y="7" width="10" height="8" fill="#ffffff"/><rect x="5" y="9" width="6" height="4" fill="#ff0000"/></svg>`
  }
];

export function getAvatarSvg(id: string): string {
  const found = RETRO_AVATARS.find(a => a.id === id);
  return found ? found.svg : RETRO_AVATARS[0].svg;
}
