import { FlowElement } from '../model/element';
import { Display, parseDisplay } from './display';
import { DrawingOptions } from './options';

/**
 * Base class for rectangular diagram elements
 */
export class Shape {

  display: Display;
  flowElement?: FlowElement;

  constructor(
    readonly context: CanvasRenderingContext2D,
    readonly options: DrawingOptions,
    flowElement?: FlowElement) {
      this.flowElement = flowElement;
  }

  get type(): string { return this.flowElement.type; }
  get id(): string { return this.flowElement.id; }

  // get a display object from attribute value
  getDisplay(): Display {
    return parseDisplay(this.flowElement);
  }

  setDisplayAttr(
    x: number = this.display.x,
    y: number = this.display.y,
    w: number = this.display.w,
    h: number = this.display.h
  ) {
    let attr = 'x=' + x + ',y=' + y;
    if (w) {
      attr += ',w=' + w + ',h=' + h;
    }
    this.flowElement.attributes.display = attr;
  }

  isHover(x: number, y: number) {
    return x >= this.display.x && x <= this.display.x + this.display.w &&
      y >= this.display.y && y <= this.display.y + this.display.h;
  }

  select() {
    const display = this.display;
    this.context.fillStyle = this.options.anchor.color;
    const s = this.options.anchor.width;
    this.context.fillRect(display.x - s, display.y - s, s * 2, s * 2);
    this.context.fillRect(display.x + display.w - s, display.y - s, s * 2, s * 2);
    this.context.fillRect(display.x + display.w - 2, display.y + display.h - s, s * 2, s * 2);
    this.context.fillRect(display.x - 2, display.y + display.h - s, s * 2, s * 2);
    this.context.fillStyle = this.options.defaultColor;
  }

  getAnchor(x: number, y: number): number {
    if (Math.abs(this.display.x - x) <= this.options.anchor.hitWidth && Math.abs(this.display.y - y) <= this.options.anchor.hitWidth) {
      return 0;
    }
    else if (Math.abs(this.display.x + this.display.w - x) <= this.options.anchor.hitWidth && Math.abs(this.display.y - y) <= this.options.anchor.hitWidth) {
      return 1;
    }
    else if (Math.abs(this.display.x + this.display.w - x) <= this.options.anchor.hitWidth && Math.abs(this.display.y + this.display.h - y) <= this.options.anchor.hitWidth) {
      return 2;
    }
    else if (Math.abs(this.display.x - x) <= this.options.anchor.hitWidth && Math.abs(this.display.y + this.display.h - y) <= this.options.anchor.hitWidth) {
      return 3;
    }
    else {
      return -1;
    }
  }

  resizeDisplay(x: number, y: number, deltaX: number, deltaY: number, minWidth: number, minHeight: number, limDisplay?: Display) {
    const anchor = this.getAnchor(x, y);
    const display = { x: this.display.x, y: this.display.y, w: this.display.w, h: this.display.h };
    let t1: number, t2: number;
    if (anchor === 0) {
      t1 = display.x + display.w;
      t2 = display.y + display.h;
      display.x = x + deltaX;
      display.y = y + deltaY;
      if (t1 - display.x < minWidth) {
        display.x = t1 - minWidth;
      }
      if (t2 - display.y < minHeight) {
        display.y = t2 - minHeight;
      }
      display.w = t1 - display.x;
      display.h = t2 - display.y;
    }
    else if (anchor === 1) {
      t2 = display.y + display.h;
      display.y = y + deltaY;
      if (t2 - display.y < minHeight) {
        display.y = t2 - minHeight;
      }
      display.w = x - (display.x - deltaX);
      if (display.w < minWidth) {
        display.w = minWidth;
      }
      display.h = t2 - display.y;
    }
    else if (anchor === 2) {
      display.w = x - (display.x - deltaX);
      display.h = y - (display.y - deltaY);
      if (display.w < minWidth) {
        display.w = minWidth;
      }
      if (display.h < minHeight) {
        display.h = minHeight;
      }
    }
    else if (anchor === 3) {
      t1 = display.x + display.w;
      display.x = x + deltaX;
      if (t1 - display.x < minWidth) {
        display.x = t1 - minWidth;
      }
      display.w = t1 - display.x;
      display.h = y - (display.y - deltaY);
      if (display.h < minHeight) {
        display.h = minHeight;
      }
    }

    if (limDisplay) {
      if (display.x < limDisplay.x) {
        display.x = limDisplay.x;
      }
      if (display.x + display.w > limDisplay.x + limDisplay.w) {
        display.w = limDisplay.x + limDisplay.w - display.x;
      }
      if (display.y < limDisplay.y) {
        display.y = limDisplay.y;
      }
      if (display.y + display.h > limDisplay.y + limDisplay.h) {
        display.h = limDisplay.y + limDisplay.h - display.y;
      }
    }

    return display;
  }

  static getAttr(display: Display): string {
    let attr = 'x=' + display.x + ',y=' + display.y;
    if (display.w) {
      attr += ',w=' + display.w + ',h=' + display.h;
    }
    return attr;
  }
}
