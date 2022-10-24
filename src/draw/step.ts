import { Shape } from './shape';
import { Diagram } from './diagram';
import { Step as StepElement, StepInstance } from '../model/step';
import { Descriptor } from '../model/descriptor';
import { Milestone, MilestoneGroup } from '../model/milestone';
import { Display, parseDisplay, Title } from './display';
import { Edit } from './edit';

export class Step extends Shape {

  title: Title;
  descriptor: Descriptor;
  instances?: StepInstance[];

  constructor(readonly diagram: Diagram, readonly step: StepElement) {
    super(diagram.canvas.getContext("2d"), diagram.options, step);
    this.flowElement = { ...step, type: 'step' };
    this.diagram = diagram;
    this.step = step;
  }

  get shape(): string | undefined {
    if (typeof this.descriptor.icon === 'string' && this.descriptor.icon.startsWith('shape:')) {
      return this.descriptor.icon.substring(6);
    }
  }

  draw(animationTimeSlice?: number) {
    const step = this.step;
    const shape = this.shape;

    let title: string, fill: string;
    let opacity = null;
    let milestoneGroups: MilestoneGroup[] = [];
    const milestoneGroupsItem = sessionStorage.getItem('flowbee-milestoneGroups');
    if (milestoneGroupsItem) {
      milestoneGroups = JSON.parse(milestoneGroupsItem);
    }
    const milestone = this.getMilestone();
    if (milestone) {
      fill = this.diagram.options.milestone.color;
      opacity = 0.5;
      title = milestone.label; // TODO use this
      if (milestone.group) {
        const foundGroup = !milestoneGroups ? null : milestoneGroups.find(function (mg) {
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
      let adj = 0;
      const color = null;
      if (shape === 'start' || shape === 'stop' || shape === 'pause') {
        adj = 2;
      }
      this.diagram.drawState(this.display, this.instances, !this.diagram.drawBoxes, adj, animationTimeSlice, color, fill, opacity);
      if (shape === 'start' || shape === 'stop' || shape === 'pause') {
        // clear background so opacity doesn't cause issues
        this.diagram.oval(
          this.display.x,
          this.display.y,
          this.display.w,
          this.display.h,
          this.diagram.options.step.outlineColor,
          this.diagram.options.backgroundColor,
          1.0,
          1
        );
      }
      fill = null; // otherwise runtime info lost below
    }

    if (this.descriptor.icon) {
      if (shape) {
        if ('start' === shape) {
          this.diagram.oval(
            this.display.x,
            this.display.y,
            this.display.w,
            this.display.h,
            this.diagram.options.step.outlineColor,
            this.diagram.options.step.start.fillColor,
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
            this.diagram.options.step.stop.fillColor,
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
            this.diagram.options.step.pause.fillColor,
            0.8,
            1);
        }
        else if ('decision' === shape) {
          this.diagram.drawDiamond(this.display.x, this.display.y, this.display.w, this.display.h);
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
        const iconX = this.display.x + this.display.w / 2 - 12;
        const iconY = this.display.y + 12;
        if (typeof this.descriptor.icon === 'string') {
          this.diagram.drawIcon(this.descriptor.icon, iconX, iconY);
        } else {
          this.diagram.drawIcon(this.descriptor.icon.src, iconX, iconY, this.descriptor.icon.width, this.descriptor.icon.height);
        }
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
    this.diagram.context.font = this.diagram.options.defaultFont.name;
    for (const line of this.title.lines) {
      if (shape === 'start') {
        this.diagram.context.fillStyle = this.diagram.options.step.start.color;
      } else if (shape === 'stop') {
        this.diagram.context.fillStyle = this.diagram.options.step.stop.color;
      } else if (shape === 'pause') {
        this.diagram.context.fillStyle = this.diagram.options.step.pause.color;
      }
      this.diagram.context.fillText(line.text, line.x, line.y);
      this.diagram.context.fillStyle = this.diagram.options.defaultColor;
    }

    // logical id
    this.diagram.context.fillStyle = this.diagram.options.meta.color;
    this.diagram.context.fillText(step.id, this.display.x + 2, this.display.y - 4);
    this.diagram.context.fillStyle = this.diagram.options.defaultColor;
  }

  getMilestone(): Milestone {
    if (this.step.attributes && this.step.attributes.Monitors) {
      const monitors = JSON.parse(this.step.attributes.Monitors);
      if (monitors.length > 0) {
        for (let i = 0; i < monitors.length; i++) {
          const mon = monitors[i];
          if (mon.length >= 3 && mon[0] === 'true' && mon[2] === 'milestones/ActivityMilestone.java') {
            const milestone: Milestone = { label: this.step.name };
            if (mon.length >= 4 && mon[3]) {
              let text = mon[3];
              let bracket = text.indexOf('[');
              if (bracket > 0) {
                text = text.substring(0, bracket);
              }
              milestone.label = text.trim().replace(/\\n/g, '\n');
              if (bracket >= 0) {
                let g = mon[3].substring(bracket + 1);
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
      const instance = this.instances[this.instances.length - 1];
      return instance.status === 'Waiting';
    }
  }

  isMultiLink() {
    return this.options.multiLink || this.descriptor.multiLink;
  }

  isLoopbackLink() {
    return this.options.loopbackLink || this.descriptor.loopbackLink;
  }

  canLinkFrom(): boolean {
    return this.step.path !== 'stop' && ((this.step.links?.length || 0) === 0 || this.isMultiLink());
  }

  canLinkTo(): boolean {
    return this.step.path !== 'start' && (this.diagram.getInLinks(this).length === 0 || this.isLoopbackLink());
  }

  highlight() {
    this.diagram.oval(
      this.display.x - this.diagram.options.highlight.padding,
      this.display.y - this.diagram.options.highlight.padding,
      this.display.w + (2 * this.diagram.options.highlight.padding),
      this.display.h + (2 * this.diagram.options.highlight.padding),
      this.diagram.options.highlight.color,
      null,
      this.diagram.options.highlight.lineWidth
    );
  }

  // sets display/title and returns an object with w and h for required size
  prepareDisplay() {
    const maxDisplay = { w: 0, h: 0 };
    const display = this.getDisplay();

    if (display.x + display.w > maxDisplay.w) {
      maxDisplay.w = display.x + display.w;
    }
    if (display.y + display.h > maxDisplay.h) {
      maxDisplay.h = display.y + display.h;
    }

    // step title
    const titleLines = [];
    this.step.name.replace(/\r/g, '').split(/\n/).forEach(function (line) {
      titleLines.push({ text: line });
    });
    this.title = {
      text: this.step.name,
      lines: titleLines,
      x: display.x,
      y: display.y + display.h / 2 - this.diagram.options.defaultFont.size / 2 + 2,
      w: 0,
      h: 0
    };

    const shape = this.shape;
    let yAdjust = -2;
    if (shape) {
      if (shape === 'decision') yAdjust = this.title.lines.length === 1 ? -2 : -8;
      else if (shape === 'step') yAdjust = -8;
    } else {
      yAdjust = this.title.lines.length === 1 ? 10 : 6;
    }
    this.title.y += yAdjust;

    this.diagram.context.font = this.diagram.options.defaultFont.name;
    for (let i = 0; i < this.title.lines.length; i++) {
      const line = this.title.lines[i];
      const textMetrics = this.diagram.context.measureText(line.text);
      if (textMetrics.width > this.title.w) {
        this.title.w = textMetrics.width;
        this.title.x = display.x + display.w / 2 - textMetrics.width / 2;
      }
      this.title.h += this.diagram.options.defaultFont.size;
      line.x = display.x + display.w / 2 - textMetrics.width / 2;
      line.y = display.y + display.h / 2 + this.diagram.options.defaultFont.size * (i + 0.5) + yAdjust;
      if (line.x + textMetrics.width > maxDisplay.w) {
        maxDisplay.w = line.x + textMetrics.width;
      }
      if (line.y + this.diagram.options.defaultFont.size > maxDisplay.h) {
        maxDisplay.h = line.y + this.diagram.options.defaultFont.size;
      }
    }

    this.display = display;

    return maxDisplay;
  }

  move(deltaX: number, deltaY: number, limDisplay?: Display) {
    let x = this.display.x + deltaX;
    let y = this.display.y + deltaY;
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

  resize(x: number, y: number, deltaX: number, deltaY: number, limDisplay?: Display) {
    const display = this.resizeDisplay(x, y, deltaX, deltaY,
      this.diagram.options.step.minWidth, this.diagram.options.step.minHeight, limDisplay);
    this.step.attributes.display = Shape.getAttr(display);
  }

  edit(onchange: (text: string) => void) {
    const edit = new Edit(this.diagram, true);
    edit.render(this.title.text, this.title, text => {
      this.step.name = text;
      onchange(this.step.name);
    });
  }

  static create(diagram: Diagram, idNum: number, descriptor: Descriptor, x: number, y: number, name?: string): Step {
    const stepElement = Step.stepElement(diagram, idNum, descriptor, x, y, name);
    const step = new Step(diagram, stepElement);
    step.descriptor = descriptor;
    const disp = step.getDisplay();
    step.display = { x: disp.x, y: disp.y, w: disp.w, h: disp.h };
    return step;
  }

  static copy(diagram: Diagram, stepElement: StepElement, dx: number, dy: number): Step {
    const display = parseDisplay(stepElement);
    display.x += dx;
    display.y += dy;

    const step = new Step(diagram, {
      id: 's' + diagram.genId(diagram.allSteps()),
      type: 'step',
      name: stepElement.name,
      path: stepElement.path,
      links: [],
      attributes: { ...stepElement.attributes,  display: Shape.getAttr(display) }
    });
    step.display = display;
    step.descriptor = diagram.getDescriptor(stepElement.path);
    return step;
  }

  static stepElement(diagram: Diagram, idNum: number, descriptor: Descriptor, x: number, y: number, name?: string): StepElement {
    let w = 24;
    let h = 24;
    if (diagram.drawBoxes) {
      if (typeof descriptor.icon === 'string' && descriptor.icon.startsWith('shape:')) {
        w = 60;
        h = 40;
      }
      else {
        w = 100;
        h = 80;
      }
    }
    if (!name) {
      name = descriptor.name;
      if (descriptor.path === 'start') {
        name = 'Start';
      }
      else if (descriptor.path === 'stop') {
        name = 'Stop';
      }
      else if (descriptor.path === 'pause') {
        name = 'Pause';
      }
      else {
        name = 'New ' + name;
      }
    }
    const stepX = Math.max(1, x - w / 2);
    const stepY = Math.max(1, y - h / 2);
    return {
      id: 's' + idNum,
      type: 'step',
      name,
      path: descriptor.path,
      links: [],
      attributes: { display: 'x=' + stepX + ',y=' + stepY + ',w=' + w + ',h=' + h },
    };
  }
}

