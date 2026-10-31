/** Sprite pixel-art: `.` = trasparente, ogni altro carattere è una chiave di `palette`. */
export interface Sprite {
  palette: Record<string, string>;
  pixels: string[];
}

export interface Character {
  id: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  unlockLevel: number;
  sprite: Sprite;
}

export interface Enemy {
  id: string;
  name: string;
  description: string;
  sprite: Sprite;
}
