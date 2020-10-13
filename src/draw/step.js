import { Shape } from './shape';

export class Step extends Shape {

  static INST_W = 8;
  static OLD_INST_W = 4;
  static MAX_INSTS = 10;

  static TASK_PAGELET = 'task.pagelet'; // TODO layout

  constructor(diagram, step) {
    super(diagram.canvas.getContext("2d"), diagram.options, step);
    this.diagram = diagram;
    this.step = step;
    this.flowElementType = 'step';
    this.isStep = true;
  }

  draw(animationTimeSlice) {
    var step = this.workflowObj = this.step;
    var shape;
    if (this.descriptor.icon && this.descriptor.icon.startsWith('shape:')) {
      shape = this.descriptor.icon.substring(6);
    }

    var title, fill;
    var opacity = null;
    var milestoneGroups = sessionStorage.getItem('mdw-milestoneGroups');
    if (milestoneGroups) {
      milestoneGroups = JSON.parse(milestoneGroups);
    }
    var milestone = this.getMilestone();
    if (milestone) {
      fill = this.diagram.options.step.milestoneColor;
      opacity = 0.5;
      title = milestone.label; // TODO use this
      if (milestone.group) {
        var foundGroup = !milestoneGroups ? null : milestoneGroups.find(function (mg) {
          return mg.name === milestone.group;
        });
        if (foundGroup && foundGroup.props && foundGroup.props.color) {
          fill = foundGroup.props.color;
          opacity = 0.5;
        }
      }
    }

    // runtime state first
    if (this.instances) {
      var adj = 0;
      if (shape === 'start' || shape === 'stop' || shape === 'pause') {
        adj = 2;
      }
      // TODO why is this here? -- probably milestones?
      var color = null;
      if (shape === 'pause') {
        color = '#ffea00';
      }
      this.diagram.drawState(this.display, this.instances, !this.diagram.drawBoxes, adj, animationTimeSlice, color, fill, opacity);
      fill = null; // otherwise runtime info lost below
    }
    else if (this.data) {
      this.diagram.drawData(this.display, 10 * this.data.heat, this.data.color, 0.8);
    }

    var yAdjust = -2;
    if (this.descriptor.icon) {
      if (shape) {
        if ('start' === shape) {
          this.diagram.oval(
            this.display.x,
            this.display.y,
            this.display.w,
            this.display.h,
            this.diagram.options.step.outlineColor,
            this.diagram.options.step.startColor,
            0.8,
            1
          );
        }
        else if ('stop' === shape) {
          this.diagram.oval(
            this.display.x,
            this.display.y,
            this.display.w,
            this.display.h,
            this.diagram.options.step.outlineColor,
            this.diagram.options.step.stopColor,
            0.8,
            1
          );
        }
        else if ('pause' === shape) {
          this.diagram.oval(
            this.display.x,
            this.display.y,
            this.display.w,
            this.display.h,
            this.diagram.options.step.outlineColor,
            this.diagram.options.step.pauseColor,
            0.8,
            1);
        }
        else if ('decision' === shape) {
          this.diagram.drawDiamond(this.display.x, this.display.y, this.display.w, this.display.h);
          yAdjust = this.title.lines.length === 1 ? -2 : -8;
        }
        else if ('step' === shape) {
          this.diagram.rect(
            this.display.x,
            this.display.y,
            this.display.w,
            this.display.h,
            this.diagram.options.step.outlineColor,
            this.diagram.options.step.roundingRadius,
            fill,
            opacity
          );
          yAdjust = -8;
        }
      }
      else {
        if (this.diagram.drawBoxes) {
          this.diagram.rect(
            this.display.x,
            this.display.y,
            this.display.w,
            this.display.h,
            this.diagram.options.step.outlineColor,
            this.diagram.options.step.roundingRadius,
            fill,
            opacity
          );
        }
        var iconSrc = this.descriptor.icon;
        var iconX = this.display.x + this.display.w / 2 - 12;
        var iconY = this.display.y + 6;
        this.diagram.drawIcon(iconSrc, iconX, iconY);
        yAdjust = this.title.lines.length === 1 ? 10 : 6;
      }
    }
    else {
      this.diagram.rect(
        this.display.x,
        this.display.y,
        this.display.w,
        this.display.h,
        this.diagram.options.step.outlineColor,
        this.diagram.options.step.roundingRadius,
        fill,
        opacity
      );
    }

    // title
    var diagram = this.diagram;
    diagram.context.font = this.diagram.options.defaultFont.name;
    this.title.lines.forEach(function (line) {
      if (shape === 'start' || shape === 'stop' || shape === 'pause') {
        diagram.context.fillStyle = diagram.options.step.filledTextColor;
      }
      diagram.context.fillText(line.text, line.x, line.y + yAdjust);
      diagram.context.fillStyle = diagram.options.defaultColor;
    });

    // logical id
    this.diagram.context.fillStyle = this.diagram.options.metaColor;
    var showText = step.id;
    if (this.data && this.data.message) {
      showText += ' (' + this.data.message + ')';
    }
    this.diagram.context.fillText(showText, this.display.x + 2, this.display.y - 2);
    this.diagram.context.fillStyle = this.diagram.options.defaultColor;
  }

