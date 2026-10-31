import { Sprite } from '../../core/models/character.model';

// Convenzione: `.` trasparente; h capelli, s pelle, e occhi, c giacca, a accessorio,
// b cintura, p pantaloni, o stivali.
const skin = { s: '#f2c9a0', e: '#1b1b2f', b: '#ffd23f', o: '#3a2a22' };

export const AURA_SPRITE: Sprite = {
  palette: { ...skin, h: '#bfe6ff', c: '#4aa3ff', a: '#ffffff', p: '#2b4a8c' },
  pixels: [
    '....aaaa....',
    '...aaaaaa...',
    '...hssssh...',
    '...sesses...',
    '....ssss....',
    '..cccccccc..',
    '.ccaccccacc.',
    '.sccccccccs.',
    '..cccbbccc..',
    '..ccccccc...',
    '...pp..pp...',
    '...pp..pp...',
    '..oo....oo..',
  ],
};

export const NILO_SPRITE: Sprite = {
  palette: { ...skin, h: '#7a4a2a', c: '#ff9f1c', a: '#e63946', p: '#3d405b' },
  pixels: [
    '...aaaaaa...',
    '..aaaaaaaa..',
    '..hssssssh..',
    '...sesses...',
    '....ssss....',
    '..cccccccc..',
    '.cccccccccc.',
    '.scccccccacs',
    '..cccbbccca.',
    '..cccccccc..',
    '...pp..pp...',
    '...pp..pp...',
    '..oo....oo..',
  ],
};

export const CORA_SPRITE: Sprite = {
  palette: { ...skin, h: '#0b3d4a', c: '#1fb5a8', a: '#9ff3e6', p: '#14507a' },
  pixels: [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '.hhssssssh..',
    '.hhsesseshh.',
    '.hh.ssss.hh.',
    '..cccccccc..',
    '.ccacccccac.',
    '.sccccccccs.',
    '..cccbbccc..',
    '..cccccccc..',
    '...pp..pp...',
    '...pp..pp...',
    '..oo....oo..',
  ],
};

export const TEO_SPRITE: Sprite = {
  palette: { ...skin, h: '#2d2d2d', c: '#ffd23f', a: '#fff4a3', p: '#444a6d' },
  pixels: [
    '....aaaa....',
    '...hhhhhh...',
    '..hhhhhhhh..',
    '...sesses...',
    '....ssss....',
    '..cccccccc..',
    '.cccaccaccc.',
    '.sccccccccs.',
    '..cccbbccc..',
    '..cccccccc..',
    '...pp..pp...',
    '...pp..pp...',
    '..oo....oo..',
  ],
};

export const CLOUD_ENEMY_SPRITE: Sprite = {
  palette: { w: '#e8f1ff', e: '#1b1b2f', m: '#ff6b6b', z: '#4aa3ff' },
  pixels: [
    '...wwww...',
    '..wwwwwww.',
    '.wwewwewww',
    'wwwwwwwwww',
    'wwwwmmwwww',
    '.wwwwwwww.',
    '..z..z..z.',
  ],
};

export const JAM_ENEMY_SPRITE: Sprite = {
  palette: { r: '#e63946', w: '#ffffff', e: '#1b1b2f', y: '#ffd23f', k: '#2b2d42' },
  pixels: [
    '..rrrrrr..',
    '.rrrrrrrr.',
    '.rwerrwer.',
    'rrrrrrrrrr',
    'rrkkkkkkrr',
    'rrrrrrrrrr',
    '.yk....ky.',
  ],
};

export const WAVE_ENEMY_SPRITE: Sprite = {
  palette: { b: '#1d70c9', l: '#9ad0ff', e: '#ffffff', d: '#0b2f5c', k: '#1b1b2f' },
  pixels: [
    '....lll...',
    '..llbbbl..',
    '.lbbbbbbl.',
    'lbbekbekbl',
    'lbbbbbbbbb',
    'bbdbbbdbbb',
    'dbbdbbbdbb',
  ],
};

export const LEAK_ENEMY_SPRITE: Sprite = {
  palette: { y: '#ffd23f', o: '#ff9f1c', e: '#1b1b2f', k: '#444a6d', r: '#e63946' },
  pixels: [
    '....yy....',
    '...yyoy...',
    '..yyyooy..',
    '.yyeyyeyy.',
    '.yyyyyyyy.',
    '..yykkyy..',
    '...r..r...',
  ],
};
