import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Material Symbols glyph. Usage: <ui-icon name="visibility" /> */
@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="material-symbols-outlined"
    aria-hidden="true"
    [style.font-size]="size() ? size() + 'px' : 'inherit'"
    style="font-variation-settings: 'wght' 300; font-weight: 300;"
  >{{ name() }}</span>`,
  host: { class: 'inline-flex' },
})
export class UiIcon {
  readonly name = input.required<string>();
  readonly size = input<number>();
}
