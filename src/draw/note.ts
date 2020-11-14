import { Shape } from './shape';
import { Diagram } from './diagram';
import { Note as NoteElement } from '../model/note';
import { Display } from './display';
import { Edit } from './edit';

export class Note extends Shape {

  instances = null; // TODO not applicable (needed by Diagram.isInstanceEditable())

  constructor(readonly diagram: Diagram, readonly note: NoteElement) {
    super(diagram.canvas.getContext("2d"), diagram.options, note);
    this.flowElement = { ...note, type: 'note' };
  }

  draw() {
    const lines = this.note.text?.replace(/\r/g, '').split(/\n/);
    if (lines) {
      // fit to text
      this.diagram.context.font = this.diagram.options.note.font.name;
      let h = 0;
      for (const line of lines) {
        const textMetrics = this.diagram.context.measureText(line);
        if (textMetrics.width > this.display.w) {
          this.display.w = textMetrics.width;
        }
        h += this.diagram.options.note.font.size;
      }
      if (h > this.display.h) {
        this.display.h = h;
      }
      this.diagram.context.font = this.diagram.options.defaultFont.name;
    }

    this.diagram.rect(
      this.display.x,
      this.display.y,
      this.display.w,
      this.display.h,
      this.diagram.options.note.outlineColor,
      this.diagram.options.note.roundingRadius,
      this.diagram.options.note.fillColor
    );

    if (lines) {
      this.diagram.context.font = this.diagram.options.note.font.name;
      this.diagram.context.fillStyle = this.diagram.options.note.textColor ? this.diagram.options.note.textColor : this.diagram.options.defaultColor;
      const pad = this.diagram.options.note.padding;
      for (let i = 0; i < lines.length; i++) {
        this.diagram.context.fillText(lines[i], this.display.x + pad, this.display.y + this.diagram.options.note.font.size * (i + 1));
      }
      this.diagram.context.font = this.diagram.options.defaultFont.name;
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

  getDisplay(): Display {
    const display = super.getDisplay();
    const lines = this.note.text?.replace(/\r/g, '').split(/\n/);
    if (lines) {
      // fit to text
      const pad = this.diagram.options.note.padding;
      this.diagram.context.font = this.diagram.options.note.font.name;
      let maxW = pad * 2;
      let h = pad * 2;
      for (const line of lines) {
        const textMetrics = this.diagram.context.measureText(line);
        const lineW = textMetrics.width + pad * 2;
        if (lineW > maxW) {
          maxW = lineW;
        }
        h += this.diagram.options.note.font.size;
      }
      display.w = maxW;
      display.h = h;
      this.diagram.context.font = this.diagram.options.defaultFont.name;
    }

    display.w = Math.max(display.w, this.diagram.options.note.minWidth);
    display.h = Math.max(display.h, this.diagram.options.note.minHeight);
    this.setDisplayAttr(display.x, display.y, display.w, display.h);

    return display;
  }

  move(deltaX: number, deltaY: number) {
    const x = this.display.x + deltaX;
    const y = this.display.y + deltaY;
    this.setDisplayAttr(x, y, this.display.w, this.display.h);
  }

  resize(x: number, y: number, deltaX: number, deltaY: number, limDisplay?: Display) {
    const display = this.resizeDisplay(x, y, deltaX, deltaY,
       this.diagram.options.note.minWidth, this.diagram.options.note.minHeight, limDisplay);
    this.setDisplayAttr(display.x, display.y, display.w, display.h);
  }

  edit(onchange: (text: string) => void) {
    const edit = new Edit(this.diagram, true);
    edit.font = this.diagram.options.note.font;
    edit.textAlign = 'left';
    edit.backgroundColor = this.diagram.options.note.fillColor;
    if (this.diagram.options.note.textColor) {
      edit.color = this.diagram.options.note.textColor;
    }
    edit.render(this.note.text, this.display, text => {
      this.note.text = text;
      onchange(this.note.text);
    }, e => {
      const target = e.target as HTMLElement;
      this.note.text = target.innerText;
      const display = this.getDisplay();
      target.style.width = display.w + 'px';
      target.style.height = display.h + 'px';
    });
  }

  static create(diagram: Diagram, idNum: number, x: number, y: number): Note {
    const noteElement = Note.noteElement(diagram, idNum, x, y);
    const note = new Note(diagram, noteElement);
    const disp = note.getDisplay();
    note.display = { x: disp.x, y: disp.y, w: disp.w, h: disp.h };
    return note;
  }

  static noteElement(diagram: Diagram, idNum: number, x: number, y: number): NoteElement {
    const w = diagram.options.note.minWidth;
    const h = diagram.options.note.minHeight;
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

