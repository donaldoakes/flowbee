import { Shape } from './shape';

export class Note extends Shape {

  constructor(diagram, textNote) {
    super(diagram.canvas.getContext("2d"), diagram.options, textNote);
    this.diagram = diagram;
    this.textNote = textNote;
    this.workflowType = 'textNote';
    this.isNote = true;
  }

  draw() {
    this.diagram.rect(
      this.display.x,
      this.display.y,
      this.display.w,
      this.display.h,
      this.diagram.options.note.outlineColor,
      this.diagram.options.note.fillColor,
      this.diagram.options.note.roundingRadius
    );

    if (this.textNote.content) {
      var lines = this.textNote.content.replace(/\r/g, '').split(/\n/);
      this.diagram.context.font = this.diagram.options.note.font.name;
      for (var i = 0; i < lines.length; i++) {
        this.diagram.context.fillText(lines[i], this.display.x + 4, this.display.y + 2 + this.diagram.options.note.font.size * (i + 1));
      }
    }
  }

  prepareDisplay() {
    var maxDisplay = { w: 0, h: 0 };
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

  move(deltaX, deltaY) {
    var x = this.display.x + deltaX;
    var y = this.display.y + deltaY;
    this.setDisplayAttr(x, y, this.display.w, this.display.h);
    return true;
  }

  resize(x, y, deltaX, deltaY) {
    var display = this.resizeDisplay(x, y, deltaX, deltaY, this.diagram.options.note.minSize);
    this.setDisplayAttr(display.x, display.y, display.w, display.h);
  }

  static create(diagram, idNum, x, y) {
    var textNote = Note.newTextNote(diagram, idNum, x, y);
    var note = new Note(diagram, textNote);
    var disp = note.getDisplay();
    note.display = { x: disp.x, y: disp.y, w: disp.w, h: disp.h };
    return note;
  }

  static newTextNote(diagram, idNum, x, y) {
    var w = 200;
    var h = 60;
    var textNote = {
      id: 'N' + idNum,
      content: '',
      attributes: { WORK_DISPLAY_INFO: 'x=' + x + ',y=' + y + ',w=' + w + ',h=' + h },
      transitions: []
    };
    return textNote;
  }
}

