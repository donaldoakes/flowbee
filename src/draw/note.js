import { Shape } from './shape';

export class Note extends Shape {

  constructor(diagram, note) {
    super(diagram.canvas.getContext("2d"), diagram.options, note);
    this.diagram = diagram;
    this.note = note;
    this.flowElementType = 'note';
    this.isNote = true;
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

    if (this.note.content) {
      var lines = this.note.content.replace(/\r/g, '').split(/\n/);
      this.diagram.context.font = this.diagram.options.note.font.name;
      this.diagram.context.fillStyle = this.diagram.options.note.textColor ? this.diagram.options.note.textColor : this.diagram.options.defaultColor;
      for (var i = 0; i < lines.length; i++) {
        this.diagram.context.fillText(lines[i], this.display.x + 4, this.display.y + 2 + this.diagram.options.note.font.size * (i + 1));
      }
      this.diagram.context.fillStyle = this.diagram.options.defaultColor;
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
    var flowNote = Note.flowNote(diagram, idNum, x, y);
    var note = new Note(diagram, flowNote);
    var disp = note.getDisplay();
    note.display = { x: disp.x, y: disp.y, w: disp.w, h: disp.h };
    return note;
  }

  static flowNote(_diagram, idNum, x, y) {
    var w = 200;
    var h = 60;
    var note = {
      id: 'N' + idNum,
      content: '',
      attributes: { display: 'x=' + x + ',y=' + y + ',w=' + w + ',h=' + h },
      links: []
    };
    return note;
  }
}

