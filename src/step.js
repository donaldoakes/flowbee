import { Shape } from './shape';

export class Step extends Shape {

  static INST_W = 8;
  static OLD_INST_W = 4;
  static MAX_INSTS = 10;
  static MIN_SIZE = 4;

  static START_IMPL = 'com.centurylink.mdw.workflow.activity.process.ProcessStartActivity';
  static STOP_IMPL = 'com.centurylink.mdw.workflow.activity.process.ProcessFinishActivity';
  static PAUSE_IMPL = 'com.centurylink.mdw.base.PauseActivity';
  static TASK_IMPL = 'com.centurylink.mdw.workflow.activity.task.AutoFormManualTaskActivity';
  static TASK_PAGELET = 'com.centurylink.mdw.base/AutoFormManualTask.pagelet';

  constructor(diagram, activity) {
    super(diagram.canvas.getContext("2d"), diagram.options, activity);
    this.diagram = diagram;
    this.activity = activity;
    this.workflowType = 'activity';
    this.isStep = true;
  }

  draw(animationTimeSlice) {
    var activity = this.workflowObj = this.activity;
    var shape;
    if (this.implementor.icon && this.implementor.icon.startsWith('shape:')) {
      shape = this.implementor.icon.substring(6);
    }

    var title, fill;
    var milestoneGroups = sessionStorage.getItem('mdw-milestoneGroups');
    if (milestoneGroups) {
      milestoneGroups = JSON.parse(milestoneGroups);
    }
    var milestone = this.getMilestone();
    if (milestone) {
      fill = this.shade('#4cafea', 0.50);
      title = milestone.label; // TODO use this
      if (milestone.group) {
        var foundGroup = !milestoneGroups ? null : milestoneGroups.find(function (mg) {
          return mg.name === milestone.group;
        });
        if (foundGroup && foundGroup.props && foundGroup.props.color) {
          fill = this.shade(foundGroup.props.color, 0.50);
        }
      }
    }

    // runtime state first
    if (this.instances) {
      var adj = 0;
      if (shape === 'start' || shape === 'stop' || shape === 'pause') {
        adj = 2;
      }
      var color = null;
      if (shape === 'pause') {
        color = '#ffea00';
      }
      this.diagram.drawState(this.display, this.instances, !this.diagram.drawBoxes, adj, animationTimeSlice, color, fill);
      fill = null; // otherwise runtime info lost below
    }
    else if (this.data) {
      this.diagram.drawData(this.display, 10 * this.data.heat, this.data.color, 0.8);
    }

    var yAdjust = -2;
    if (this.implementor.icon) {
      if (shape) {
        if ('start' === shape) {
          this.diagram.drawOval(this.display.x, this.display.y, this.display.w, this.display.h, null, '#98fb98', 0.8);
        }
        else if ('stop' === shape) {
          this.diagram.drawOval(this.display.x, this.display.y, this.display.w, this.display.h, null, '#ff8c86', 0.8);
        }
        else if ('pause' === shape) {
          this.diagram.drawOval(this.display.x, this.display.y, this.display.w, this.display.h, null, '#fffd87', 0.8);
        }
        else if ('decision' === shape) {
          this.diagram.drawDiamond(this.display.x, this.display.y, this.display.w, this.display.h);
          yAdjust = this.title.lines.length === 1 ? -2 : -8;
        }
        else if ('activity' === shape) {
          this.diagram.roundedRect(this.display.x, this.display.y, this.display.w, this.display.h, this.diagram.options.BOX_OUTLINE_COLOR, fill);
          yAdjust = -8;
        }
      }
      else {
        if (this.diagram.drawBoxes) {
          this.diagram.roundedRect(this.display.x, this.display.y, this.display.w, this.display.h, this.diagram.options.BOX_OUTLINE_COLOR, fill);
        }
        var iconSrc = 'asset/' + this.implementor.icon;
        var iconX = this.display.x + this.display.w / 2 - 12;
        var iconY = this.display.y + 5;
        this.diagram.drawImage(iconSrc, iconX, iconY);
        yAdjust = this.title.lines.length === 1 ? 10 : 4;
      }
    }
    else {
      this.diagram.roundedRect(this.display.x, this.display.y, this.display.w, this.display.h, this.diagram.options.BOX_OUTLINE_COLOR, fill);
    }

    // title
    var diagram = this.diagram;
    diagram.context.font = this.diagram.options.DEFAULT_FONT.FONT;
    this.title.lines.forEach(function (line) {
      diagram.context.fillText(line.text, line.x, line.y + yAdjust);
    });

    // logical id
    this.diagram.context.fillStyle = this.diagram.options.META_COLOR;
    var showText = activity.id;
    if (this.data && this.data.message) {
      showText += ' (' + this.data.message + ')';
    }
    this.diagram.context.fillText(showText, this.display.x + 2, this.display.y - 2);
    this.diagram.context.fillStyle = this.diagram.options.DEFAULT_COLOR;
  }

