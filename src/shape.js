/**
 * Base class for rectangular diagram elements
 */
export class Shape {

  constructor(context, options, workflowItem) {
    this.context = context;
    this.options = options;
    this.workflowItem = workflowItem;
  }

  // get a display object from an attribute value
  getDisplay() {
    var displayAttr = this.workflowItem.attributes.WORK_DISPLAY_INFO;
    var display = {};
    if (displayAttr) {
      var vals = displayAttr.split(',');
      vals.forEach(function (val) {
        if (val.startsWith('x=')) {
          display.x = parseInt(val.substring(2));
        }
        else if (val.startsWith('y=')) {
          display.y = parseInt(val.substring(2));
        }
        else if (val.startsWith('w=')) {
          display.w = parseInt(val.substring(2));
        }
        else if (val.startsWith('h=')) {
          display.h = parseInt(val.substring(2));
        }
      });
    }
    return display;
  }

  setDisplayAttr(x, y, w, h) {
    var attr = 'x=' + x + ',y=' + y;
    if (w) {
      attr += ',w=' + w + ',h=' + h;
    }
    this.workflowItem.attributes.WORK_DISPLAY_INFO = attr;
  }

  getAttr(display) {
    var attr = 'x=' + display.x + ',y=' + display.y;
    if (display.w) {
      attr += ',w=' + display.w + ',h=' + display.h;
    }
    return attr;
  }

  isHover(x, y) {
    return x >= this.display.x && x <= this.display.x + this.display.w &&
      y >= this.display.y && y <= this.display.y + this.display.h;
  }

  select() {
    var display = this.display;
    this.context.fillStyle = this.options.anchor.color;
    var s = this.options.anchor.width;
    this.context.fillRect(display.x - s, display.y - s, s * 2, s * 2);
    this.context.fillRect(display.x + display.w - s, display.y - s, s * 2, s * 2);
    this.context.fillRect(display.x + display.w - 2, display.y + display.h - s, s * 2, s * 2);
    this.context.fillRect(display.x - 2, display.y + display.h - s, s * 2, s * 2);
    this.context.fillStyle = this.options.defaultColor;
  }

  getAnchor(x, y) {
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

  resizeDisplay(x, y, deltaX, deltaY, min, limDisplay) {
    var anchor = this.getAnchor(x, y);
    var display = { x: this.display.x, y: this.display.y, w: this.display.w, h: this.display.h };
    var t1, t2;
    if (anchor === 0) {
      t1 = display.x + display.w;
      t2 = display.y + display.h;
      display.x = x + deltaX;
      display.y = y + deltaY;
      if (t1 - display.x < min) {
        display.x = t1 - min;
      }
      if (t2 - display.y < min) {
        display.y = t2 - min;
      }
      display.w = t1 - display.x;
      display.h = t2 - display.y;
    }
    else if (anchor === 1) {
      t2 = display.y + display.h;
      display.y = y + deltaY;
      if (t2 - display.y < min) {
        display.y = t2 - min;
      }
      display.w = x - (display.x - deltaX);
      if (display.w < min) {
        display.w = min;
      }
      display.h = t2 - display.y;
    }
    else if (anchor === 2) {
      display.w = x - (display.x - deltaX);
      display.h = y - (display.y - deltaY);
      if (display.w < min) {
        display.w = min;
      }
      if (display.h < min) {
        display.h = min;
      }
    }
    else if (anchor === 3) {
      t1 = display.x + display.w;
      display.x = x + deltaX;
      if (t1 - display.x < min) {
        display.x = t1 - min;
      }
      display.w = t1 - display.x;
      display.h = y - (display.y - deltaY);
      if (display.h < min) {
        display.h = min;
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
}
