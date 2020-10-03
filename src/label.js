import { Shape } from './shape';

export class Label extends Shape {

  static SEL_COLOR = '#e91e63';
  static SEL_PAD = 4;
  static SEL_ROUNDING_RADIUS = 4;

  constructor(owner, text, display, font) {
    super(owner.diagram.canvas.getContext("2d"), owner.diagram.options);
    this.owner = owner;
    this.diagram = owner.diagram;
    this.text = text;
    this.display = display; // just x, y except for process owner
    this.font = font;
    this.workflowItem = owner.workflowItem;
    this.isLabel = true;
  }

  draw(color) {
    if (this.font) {
      this.diagram.context.font = this.font.FONT;
    }
    this.diagram.context.fillStyle = color ? color : this.diagram.options.DEFAULT_COLOR;
    this.diagram.context.clearRect(this.display.x, this.display.y, this.display.w, this.display.h);
    this.diagram.context.fillText(this.text, this.display.x, this.display.y + this.display.h / 1.33);
    this.diagram.context.font = this.diagram.options.DEFAULT_FONT.FONT;
    if (this.subtext) {
      this.diagram.context.fillStyle = this.diagram.options.META_COLOR;
      this.diagram.context.fillText(this.subtext, this.display.x, this.display.y + this.display.h * 1.33);
    }
    this.diagram.context.fillStyle = this.diagram.options.DEFAULT_COLOR;
  }

  prepareDisplay() {
    if (this.font) {
      this.diagram.context.font = this.font.FONT;
    }
    var textMetrics = this.diagram.context.measureText(this.text);
    this.display.w = textMetrics.width;
    this.display.h = this.font.SIZE;
    var maxDisplay = { w: this.display.w + this.display.x, h: this.display.h + this.display.y };
    this.diagram.context.font = this.diagram.options.DEFAULT_FONT.FONT;
    return maxDisplay;
  }

  select() {
    var x = this.display.x - Label.SEL_PAD;
    var y = this.display.y - Label.SEL_PAD;
    var w = this.display.w + Label.SEL_PAD + 2;
    var h = this.display.h + Label.SEL_PAD;
    this.diagram.rect(x, y, w, h, Label.SEL_COLOR, null, Label.SEL_ROUNDING_RADIUS);
  }

  move(deltaX, deltaY) {
    var x = this.display.x + deltaX;
    var y = this.display.y + deltaY;
    this.setDisplayAttr(x, y, Math.round(this.display.w), this.display.h);
  }
}

