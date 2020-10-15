import { Shape } from './shape';

export class Label extends Shape {

  constructor(owner, text, display, font) {
    super(owner.diagram.canvas.getContext("2d"), owner.diagram.options);
    this.owner = owner;
    this.diagram = owner.diagram;
    this.text = text;
    this.display = display; // just x, y except for flow owner
    this.font = font;
    this.workflowItem = owner.workflowItem;
    this.isLabel = true;
  }

  draw(color) {
    if (this.font) {
      this.diagram.context.font = this.font.name;
    }
    this.diagram.context.fillStyle = color ? color : this.diagram.options.defaultColor;
    this.diagram.context.clearRect(this.display.x, this.display.y, this.display.w, this.display.h);
    this.diagram.context.fillText(this.text, this.display.x, this.display.y + this.display.h / 1.33);
    this.diagram.context.font = this.diagram.options.defaultFont.name;
    if (this.subtext) {
      this.diagram.context.fillStyle = this.diagram.options.meta.color;
      this.diagram.context.fillText(this.subtext, this.display.x, this.display.y + this.display.h * 1.33);
    }
    this.diagram.context.fillStyle = this.diagram.options.defaultColor;
  }

  prepareDisplay() {
    if (this.font) {
      this.diagram.context.font = this.font.name;
    }
    var textMetrics = this.diagram.context.measureText(this.text);
    this.display.w = textMetrics.width;
    this.display.h = this.font.size;
    var maxDisplay = { w: this.display.w + this.display.x, h: this.display.h + this.display.y };
    this.diagram.context.font = this.diagram.options.defaultFont.name;
    return maxDisplay;
  }

  select() {
    var x = this.display.x - this.diagram.label.select.padding;
    var y = this.display.y - this.diagram.label.select.padding;
    var w = this.display.w + this.diagram.label.select.padding + 2;
    var h = this.display.h + this.diagram.label.select.padding;
    this.diagram.rect(x, y, w, h, this.diagram.options.label.select.color, this.diagram.options.label.select.roundingRadius);
  }

  move(deltaX, deltaY) {
    var x = this.display.x + deltaX;
    var y = this.display.y + deltaY;
    this.setDisplayAttr(x, y, Math.round(this.display.w), this.display.h);
  }
}

