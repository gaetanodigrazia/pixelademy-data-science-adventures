import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Sprite } from '../../core/models/character.model';

@Component({
  selector: 'app-sprite-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="sprite"
      [attr.viewBox]="'0 0 ' + cols() + ' ' + rows()"
      [style.width.px]="cols() * scale()"
      [style.height.px]="rows() * scale()"
      shape-rendering="crispEdges"
      role="img"
      [attr.aria-label]="label()"
    >
      @for (c of cells(); track c.key) {
        <rect [attr.x]="c.x" [attr.y]="c.y" width="1" height="1" [attr.fill]="c.fill" />
      }
    </svg>
  `,
  styles: `:host { display: inline-block; line-height: 0; } .sprite { image-rendering: pixelated; }`,
})
export class SpriteView {
  readonly sprite = input.required<Sprite>();
  readonly scale = input(6);
  readonly label = input('Sprite pixel-art');

  protected readonly rows = computed(() => this.sprite().pixels.length);
  protected readonly cols = computed(() => this.sprite().pixels[0]?.length ?? 0);
  protected readonly cells = computed(() => {
    const { pixels, palette } = this.sprite();
    const out: { key: string; x: number; y: number; fill: string }[] = [];
    pixels.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== '.' && palette[ch]) out.push({ key: `${x}-${y}`, x, y, fill: palette[ch] });
      }),
    );
    return out;
  });
}
