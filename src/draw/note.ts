import { Shape } from './shape';
import { Diagram } from './diagram';
import { Note as NoteElement } from '../model/note';
import { Display } from './display';

export class Note extends Shape {

  instances = null; // TODO not applicable (needed by Diagram.isInstanceEditable())

  constructor(readonly diagram: Diagram, readonly note: NoteElement) {
    super(diagram.canvas.getContext("2d"), diagram.options, note);
    this.flowElement = { ...note, type: 'note' };
  }

  draw() {
    this.diagram.rect(
      this.display.x,
      this.display.y,
      this.display.w,
      this.display.h,
      this.diagram.options.note.outlineColor,
      this.diagram.options.note.roundingRadius,
      this.diagram.options.note.fillColor
    );

    if (this.note.text) {
      const lines = this.note.text.replace(/\r/g, '').split(/\n/);
      this.diagram.context.font = this.diagram.options.note.font.name;
      this.diagram.context.fillStyle = this.diagram.options.note.textColor ? this.diagram.options.note.textColor : this.diagram.options.defaultColor;
      for (let i = 0; i < lines.length; i++) {
        this.diagram.context.fillText(lines[i], this.display.x + 4, this.display.y + 2 + this.diagram.options.note.font.size * (i + 1));
      }
      this.diagram.context.fillStyle = this.diagram.options.defaultColor;
    }
  }

  prepareDisplay(): Display {
    const maxDisplay = { w: 0, h: 0 };
    this.display = this.getDisplay();

    // boundaries
    if (this.display.x + this.display.w > maxDisplay.w) {
      maxDisplay.w = this.display.x + this.display.w;
    }
    if (this.display.y + this.display.h > maxDisplay.h) {
      maxDisplay.h = this.display.y + this.display.h;
    }

    return maxDisplay;
  }

  move(deltaX: number, deltaY: number) {
    const x = this.display.x + deltaX;
    const y = this.display.y + deltaY;
    this.setDisplayAttr(x, y, this.display.w, this.display.h);
  }

  resize(x: number, y: number, deltaX: number, deltaY: number, limDisplay?: Display) {
    const display = this.resizeDisplay(x, y, deltaX, deltaY, this.diagram.options.note.minSize, limDisplay);
    this.setDisplayAttr(display.x, display.y, display.w, display.h);
  }

  static create(diagram: Diagram, idNum: number, x: number, y: number): Note {
    const noteElement = Note.noteElement(diagram, idNum, x, y);
    const note = new Note(diagram, noteElement);
    const disp = note.getDisplay();
    note.display = { x: disp.x, y: disp.y, w: disp.w, h: disp.h };
    return note;
  }

  static noteElement(_diagram: Diagram, idNum: number, x: number, y: number): NoteElement {
    const w = 200;
    const h = 60;
    const noteX = Math.max(1, x - w / 2);
    const noteY = Math.max(1, y - h / 2);
    return {
      id: 'n' + idNum,
      text: '',
      attributes: { display: 'x=' + noteX + ',y=' + noteY + ',w=' + w + ',h=' + h },
      type: 'note'
    };
  }
}

