import { Subflow as SubflowElement, SubflowInstance } from '../model/flow';
import { Shape } from './shape';
import { Step } from './step';
import { Link } from './link';
import { Diagram } from './diagram';
import { Title } from './display';
import { Edit } from './edit';
import { StepInstance } from '../model/step';
import { LinkStatus } from '../model/link';

export class Subflow extends Shape {

  title: Title;
  steps: Step[];
  links: Link[];
  instances?: SubflowInstance[];

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
        return x >= this.x && x <= this.x + this.w &&
          y >= this.y && y <= this.y + this.h;
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
    const startDescriptors = this.diagram.descriptors.filter(d => d.category === 'start');
    return this.steps.find(step => {
      const desc = startDescriptors.find(d => d.path === step.step.path);
      if (desc) return desc;
    });
  }

  getStep(stepId: string): Step {
    return this.steps.find(step => step.step.id === stepId);
  }

  getLink(linkId: string): Link {
    return this.links.find(link => link.link.id === linkId);
  }

  getOutLinks(step: Step): Link[] {
    return this.links.filter(link => link.from.step.id === step.step.id);
  }

  getInLinks(step: Step): Link[] {
    return this.links.filter(link => link.to.step.id === step.step.id);
  }

  getLinks(step: Step): Link[] {
    return this.links.filter(link => {
      return link.to.step.id === step.step.id || link.from.step.id === step.step.id;
    });
  }

  get(id: string): Step | Link {
    if (id.startsWith('s')) {
      return this.getStep(id);
    }
    else if (id.startsWith('l')) {
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

  getStepInstances(stepId: string): StepInstance[] {
    let stepInsts = [];
    if (this.instances) {
      for (const inst of this.instances) {
        if (inst.stepInstances) {
          stepInsts = [ ...stepInsts, ...inst.stepInstances.filter(si => si.stepId === stepId)];
        }
      }
      return stepInsts;
    }
    return stepInsts;
  }

  getLinkStatus(linkId: string): LinkStatus | undefined {
    if (this.instances) {
      const link = this.getLink(linkId);
      if (link) {
        const downstreamStepInsts = this.getStepInstances(link.to.step.id);
        if (downstreamStepInsts.length > 0) {
          const upstreamStepInsts = this.getStepInstances(link.from.step.id);
          if (upstreamStepInsts.length > 0) {
            return 'Traversed';
          }
        }
      }
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
    const display = this.resizeDisplay(x, y, deltaX, deltaY,
      this.diagram.options.step.minWidth, this.diagram.options.step.minHeight);
    this.setDisplayAttr(display.x, display.y, display.w, display.h);
  }

  edit(onchange: (text: string) => void) {
    const edit = new Edit(this.diagram);
    const display = { ...this.title, y: this.title.y + 2 };
    edit.render(this.title.text, display, text => {
      this.subflow.name = text;
      onchange(this.subflow.name);
    });
  }

  /**
   * TODO template-driven
   */
  static create(diagram: Diagram, idNum: number, startStepId: number, startLinkId: number,
        type: string, x: number, y: number): Subflow {
    const subflowElement = Subflow.subflowElement(diagram, idNum, type, x, y);
    const subflow = new Subflow(diagram, subflowElement);
    subflow.steps = [];
    subflow.links = [];
    subflow.display = { x: x, y: y };

    let stepId = startStepId;
    let stepX = Math.max(x - 120, 0);
    let stepY = y;
    const linkId = startLinkId;

    const startDescriptor = diagram.descriptors.find(d => d.category === 'start');
    const start = Step.create(diagram, stepId, startDescriptor, stepX, stepY);
    subflowElement.steps.push(start.step);
    subflow.steps.push(start);

    stepId++;

    stepX = x + 120;
    stepY = y;
    const stopDescriptor = diagram.descriptors.find(d => d.category === 'stop');
    const stop = Step.create(diagram, stepId, stopDescriptor, stepX, stepY);
    subflowElement.steps.push(stop.step);
    subflow.steps.push(stop);
    const link = Link.create(diagram, linkId, start, stop);
    subflow.links.push(link);

    const disp = subflow.getDisplay();
    subflow.display = { x: disp.x, y: disp.y, w: disp.w, h: disp.h };

    return subflow;
  }

  static subflowElement(_diagram: Diagram, idNum: number, type: string, x: number, y: number): SubflowElement {
    const w = 400;
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
      id: 'f' + idNum,
      name: type,
      type: 'subflow'
    };
  }
}

