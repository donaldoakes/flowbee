import { Shape } from './shape';
import { Step } from './step';
import { Link } from './link';
import { Diagram } from './diagram';
import { Subflow as SubflowElement } from '../model/flow';
import { Title } from './display';

export class Subflow extends Shape {

  title: Title;
  steps: Step[];
  links: Link[];
  mainFlowInstanceId: string;
  instances = null;

  constructor(readonly diagram: Diagram, readonly subflow: SubflowElement) {
    super(diagram.canvas.getContext("2d"), diagram.options, subflow);
    this.flowElement = { ...subflow, type: 'subflow' };
  }

  draw(animationTimeSlice?: number) {
    // runtime state first
    if (this.instances && !animationTimeSlice) {
      this.diagram.drawState(this.display, this.instances, true);
    }

    this.diagram.rect(
      this.display.x,
      this.display.y,
      this.display.w,
      this.display.h,
      this.diagram.options.subflow.outlineColor,
      this.diagram.options.subflow.roundingRadius
    );

    this.diagram.context.clearRect(this.title.x - 1, this.title.y, this.title.w + 2, this.title.h);
    this.diagram.context.font = this.diagram.options.defaultFont.name;
    this.diagram.context.fillText(this.title.text, this.title.x, this.title.y + this.diagram.options.defaultFont.size);

    // animation sequence controlled by diagram
    if (!animationTimeSlice) {
      this.steps.forEach(function (step) {
        step.draw();
      });
      this.links.forEach(function (link) {
        link.draw();
      });
    }

    // logical id
    this.diagram.context.fillStyle = this.diagram.options.meta.color;
    this.diagram.context.fillText('[' + this.subflow.id + ']', this.display.x + 10, this.display.y + this.display.h + 4);
    this.diagram.context.fillStyle = this.diagram.options.defaultColor;
  }

  prepareDisplay() {
    const maxDisplay = { w: 0, h: 0 };
    this.display = this.getDisplay();

    // title
    const title = {
      subflow: this,
      text: this.subflow.name,
      x: this.display.x + 10,
      y: this.display.y + 4 - this.diagram.options.defaultFont.size,
      w: 0,
      h: 0,
      isHover: function (x: number, y: number): boolean {
        let hov = x >= this.x && x <= this.x + this.w &&
          y >= this.y && y <= this.y + this.h;
        if (!hov) {
          const context = subflow.diagram.context;
          context.lineWidth = subflow.diagram.options.subflow.hitWidth;
          const display = this.subflow.display;
          const r = this.subflow.diagram.options.subflow.roundingRadius;
          context.beginPath();
          context.moveTo(display.x + r, display.y);
          context.lineTo(display.x + display.w - r, display.y);
          context.quadraticCurveTo(display.x + display.w, display.y, x + display.w, display.y + r);
          context.lineTo(display.x + display.w, display.y + display.h - r);
          context.quadraticCurveTo(display.x + display.w, display.y + display.h, display.x + display.w - r, display.y + display.h);
          context.lineTo(display.x + r, display.y + display.h);
          context.quadraticCurveTo(display.x, display.y + display.h, display.x, display.y + display.h - r);
          context.lineTo(display.x, display.y + r);
          context.quadraticCurveTo(display.x, display.y, display.x + r, display.y);
          context.closePath();
          hov = context.isPointInStroke(x, y);
          context.lineWidth = this.subflow.diagram.options.defaultLineWidth;
        }
        return hov;
      }
    };

    const textMetrics = this.diagram.context.measureText(title.text);
    title.w = textMetrics.width;
    title.h = this.diagram.options.defaultFont.size;
    if (title.x + title.w > maxDisplay.w) {
      maxDisplay.w = title.x + title.w;
    }
    if (title.y + title.h > maxDisplay.h) {
      maxDisplay.h = title.y + title.h;
    }
    this.title = title;

    // boundaries
    if (this.display.x + this.display.w > maxDisplay.w) {
      maxDisplay.w = this.display.x + this.display.w;
    }
    if (this.display.y + this.display.h > maxDisplay.h) {
      maxDisplay.h = this.display.y + this.display.h;
    }

    const subflow = this;
    // just prepare flow steps -- assume boundaries account for size
    subflow.steps = [];
    if (this.subflow.steps) {
      this.subflow.steps.forEach(function (flowStep) {
        const step = new Step(subflow.diagram, flowStep);
        step.descriptor = subflow.diagram.getDescriptor(flowStep.path);
        step.prepareDisplay();
        subflow.steps.push(step);
      });
    }
    subflow.links = [];
    subflow.steps.forEach(function (step) {
      if (step.step.links) {
        step.step.links.forEach(function (flowLink) {
          const link = new Link(subflow.diagram, flowLink, step, subflow.getStep(flowLink.to));
          link.prepareDisplay();
          subflow.links.push(link);
        });
      }
    });
    return maxDisplay;
  }

