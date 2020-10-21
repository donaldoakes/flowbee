import { FlowElement } from '../model/element';
import { Diagram } from './diagram';
import { SelectObj } from './selection';
import { Shape } from './shape';

export class Marquee extends Shape {

  flowElement: FlowElement;

  constructor(readonly diagram: Diagram) {
    super(diagram.canvas.getContext("2d"), diagram.options);
    this.flowElement = {
      attributes: { display: '{ x: 0, y: 0, w: 0, h: 0 }' }
    }; // dummy to hold attrs
  }

  draw() {
    this.diagram.rect(
      this.display.x,
      this.display.y,
      this.display.w,
      this.display.h,
      this.diagram.options.marquee.outlineColor,
      this.diagram.options.marquee.roundingRadius
    );
  }

  prepareDisplay() {
    this.display = this.getDisplay();
    return this.display;
  }

  start(x: number, y: number) {
    this.setDisplayAttr(x, y, 2, 2);
    this.display = this.getDisplay();
  }

  resize(x: number, y: number, deltaX: number, deltaY: number) {
    let newX = deltaX > 0 ? x : x + deltaX;
    if (newX < 0) {
      newX = 0;
    }
    let newY = deltaY > 0 ? y : y + deltaY;
    if (newY < 0) {
      newY = 0;
    }
    const newW = deltaX > 0 ? deltaX : -deltaX;
    const newH = deltaY > 0 ? deltaY : -deltaY;

    this.setDisplayAttr(newX, newY, newW, newH);
  }

  getAnchor(_x: number, _y: number): number {
    return -1;
  }

  getSelectObjs(): SelectObj[] {
    const selObjs: SelectObj[] = [];
    for (let i = 0; i < this.diagram.steps.length; i++) {
      const step = this.diagram.steps[i];
      if (this.isContained(step)) {
        selObjs.push(step);
      }
    }
    for (let i = 0; i < this.diagram.subflows.length; i++) {
      const subflow = this.diagram.subflows[i];
      if (this.isContained(subflow)) {
        selObjs.push(subflow);
      }
    }
    for (let i = 0; i < this.diagram.notes.length; i++) {
      const note = this.diagram.notes[i];
      if (this.isContained(note)) {
        selObjs.push(note);
      }
    }
    return selObjs;
  }

  isContained(shape: Shape): boolean {
    return shape.display.x >= this.display.x && shape.display.y > this.display.y &&
      shape.display.x + shape.display.w <= this.display.x + this.display.w &&
      shape.display.y + shape.display.h <= this.display.y + this.display.h;
  }
}