  getMilestone() {
    if (this.activity.attributes && this.activity.attributes.Monitors) {
      var monitors = JSON.parse(this.activity.attributes.Monitors);
      if (monitors.length > 0) {
        var activity = this;
        for (var i = 0; i < monitors.length; i++) {
          var mon = monitors[i];
          if (mon.length >= 3 && mon[0] === 'true' && mon[2] === 'com.centurylink.mdw.milestones/ActivityMilestone.java') {
            var milestone = { label: activity.name };
            if (mon.length >= 4 && mon[3]) {
              var text = mon[3];
              var bracket = text.indexOf('[');
              if (bracket > 0) {
                text = text.substring(0, bracket);
              }
              milestone.label = text.trim().replace(/\\n/g, '\n');
              if (bracket >= 0) {
                var g = mon[3].substring(bracket + 1);
                bracket = g.indexOf(']');
                if (bracket > 0) {
                  g = g.substring(0, bracket);
                }
                milestone.group = g.trim();
              }
            }
            return milestone;
          }
        }
      }
    }
  }

  isWaiting() {
    if (this.instances && this.instances.length > 0) {
      let instance = this.instances[this.instances.length - 1];
      return instance.statusCode === 7;
    }
  }

  highlight() {
    this.diagram.drawOval(this.display.x - this.diagram.options.HIGHLIGHT_MARGIN, this.display.y - this.diagram.options.HIGHLIGHT_MARGIN,
      this.display.w + (2 * this.diagram.options.HIGHLIGHT_MARGIN), this.display.h + (2 * this.diagram.options.HIGHLIGHT_MARGIN), this.diagram.options.HIGHLIGHT_COLOR);
  }

  // sets display/title and returns an object with w and h for required size
  prepareDisplay() {
    var maxDisplay = { w: 0, h: 0 };
    var display = this.getDisplay();

    if (display.x + display.w > maxDisplay.w) {
      maxDisplay.w = display.x + display.w;
    }
    if (display.y + display.h > maxDisplay.h) {
      maxDisplay.h = display.y + display.h;
    }

    // step title
    var titleLines = [];
    this.activity.name.replace(/\r/g, '').split(/\n/).forEach(function (line) {
      titleLines.push({ text: line });
    });
    var title = { text: this.activity.name, lines: titleLines, w: 0, h: 0 };
    for (var i = 0; i < title.lines.length; i++) {
      var line = title.lines[i];
      var textMetrics = this.diagram.context.measureText(line.text);
      if (textMetrics.width > title.w) {
        title.w = textMetrics.width;
      }
      title.h += this.diagram.options.DEFAULT_FONT.SIZE;
      line.x = display.x + display.w / 2 - textMetrics.width / 2;
      line.y = display.y + display.h / 2 + this.diagram.options.DEFAULT_FONT.SIZE * (i + 0.5);
      if (line.x + textMetrics.width > maxDisplay.w) {
        maxDisplay.w = line.x + textMetrics.width;
      }
      if (line.y + this.diagram.options.DEFAULT_FONT.SIZE > maxDisplay.h) {
        maxDisplay.h = line.y + this.diagram.options.DEFAULT_FONT.SIZE;
      }
    }

    this.display = display;
    this.title = title;

    return maxDisplay;
  }

  move(deltaX, deltaY, limDisplay) {
    var x = this.display.x + deltaX;
    var y = this.display.y + deltaY;
    if (limDisplay) {
      if (x < limDisplay.x) {
        x = limDisplay.x;
      }
      else if (x > limDisplay.x + limDisplay.w - this.display.w) {
        x = limDisplay.x + limDisplay.w - this.display.w;
      }
      if (y < limDisplay.y) {
        y = limDisplay.y;
      }
      else if (y > limDisplay.y + limDisplay.h - this.display.h) {
        y = limDisplay.y + limDisplay.h - this.display.h;
      }
    }
    this.setDisplayAttr(x, y, this.display.w, this.display.h);
  }

  resize(x, y, deltaX, deltaY, limDisplay) {
    var display = this.resizeDisplay(x, y, deltaX, deltaY, Step.MIN_SIZE, limDisplay);
    this.activity.attributes.WORK_DISPLAY_INFO = this.getAttr(display);
  }

  shade(color, fraction) {
    var f = parseInt(color.slice(1), 16), t = fraction < 0 ? 0 : 255, p = fraction < 0 ? fraction * -1 : fraction, R = f >> 16, G = f >> 8 & 0x00FF, B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
  }

  static create(diagram, idNum, implementor, x, y) {
    var activity = Step.newActivity(diagram, idNum, implementor, x, y);
    var step = new Step(diagram, activity);
    step.implementor = implementor;
    var disp = step.getDisplay();
    step.display = { x: disp.x, y: disp.y, w: disp.w, h: disp.h };
    return step;
  }

  static newActivity(diagram, idNum, implementor, x, y) {
    var w = 24;
    var h = 24;
    if (diagram.drawBoxes) {
      if (implementor.icon && implementor.icon.startsWith('shape:')) {
        w = 60;
        h = 40;
      }
      else {
        w = 100;
        h = 60;
      }
    }
    var name = implementor.label;
    if (implementor.implementorClass === Step.START_IMPL) {
      name = 'Start';
    }
    else if (implementor.implementorClass === Step.STOP_IMPL) {
      name = 'Stop';
    }
    else if (implementor.implementorClass === Step.PAUSE_IMPL) {
      name = 'Pause';
    }
    else {
      name = 'New ' + name;
    }
    var activity = {
      id: 'A' + idNum,
      name: name,
      implementor: implementor.implementorClass,
      attributes: { WORK_DISPLAY_INFO: 'x=' + x + ',y=' + y + ',w=' + w + ',h=' + h },
      transitions: []
    };
    return activity;
  }
}