  getStart() {
    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].step.path === this.diagram.startDescriptor.path) {
        return this.steps[i];
      }
    }
  }

  getStep(stepId: string): Step {
    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].step.id === stepId) {
        return this.steps[i];
      }
    }
  }

  getLink(linkId: string): Link {
    for (let i = 0; i < this.links.length; i++) {
      if (this.links[i].link.id === linkId) {
        return this.links[i];
      }
    }
  }

  getOutLinks(step: Step): Link[] {
    const links = [];
    for (let i = 0; i < this.links.length; i++) {
      if (step.step.id === this.links[i].from.step.id) {
        links.push(this.links[i]);
      }
    }
    return links;
  }

  getLinks(step: Step): Link[] {
    const links = [];
    for (let i = 0; i < this.links.length; i++) {
      if (step === this.links[i].to || step === this.links[i].from) {
        links.push(this.links[i]);
      }
    }
    return links;
  }

  get(id: string): Step | Link {
    if (id.startsWith('S')) {
      return this.getStep(id);
    }
    else if (id.startsWith('L')) {
      return this.getLink(id);
    }
  }

  deleteStep(step: Step) {
    let idx = -1;
    for (let i = 0; i < this.steps.length; i++) {
      const s = this.steps[i];
      if (step.step.id === s.step.id) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      this.subflow.steps.splice(idx, 1);
      this.steps.splice(idx, 1);
      for (let i = 0; i < this.links.length; i++) {
        const link = this.links[i];
        if (link.to.step.id === step.step.id) {
          this.deleteLink(link);
        }
      }
    }
  }

  deleteLink(link: Link) {
    let idx = -1;
    for (let i = 0; i < this.links.length; i++) {
      const l = this.links[i];
      if (l.link.id === link.link.id) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      this.links.splice(idx, 1);
      let tidx = -1;
      for (let i = 0; i < link.from.step.links.length; i++) {
        if (link.from.step.links[i].id === link.link.id) {
          tidx = i;
          break;
        }
      }
      if (tidx >= 0) {
        link.from.step.links.splice(tidx, 1);
      }
    }
  }

  getStepInstances(id: string) {
    if (this.instances) {
      const stepInsts = [];
      const mainFlowInstanceId = this.mainFlowInstanceId;
      this.instances.forEach(function (inst) {
        if (inst.steps) {
          const flowInstId = mainFlowInstanceId;
          inst.steps.forEach(function (stepInst) {
            if ('S' + stepInst.stepId === id) {
              stepInsts.push(stepInst);
              // needed for subflow & task instance retrieval
              stepInst.flowInstanceId = flowInstId;
              stepInst.embeddedFlowInstanceId = inst.id;
            }
          });
        }
      });
      stepInsts.sort(function (a1, a2) {
        return a2.id - a1.id;
      });
      return stepInsts;
    }
  }

  getLinkInstances(id: string) {
    if (this.instances) {
      const transInsts = [];
      this.instances.forEach(function (inst) {
        if (inst.links) {
          inst.links.forEach(function (transInst) {
            if ('L' + transInst.linkId === id) {
              transInsts.push(transInst);
            }
          });
        }
      });
      transInsts.sort(function (t1, t2) {
        return t2.id - t1.id;
      });
      return transInsts;
    }
  }

  move(deltaX: number, deltaY: number) {
    const x = this.display.x + deltaX;
    const y = this.display.y + deltaY;
    this.setDisplayAttr(x, y, this.display.w, this.display.h);

    this.steps.forEach(function (step) {
      step.move(deltaX, deltaY);
    });
    this.links.forEach(function (link) {
      link.move(deltaX, deltaY);
    });
  }

  resize(x: number, y: number, deltaX: number, deltaY: number) {
    const display = this.resizeDisplay(x, y, deltaX, deltaY, this.diagram.options.step.minSize);
    this.setDisplayAttr(display.x, display.y, display.w, display.h);
  }

  static create(diagram: Diagram, idNum: number, startStepId: number, startLinkId: number,
        type: string, x: number, y: number): Subflow {
    // TODO template-driven
    const subflowElement = Subflow.subflowElement(diagram, idNum, type, x, y);
    const subflow = new Subflow(diagram, subflowElement);
    subflow.steps = [];
    subflow.links = [];
    subflow.display = { x: x, y: y };

    let stepId = startStepId;
    let stepX = x + 40;
    let stepY = y + 40;
    const linkId = startLinkId;

    const start = Step.create(diagram, stepId, diagram.startDescriptor, stepX, stepY);
    subflowElement.steps.push(start.step);
    subflow.steps.push(start);

    stepId++;

    let task;
    if (type === 'Error Handler') {
      // TODO template
      stepX = x + 170;
      stepY = y + 30;
      task = Step.create(diagram, stepId, diagram.taskDescriptor, stepX, stepY);
      task.step.attributes.TASK_PAGELET = 'task.pagelet';
      task.step.attributes.STATUS_AFTER_EVENT = 'Cancelled';
      task.step.name = diagram.name + ' Fallout';
      subflow.steps.push(task.step);
      subflow.steps.push(task);
      const link = Link.create(diagram, linkId, start, task);
      subflow.links.push(link);
    }

    stepId++;
    stepX = x + 340;
    stepY = y + 40;
    const stop = Step.create(diagram, stepId, diagram.stopDescriptor, stepX, stepY);
    subflowElement.steps.push(stop.step);
    subflow.steps.push(stop);
    const link = Link.create(diagram, linkId, task ? task : start, stop);
    subflow.links.push(link);

    return subflow;
  }

  static subflowElement(_diagram: Diagram, idNum: number, type: string, x: number, y: number): SubflowElement {
    const w = 440;
    const h = 120;
    const subflowX = Math.max(1, x - w / 2);
    const subflowY = Math.max(1, y - h / 2);
    return {
      steps: [],
      attributes: {
        embeddedFlowType: type,
        visibility: 'EMBEDDED',
        display: 'x=' + subflowX + ',y=' + subflowY + ',w=' + w + ',h=' + h
      },
      id: 'F' + idNum,
      name: type,
      type: 'subflow'
    };
  }
}