  getMilestone() {
    if (this.step.attributes && this.step.attributes.Monitors) {
      var monitors = JSON.parse(this.step.attributes.Monitors);
      if (monitors.length > 0) {
        var step = this;
        for (var i = 0; i < monitors.length; i++) {
          var mon = monitors[i];
          if (mon.length >= 3 && mon[0] === 'true' && mon[2] === 'com.centurylink.mdw.milestones/ActivityMilestone.java') {
            var milestone = { label: step.name };
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
    this.diagram.oval(
      this.display.x - this.diagram.options.highlight.margin,
      this.display.y - this.diagram.options.highlight.margin,
      this.display.w + (2 * this.diagram.options.highlight.margin),
      this.display.h + (2 * this.diagram.options.highlight.margin),
      this.diagram.options.highlight.color,
      null,
      this.diagram.options.highlight.lineWidth
    );
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
    this.step.name.replace(/\r/g, '').split(/\n/).forEach(function (line) {
      titleLines.push({ text: line });
    });
    var title = { text: this.step.name, lines: titleLines, w: 0, h: 0 };
    for (var i = 0; i < title.lines.length; i++) {
      var line = title.lines[i];
      var textMetrics = this.diagram.context.measureText(line.text);
      if (textMetrics.width > title.w) {
        title.w = textMetrics.width;
      }
      title.h += this.diagram.options.defaultFont.size;
      line.x = display.x + display.w / 2 - textMetrics.width / 2;
      line.y = display.y + display.h / 2 + this.diagram.options.defaultFont.size * (i + 0.5);
      if (line.x + textMetrics.width > maxDisplay.w) {
        maxDisplay.w = line.x + textMetrics.width;
      }
      if (line.y + this.diagram.options.defaultFont.size > maxDisplay.h) {
        maxDisplay.h = line.y + this.diagram.options.defaultFont.size;
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
    var display = this.resizeDisplay(x, y, deltaX, deltaY, this.diagram.options.step.minSize, limDisplay);
    this.step.attributes.display = this.getAttr(display);
  }

  static create(diagram, idNum, descriptor, x, y) {
    var flowStep = Step.flowStep(diagram, idNum, descriptor, x, y);
    var step = new Step(diagram, flowStep);
    step.descriptor = descriptor;
    var disp = step.getDisplay();
    step.display = { x: disp.x, y: disp.y, w: disp.w, h: disp.h };
    return step;
  }

  static flowStep(diagram, idNum, descriptor, x, y) {
    var w = 24;
    var h = 24;
    if (diagram.drawBoxes) {
      if (descriptor.icon && descriptor.icon.startsWith('shape:')) {
        w = 60;
        h = 40;
      }
      else {
        w = 100;
        h = 60;
      }
    }
    var name = descriptor.label;
    if (descriptor.name === diagram.startdescriptor.name) {
      name = 'Start';
    }
    else if (descriptor.name === diagram.stopdescriptor.name) {
      name = 'Stop';
    }
    else if (descriptor.name === diagram.pausedescriptor.name) {
      name = 'Pause';
    }
    else {
      name = 'New ' + name;
    }
    var step = {
      id: 'S' + idNum,
      name: name,
      descriptor: descriptor.name,
      attributes: { display: 'x=' + x + ',y=' + y + ',w=' + w + ',h=' + h },
      links: []
    };
    return step;
  }
}

