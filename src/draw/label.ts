import { Display } from './display';
import { Diagram } from './diagram';
import { Shape } from './shape';
import { Font } from '../style/font';
import { Link } from './link';

export class Label extends Shape {

  diagram: Diagram;
  subtext?: string;
  instances = null;

  get type() { return 'label'; }

  constructor(readonly owner: Diagram | Link, readonly text: string, readonly display: Display, readonly font: Font) {
    super(owner.diagram.canvas.getContext("2d"), owner.diagram.options, owner.flowElement);
    this.diagram = owner.diagram;
    this.text = text;
    this.display = display; // just x, y except for flow owner
    this.font = font;
  }

  draw(color?: string) {
    if (this.font) {
      this.diagram.context.font = this.font.name;
    }
    this.diagram.context.fillStyle = color ? color : this.diagram.options.defaultColor;
    this.diagram.context.clearRect(this.display.x, this.display.y, this.display.w, this.display.h);
    this.diagram.context.fillText(this.text, this.display.x, this.display.y + this.display.h / 1.33);
    this.diagram.context.font = this.diagram.options.defaultFont.name;
    if (this.subtext) {
      this.diagram.context.fillStyle = this.diagram.options.meta.color;
      this.diagram.context.fillText(this.subtext, this.display.x, this.display.y + this.display.h * 1.5);
    }
    this.diagram.context.fillStyle = this.diagram.options.defaultColor;
  }

  prepareDisplay(): Display {
    if (this.font) {
      this.diagram.context.font = this.font.name;
    }
    const textMetrics = this.diagram.context.measureText(this.text);
    this.display.w = textMetrics.width;
    this.display.h = this.font.size;
    const maxDisplay = { w: this.display.w + this.display.x, h: this.display.h + this.display.y };
    this.diagram.context.font = this.diagram.options.defaultFont.name;
    return maxDisplay;
  }

  select() {
    const x = this.display.x - this.diagram.options.label.select.padding;
    const y = this.display.y - this.diagram.options.label.select.padding;
    const w = this.display.w + this.diagram.options.label.select.padding + 2;
    const h = this.display.h + this.diagram.options.label.select.padding;
    this.diagram.rect(x, y, w, h, this.diagram.options.label.select.color, this.diagram.options.label.select.roundingRadius);
  }

  move(deltaX: number, deltaY: number) {
    const x = this.display.x + deltaX;
    const y = this.display.y + deltaY;
    this.setDisplayAttr(x, y, Math.round(this.display.w), this.display.h);
  }

  resize(_x: number, _y: number, deltaX: number, deltaY: number) {
    // not applicable
  }

}

