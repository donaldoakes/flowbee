import { Shape } from './shape';
import { Selection, SelectObj } from './selection';
import { Label } from './label';
import { Step } from './step';
import { Link, LineSegment } from './link';
import { Subflow } from './subflow';
import { Note } from './note';
import { Marquee } from './marquee';
import { Display } from './display';
import { DiagramOptions, Mode } from '../options';
import { Descriptor } from '../model/descriptor';
import { Flow, FlowInstance, Subflow as SubflowElement, SubflowInstance } from '../model/flow';
import { StepInstance, Step as StepElement } from '../model/step';
import { LinkStatus, Link as LinkElement } from '../model/link';
import { Note as NoteElement } from '../model/note';
import { FlowElement, getFlowName } from '../model/element';
import { DrawingOptions } from './options';
import { Grid } from './grid';
import { WebSocketListener } from './websocket';

export class Diagram extends Shape {

  context: CanvasRenderingContext2D;
  flow: Flow;
  grid: Grid;
  label: Label;
  steps: Step[];
  links: Link[];
  subflows: Subflow[];
  notes: Note[];
  readonly = false;
  marquee?: Marquee;
  anchor = -1;
  selection: Selection;
  zoom = 100;
  mode: Mode = 'select';
  container: HTMLElement;
  stepId?: string;
  _instance?: FlowInstance = null;
  stepInstanceId?: string;
  drawBoxes = true;

  private webSocketListener?: WebSocketListener;

  images?: {[key: string]: HTMLImageElement};

  static containerResizeObserver: ResizeObserver;

  constructor(
    readonly canvas: HTMLCanvasElement,
    public descriptors: Descriptor[],
    public options: DiagramOptions & DrawingOptions
  ) {
    super(canvas.getContext("2d"), options);
    this.canvas.style.transform = null; // forget zoom
    this.container = canvas.parentElement;
    this.descriptors = descriptors;
    this.context = this.canvas.getContext("2d");
    this.anchor = -1;
    this.selection = new Selection(this);
  }

  get diagram(): Diagram { return this; }

  get instance(): FlowInstance {
    return this._instance;
  }
  set instance(instance: FlowInstance) {
    const listen = instance && this.options.webSocketUrl && this._instance?.id !== instance.id;
    this._instance = instance;
    if (listen) {
      this.webSocketListener?.stop();
      this.webSocketListener = new WebSocketListener(this);
      this.webSocketListener.listen();
    }
  }

  get instances(): FlowInstance[] | null {
    return this.instance ? [ this.instance ] : null;
  }

  get dpRatio(): number {
    if (window.devicePixelRatio) {
      return window.devicePixelRatio;
    } else {
      return 1;
    }
  }

  resizeCanvas(canvasDisplay: Display) {
    if (this.dpRatio === 1) {
      this.canvas.width = canvasDisplay.w;
      this.canvas.height = canvasDisplay.h;
    }
    else {
      // fix blurriness on retina displays
      this.canvas.width = canvasDisplay.w * this.dpRatio;
      this.canvas.height = canvasDisplay.h * this.dpRatio;
      this.canvas.style.width = canvasDisplay.w + 'px';
      this.canvas.style.height = canvasDisplay.h + 'px';
      const ctx = this.canvas.getContext('2d');
      ctx.scale(this.dpRatio, this.dpRatio);
    }
  }

  zoomCanvas(zoom: number) {
    this.zoom = zoom;
    const scale = zoom / 100;
    const dw = this.canvas.width * scale - this.canvas.width;
    const dh = this.canvas.height * scale - this.canvas.height;
    const dpRatio = window.devicePixelRatio || 1;
    this.canvas.style.transform = 'translate(' + (dw / (2 * dpRatio)) + 'px,' + (dh / (2 * dpRatio)) + 'px) scale(' + scale + ')';
  }

  /**
   * params are only passed during initial draw
   */
  draw(flow?: Flow, instance?: any, step?: string, animate = false) {
    if (flow) {
      this.flow = flow;
      this.flowElement = { ...flow, type: 'flow' };
      this.drawBoxes = flow.attributes.NodeStyle === 'BoxIcon';

      if (this.options.resizeWithContainer) {
        // may be redrawing on same canvas with a different flow: re-initialize canvas size (new flow may be smaller)
        this.resizeCanvas({
          w: Math.max(this.container.clientWidth, this.options.minWidth) - this.options.padding,
          h: Math.max(this.container.clientHeight, this.options.minHeight) - this.options.padding
        });
        this.draw();
      }
    }

    if (this.options.resizeWithContainer) {
      if (Diagram.containerResizeObserver) {
        Diagram.containerResizeObserver.unobserve(this.container);
        Diagram.containerResizeObserver.disconnect();
        Diagram.containerResizeObserver = undefined;
      }
      if (!Diagram.containerResizeObserver) {
        Diagram.containerResizeObserver = new ResizeObserver(entries => {
          const min = (this.options.grid?.width || 10) / 2;
          for (const entry of entries) {
            if (entry.contentRect) {
              if (entry.contentRect.width > parseInt(this.canvas.style.width) + min
                  || entry.contentRect.height > parseInt(this.canvas.style.height) + min) {
                this.resizeCanvas({ w: entry.contentRect.width, h: entry.contentRect.height });
                this.draw();
                this.selection.select();
              }
            }
          }
        });
      }
      Diagram.containerResizeObserver.observe(this.container);
    }

    if (step) {
      if (instance) {
        this.stepInstanceId = step;
      }
      else {
        this.stepId = step;
      }
    }
    if (instance) {
      this.instance = instance;
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const display = this.prepareDisplay();

    if (!this.instance && this.options.showGrid) {
      this.grid = new Grid(this.context, display, this.options);
      this.grid.draw();
    }

    if (this.label) {
      this.label.draw(this.options.title.color);
    }

    let highlighted = null;
    if (animate && !this.instance) {
      const sequence = this.getSequence();
      let i = 0;
      const totalTime = sequence.length * 1000 / this.options.animationSpeed;
      let linkCt = 0;
      let nonLinkCt = 0;
      sequence.forEach(function (it) {
        if (it instanceof Link) {
          linkCt++;
        }
        else {
          nonLinkCt++;
        }
      });
      const nonLinkSlice = totalTime / (nonLinkCt + 2 * linkCt);
      const linkSlice = this.options.animationLinkFactor * nonLinkSlice;
      let timeSlice = nonLinkSlice;
      const s = () => {
        const it = sequence[i];
        it.draw(timeSlice);
        if (it instanceof Step && it.flowElement.id === this.stepId) {
          it.highlight();
          highlighted = it;
        }
        if (this.diagram.options.scrollIntoView) {
          this.scrollIntoView(it, timeSlice);
        }
        i++;
        if (i < sequence.length) {
          const nextSlice = sequence[i] instanceof Link ? linkSlice : nonLinkSlice;
          setTimeout(s, timeSlice);
          timeSlice = nextSlice;
        }
        else if (highlighted) {
          this.scrollIntoView(highlighted, nonLinkSlice);
        }
      };
      s();
    }
    else {
      // draw quickly
      for (const step of this.steps) {
        step.draw();
        if (step.flowElement.id === this.stepId) {
          step.highlight();
          highlighted = step;
        }
      }
      for (const link of this.links) {
        link.draw();
      }
      for (const subflow of this.subflows) {
        subflow.draw();
      }
      for (const note of this.notes) {
        note.draw();
      }

      if (highlighted) {
        this.scrollIntoView(highlighted, this.stepId ? 0 : 500);
      }
    }

    if (this.instance) {
      this.applyState(animate);
    }

    if (this.marquee) {
      this.marquee.draw();
    }
  }

  /**
   * sets display fields and returns a display with w and h for canvas size
   * (for performance reasons, also initializes steps/links arrays and step descriptors)
   */
  prepareDisplay(): Display {
    const canvasDisplay = {
      w: Math.max(this.canvas.clientWidth, this.options.minWidth) - this.options.padding,
      h: Math.max(this.canvas.clientHeight, this.options.minHeight) - this.options.padding
    };

    const diagram = this; // forEach inner access

    // label
    if (!this.instance && this.options.showTitle) {
      this.flowElement.id = '1'; // id needed for label reselect
      diagram.label = new Label(this, getFlowName(this.flow), this.getDisplay(), this.options.title.font);
      if (this.instance?.id) {
        diagram.label.subtext = this.instance.id;
      }
      diagram.makeRoom(canvasDisplay, diagram.label.prepareDisplay());
    }

    // steps
    diagram.steps = [];
    if (this.flow.steps) {
      this.flow.steps.forEach(function (flowStep) {
        const step = new Step(diagram, flowStep);
        step.descriptor = diagram.getDescriptor(flowStep.path);
        diagram.makeRoom(canvasDisplay, step.prepareDisplay());
        diagram.steps.push(step);
      });
    }

    // links
    diagram.links = [];
    diagram.steps.forEach(function (step) {
      if (step.step.links) {
        step.step.links.forEach(function (flowLink) {
          const link = new Link(diagram, flowLink, step, diagram.getStep(flowLink.to));
          link.count = diagram.countLinks(link);
          diagram.makeRoom(canvasDisplay, link.prepareDisplay());
          diagram.links.push(link);
        });
      }
    });

    // embedded subflows
    diagram.subflows = [];
    if (this.flow.subflows) {
      this.flow.subflows.forEach(function (subproc) {
        const subflow = new Subflow(diagram, subproc);
        diagram.makeRoom(canvasDisplay, subflow.prepareDisplay());
        diagram.subflows.push(subflow);
      });
    }

    // notes
    diagram.notes = [];
    if (this.flow.notes) {
      this.flow.notes.forEach(function (flowNote) {
        const note = new Note(diagram, flowNote);
        diagram.makeRoom(canvasDisplay, note.prepareDisplay());
        diagram.notes.push(note);
      });
    }

    // marquee
    if (this.marquee) {
      diagram.makeRoom(canvasDisplay, this.marquee.prepareDisplay());
    }

    // allow extra room
    canvasDisplay.w += this.options.padding;
    canvasDisplay.h += this.options.padding;

    this.resizeCanvas(canvasDisplay);

    return canvasDisplay;
  }

  applyState(animate: boolean) {
    const diagram = this; // forEach inner access

    this.flow.steps?.forEach(step => {
      diagram.getStep(step.id).instances = diagram.getStepInstances(step.id);
    });

    diagram.steps.forEach(step => {
      step.step.links?.forEach(function (link) {
        diagram.getLink(link.id).status = diagram.getLinkStatus(link.id);
      });
    });

    this.flow.subflows?.forEach(sub => {
      const subflow = diagram.getSubflow(sub.id);
      subflow.instances = diagram.getSubflowInstances(sub.id);
      if (subflow.subflow.steps) {
        subflow.subflow.steps.forEach(function (step) {
          subflow.getStep(step.id).instances = subflow.getStepInstances(step.id);
        });
      }
      subflow.steps?.forEach(function (step) {
        if (step.step.links) {
          step.step.links.forEach(function (link) {
            subflow.getLink(link.id).status = subflow.getLinkStatus(link.id);
          });
        }
      });
    });

    let highlighted = null;
    const sequence = this.getSequence(animate); // strict runtime sequence only if animating

    if (sequence) {
      const update = function (it: (Step | Link | Subflow), slice: number) {
        let highlight = false;
        if (it.flowElement.type === 'step') {
          if (animate && diagram.options.scrollIntoView) {
            // TODO: more sensible live scrolling based on ultimate endpoint (esp highlight)
            diagram.scrollIntoView(it, slice);
          }
          if (diagram.stepInstanceId) {
            it.instances?.forEach(inst => {
              if (inst.id === diagram.stepInstanceId) {
                highlight = true;
              }
            });
          }
        }
        it.draw(animate ? slice : null);
        if (highlight) {
          (it as Step).highlight();
          highlighted = it;
        }
      };

      if (animate) {
        let linkCt = 0;
        let nonLinkCt = 0;
        sequence.forEach(function (it) {
          if (it instanceof Link) {
            linkCt++;
          }
          else {
            nonLinkCt++;
          }
        });
        const totalTime = sequence.length * 1000 / this.options.animationSpeed;
        const nonLinkSlice = totalTime / (nonLinkCt + 2 * linkCt);
        const linkSlice = this.options.animationLinkFactor * nonLinkSlice;
        let timeSlice = nonLinkSlice;
        let i = 0;
        const s = function () {
          update(sequence[i], timeSlice);
          i++;
          if (i < sequence.length) {
            const nextSlice = sequence[i] instanceof Link ? linkSlice : nonLinkSlice;
            setTimeout(s, timeSlice);
            timeSlice = nextSlice;
          }
        };
        if (sequence.length > 0) {
          s();
        }
      }
      else {
        sequence.forEach(update);
        if (highlighted) {
          this.scrollIntoView(highlighted, diagram.stepInstanceId ? 0 : 500);
        }
      }
    }
  }

  getSequence(runtime = false): (Step | Link| Subflow)[] {
    const seq: (Step | Link | Subflow)[] = [];
    const start = this.getStart();
    if (start) {
      seq.push(start);
      this.addSequence(start, seq, runtime);
      const subflows = this.subflows.slice();
      subflows.sort(function (sf1, sf2) {
        if (Math.abs(sf1.display.y - sf2.display.y) > 100) {
          return sf1.display.y - sf2.display.y;
        }
        // otherwise closest to top-left of canvas
        return Math.sqrt(Math.pow(sf1.display.x, 2) + Math.pow(sf1.display.y, 2)) -
          Math.sqrt(Math.pow(sf2.display.x, 2) + Math.pow(sf2.display.y, 2));
      });
      const diagram = this;
      subflows.forEach(function (subflow) {
        if (!runtime || subflow.instances.length > 0) {
          seq.push(subflow);
          const substart = subflow.getStart();
          if (substart) {
            seq.push(substart);
            diagram.addSequence(substart, seq, runtime);
          }
        }
      });
    }
    return seq;
  }

  addSequence(step: Step, sequence: (Step | Link | Subflow)[], runtime = false) {
    const outSteps = [];
    const stepIdToInLinks = {};
    this.getOutLinks(step).forEach(function (link) {
      if (!runtime || link.status) {
        const outStep = link.to;
        const exist = stepIdToInLinks[outStep.step.id];
        if (!exist) {
          stepIdToInLinks[outStep.step.id] = [link];
          outSteps.push(outStep);
        }
        else {
          exist.push(link);
        }
      }
    });

    outSteps.sort(function (s1, s2) {
      if (runtime) {
        if (!s1.instances[0]) {
          return s2.instances[0] ? 1 : 0;
        }
        else if (!s2.instances[0]) {
          return -1;
        }
        else if (s1.instances[0].startDate !== s2.instances[0].startDate) {
          // ordered based on first instance occurrence
          return s1.instances[0].startDate.localeCompare(s2.instances[0].startDate);
        }
      }
      if (Math.abs(s1.display.y - s2.display.y) > 100) {
        return s1.y - s2.y;
      }
      // otherwise closest to top-left of canvas
      return Math.sqrt(Math.pow(s1.display.x, 2) + Math.pow(s1.display.y, 2)) -
        Math.sqrt(Math.pow(s2.display.x, 2) + Math.pow(s2.display.y, 2));
    });

    const diagram = this;
    const proceedSteps = []; // those not already covered
    outSteps.forEach(function (step) {
      const links = stepIdToInLinks[step.step.id];
      if (links) {
        links.forEach(function (link) {
          const l = sequence.find(function (it) {
            return it.flowElement.id === link.link.id;
          });
          if (!l) {
            sequence.push(link);
          }
        });
      }
      const s = sequence.find(function (it) {
        return it.flowElement.id === step.step.id;
      });
      if (!s) {
        sequence.push(step);
        proceedSteps.push(step);
      }
    });
    proceedSteps.forEach(function (step) {
      diagram.addSequence(step, sequence, runtime);
    });
  }

  makeRoom(canvasDisplay: Display, display: Display) {
    if (display.w > canvasDisplay.w) {
      canvasDisplay.w = display.w;
    }
    if (display.h > canvasDisplay.h) {
      canvasDisplay.h = display.h;
    }
  }

  /**
   * Returns first step whose descriptor category is Start
   */
  getStart(): Step | undefined {
    const startDescriptors = this.descriptors.filter(d => d.category === 'start' || d.name === 'Start'); // TODO flowbiz
    return this.steps.find(step => {
      const desc = startDescriptors.find(d => d.path === step.step.path);
      if (desc) return desc;
    });
  }

  getStep(stepId: string): Step | undefined {
    return this.steps.find(step => step.step.id === stepId);
  }

  getLink(linkId: string): Link | undefined {
    return this.links.find(link => link.link.id === linkId);
  }

  /**
   * also searches subflows
   */
  getInLinks(step: Step): Link[] {
    let links = this.links.filter(link => link.to.step.id === step.step.id);
    for (const subflow of this.subflows) {
      links = [ ...links, ...subflow.getInLinks(step) ];
    }
    return links;
  }

  /**
   * also searches subflows
   */
  getOutLinks(step: Step): Link[] {
    let links = this.links.filter(link => link.from.step.id === step.step.id);
    for (const subflow of this.subflows) {
      links = [ ...links, ...subflow.getOutLinks(step) ];
    }
    return links;
  }

  getLinks(step: Step): Link[] {
    return this.links.filter(link => {
      return link.to.step.id === step.step.id || link.from.step.id === step.step.id;
    });
  }

  getSubflow(subflowId: string): Subflow | undefined {
    return this.subflows.find(subflow => subflow.id === subflowId);
  }

  getNote(noteId: string): Note | undefined {
    return this.notes.find(note => note.note.id === noteId);
  }

  get(id: string): Step | Link | Subflow | Note | Label {
    if (id === '1') {
      return this.label;
    }
    else if (id.startsWith('s')) {
      return this.getStep(id);
    }
    else if (id.startsWith('l')) {
      return this.getLink(id);
    }
    else if (id.startsWith('f')) {
      return this.getSubflow(id);
    }
    else if (id.startsWith('n')) {
      return this.getNote(id);
    }
  }

  getDescriptor(path: string): Descriptor {
    if (this.descriptors) {
      for (let i = 0; i < this.descriptors.length; i++) {
        const descriptor = this.descriptors[i];
        if (descriptor.path === path) {
          return descriptor;
        }
      }
    }
    // not found -- return placeholder
    return {
      path: 'Step',
      type: 'step',
      icon: 'shape:step',
      name: 'Unknown Descriptor'
    };
  }

  findInSubflows(x: number, y: number): Subflow | undefined {
    if (this.subflows) {
      for (let i = 0; i < this.subflows.length; i++) {
        if (this.subflows[i].isHover(x, y)) {
          return this.subflows[i];
        }
      }
    }
  }

  insert(flowElements: FlowElement[]): SelectObj[] {
    const dx = 20, dy = 20;
    const selObjs: SelectObj[] = [];
    // steps first so they're available when adding links
    const origStepIdToNew = new Map<string,string>();
    const stepElements = flowElements.filter(fe => fe.type === 'step') as StepElement[];
    for (const stepElement of stepElements) {
      const step = Step.copy(this, stepElement, dx, dy);
      if (!this.flow.steps) this.flow.steps = [];
      this.flow.steps.push(step.step);
      this.steps.push(step);
      selObjs.push(step);
      origStepIdToNew.set(stepElement.id, step.id);
    }
    // links
    for (const linkElement of flowElements.filter(fe => fe.type === 'link') as LinkElement[]) {
      const origFrom = stepElements.find(stepElement => {
        if (stepElement.links?.find(le => le.id === linkElement.id)) return true;
      });
      const fromStep = this.getStep(origStepIdToNew.get(origFrom.id));
      const toStep = this.getStep(origStepIdToNew.get(linkElement.to));
      const link = Link.copy(this, linkElement, dx, dy, fromStep, toStep);
      fromStep.step.links.push(link.link);
      this.links.push(link);
      selObjs.push(link);
    }
    // subflows
    for (const subflowElement of flowElements.filter(fe => fe.type === 'subflow') as SubflowElement[]) {
      const subflow = Subflow.copy(this, subflowElement , dx, dy);
      if (!this.flow.subflows) this.flow.subflows = [];
      this.flow.subflows.push(subflow.subflow);
      // this.subflows.push(subflow); push is performed in Subflow.copy() to increment genId result
      selObjs.push(subflow);
    }
    // notes
    for (const noteElement of flowElements.filter(fe => fe.type === 'note') as NoteElement[]) {
      const note = Note.copy(this, noteElement, dx, dy);
      if (!this.flow.notes) this.flow.notes = [];
      this.flow.notes.push(note.note);
      this.notes.push(note);
      selObjs.push(note);
    }
    return selObjs;
  }

  /**
   * Including subflows
   */
  allSteps(): Step[] {
    let steps = this.steps.slice(0);
    this.subflows?.forEach(subflow => {
      steps = [ ...steps, ...subflow.steps ];
    });
    return steps;
  }

  addStep(descriptorName: string, xi: number, yi: number, name?: string): Step {
    const { x, y } = this.unscale(xi, yi);
    const descriptor = this.getDescriptor(descriptorName);
    const step = Step.create(this, this.genId(this.allSteps()), descriptor, x, y, name);
    const hoverObj = this.getHoverObj(x, y);
    if (hoverObj && hoverObj.type === 'subflow') {
      (hoverObj as Subflow).subflow.steps.push(step.step);
      (hoverObj as Subflow).steps.push(step);
    }
    else {
      const subflow = this.findInSubflows(x, y);
      if (subflow) {
        subflow.subflow.steps.push(step.step);
        subflow.steps.push(step);
      }
      else {
        this.flow.steps.push(step.step);
        this.steps.push(step);
      }
    }
    if (this.options.grid && this.options.snapToGrid) {
      this.snap(step);
    }
    return step;
  }

    /**
   * Including subflows
   */
  allLinks(): Link[] {
    let links = this.links.slice(0);
    this.subflows?.forEach(subflow => {
      links = [ ...links, ...subflow.links ];
    });
    return links;
  }

  /**
   * Count matching links (including passed orig)
   */
  countLinks(orig: Link): number {
    return this.allLinks().reduce((count, link) => {
      if (link.isDup(orig)) count++;
      return count;
    }, 1);
  }

  addLink(from: Step, to: Step): Link {
    // TODO: support link to self?
    if (from.id !== to.id) {
      const links = this.allLinks();
      const link = Link.create(this, this.genId(links), from, to);
      let destSubflow = null;
      if (this.subflows) {
        for (let i = 0; i < this.subflows.length; i++) {
          if (this.subflows[i].get(to.step.id)) {
            destSubflow = this.subflows[i];
          }
        }
      }
      if (destSubflow) {
        destSubflow.links.push(link);
      }
      else {
        this.links.push(link);
      }
      return link;
    }
  }

  addSubflow(type: string, xi: number, yi: number): Subflow {
    const { x, y } = this.unscale(xi, yi);
    const startStepId = this.genId(this.allSteps());
    const startLinkId = this.genId(this.allLinks());
    const subprocId = this.genId(this.subflows);
    const subflow = Subflow.create(this, subprocId, startStepId, startLinkId, type, x, y);
    if (!this.flow.subflows) {
      this.flow.subflows = [];
    }
    this.flow.subflows.push(subflow.subflow);
    this.subflows.push(subflow);
    if (this.options.grid && this.options.snapToGrid) {
      this.snap(subflow);
    }
    return subflow;
  }

  addNote(xi: number, yi: number): Note {
    const { x, y } = this.unscale(xi, yi);
    const note = Note.create(this, this.genId(this.notes), x, y);
    if (!this.flow.notes) {
      this.flow.notes = [];
    }
    this.flow.notes.push(note.note);
    this.notes.push(note);
    if (this.options.grid && this.options.snapToGrid) {
      this.snap(note);
    }
    return note;
  }

  genId(items: (Step | Link | Subflow | Note)[]): number {
    let maxId = 0;
    if (items) {
      items.forEach(function (item) {
        const itemId = parseInt(item.id.substring(1));
        if (itemId > maxId) {
          maxId = itemId;
        }
      });
    }
    return maxId + 1;
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
      this.flow.steps.splice(idx, 1);
      this.steps.splice(idx, 1);
      for (let i = 0; i < this.links.length; i++) {
        const link = this.links[i];
        if (link.to.step.id === step.step.id) {
          this.deleteLink(link);
        }
      }
    }
    else if (this.subflows) {
      for (let i = 0; i < this.subflows.length; i++) {
        this.subflows[i].deleteStep(step);
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
    else if (this.subflows) {
      for (let i = 0; i < this.subflows.length; i++) {
        this.subflows[i].deleteLink(link);
      }
    }
  }

  deleteSubflow(subflow: Subflow) {
    let idx = -1;
    for (let i = 0; i < this.subflows.length; i++) {
      const s = this.subflows[i];
      if (s.subflow.id === subflow.subflow.id) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      this.flow.subflows.splice(idx, 1);
      this.subflows.splice(idx, 1);
    }
  }

  deleteNote(note: Note) {
    let idx = -1;
    for (let i = 0; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.note.id === note.note.id) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      this.flow.notes.splice(idx, 1);
      this.notes.splice(idx, 1);
    }
  }

  getStepInstances(stepId: string): StepInstance[] {
    if (this.instance && this.instance.stepInstances) {
      return this.instance.stepInstances.filter(inst => inst.stepId === stepId);
    }
    return [];
  }

  getLinkStatus(linkId: string): LinkStatus | undefined {
    if (this.instance) {
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
    for (const subflow of this.subflows) {
      const subflowLinkStatus = subflow.getLinkStatus(linkId);
      if (subflowLinkStatus) {
        return subflowLinkStatus;
      }
    }
  }

  getSubflowInstances(subflowId: string): SubflowInstance[] {
    if (this.instance) {
      const insts = []; // should always return something, even if empty
      if (this.instance.subflowInstances) {
        this.instance.subflowInstances.forEach(function (subInst) {
          if (subInst.subflowId === subflowId) {
            insts.push(subInst);
          }
        });
      }
      insts.sort(function (f1, f2) {
        return f2.id - f1.id;
      });
      return insts;
    }
  }

  drawState(display: Display, instances, ext = false, adj = 0, animationSlice?: number /* not used */, color?: string, fill?: string, opacity?: number) {
    if (instances) {
      const maxInsts = this.options.maxInstances;
      const count = instances.length > maxInsts ? maxInsts : instances.length;
      for (let i = 0; i < count; i++) {
        const instance = instances[i];
        const rounding = this.options.step.roundingRadius;
        if (instance.status) {
          const status = this.options.status[instance.status];
          const statusColor = color ? color : status.color;
          const prevWidth = this.options.step.state.previous.width;
          const del = this.options.step.state.width - prevWidth;
          if (ext) {
            let rem = count - i;
            if (i === 0) {
              this.rect(
                display.x - prevWidth * rem - del,
                display.y - prevWidth * rem - del,
                display.w + prevWidth * 2 * rem + 2 * del,
                display.h + prevWidth * 2 * rem + 2 * del,
                statusColor, rounding, statusColor, opacity);
            }
            else {
              this.rect(
                display.x - prevWidth * rem,
                display.y - prevWidth * rem,
                display.w + prevWidth * 2 * rem,
                display.h + prevWidth * 2 * rem,
                statusColor, 0, statusColor, opacity);
            }
            rem--;
            this.context.clearRect(
              display.x - prevWidth * rem - 1,
              display.y - prevWidth * rem - 1,
              display.w + prevWidth * 2 * rem + 2,
              display.h + prevWidth * 2 * rem + 2);
          }
          else {
            let x1: number, y1: number, w1: number, h1: number;
            if (i === 0) {
              this.rect(
                display.x - adj,
                display.y - adj,
                display.w + 2 * adj,
                display.h + 2 * adj,
                statusColor, rounding, statusColor, opacity);
              x1 = display.x + del;
              y1 = display.y + del;
              w1 = display.w - 2 * del;
              h1 = display.h - 2 * del;
            }
            else {
              x1 = display.x + prevWidth * i + del;
              y1 = display.y + prevWidth * i + del;
              w1 = display.w - prevWidth * 2 * i - 2 * del;
              h1 = display.h - prevWidth * 2 * i - 2 * del;
              if (w1 > 0 && h1 > 0) {
                this.rect(x1, y1, w1, h1, statusColor, 0, statusColor, opacity);
              }
            }
            x1 += prevWidth - 1;
            y1 += prevWidth - 1;
            w1 -= 2 * prevWidth - 2;
            h1 -= 2 * prevWidth - 2;
            if (w1 > 0 && h1 > 0) {
              if (fill) {
                this.rect(x1, y1, w1, h1, statusColor, 0, fill, opacity);
              }
              else {
                this.context.clearRect(x1, y1, w1, h1);
              }
            }
          }
        }
      }
    }
  }

  rect(x: number, y: number, w: number, h: number, border?: string, r?: number, fill?: string, opacity?: number) {
    if (opacity) {
      this.context.globalAlpha = opacity;
    }
    if (border) {
      this.context.strokeStyle = border;
    }
    if (fill) {
      this.context.fillStyle = fill;
    }

    if (!r) {
      this.context.strokeRect(x, y, w, h);
      if (fill) {
        this.context.fillRect(x, y, w, h);
      }
    }
    else {
      // rounded corners
      this.context.beginPath();
      this.context.moveTo(x + r, y);
      this.context.lineTo(x + w - r, y);
      this.context.quadraticCurveTo(x + w, y, x + w, y + r);
      this.context.lineTo(x + w, y + h - r);
      this.context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.context.lineTo(x + r, y + h);
      this.context.quadraticCurveTo(x, y + h, x, y + h - r);
      this.context.lineTo(x, y + r);
      this.context.quadraticCurveTo(x, y, x + r, y);
      this.context.closePath();

      this.context.stroke();
      if (fill) {
        this.context.fill();
      }
    }

    this.context.fillStyle = this.options.defaultColor;
    this.context.strokeStyle = this.options.defaultColor;
    if (opacity) {
      this.context.globalAlpha = 1.0;
    }
  }

  oval(x: number, y: number, w: number, h: number, color: string, fill: string, opacity: number, width?: number) {
    const kappa = 0.5522848;
    const ox = (w / 2) * kappa; // control point offset horizontal
    const oy = (h / 2) * kappa; // control point offset vertical
    const xe = x + w; // x-end
    const ye = y + h; // y-end
    const xm = x + w / 2; // x-middle
    const ym = y + h / 2; // y-middle

    if (color) {
      this.context.strokeStyle = color;
    }
    if (width) {
      this.context.lineWidth = width;
    }
    this.context.beginPath();
    this.context.moveTo(x, ym);
    this.context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
    this.context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
    this.context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    this.context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
    this.context.closePath(); // not used correctly? (use to close off open path)
    if (fill) {
      if (opacity) {
        this.context.globalAlpha = opacity;
      }
      this.context.fillStyle = fill;
      this.context.fill();
      this.context.stroke();
    }
    else {
      this.context.stroke();
    }
    this.context.fillStyle = this.options.defaultColor;
    if (color) {
      this.context.strokeStyle = this.options.defaultColor;
    }
    if (opacity) {
      this.context.globalAlpha = 1.0;
    }
    if (width) {
      this.context.lineWidth = this.options.defaultLineWidth;
    }
  }

  drawLine(segments: LineSegment[], color: string, width?: number) {
    if (color) {
      this.context.strokeStyle = color;
    }
    if (width) {
      this.context.lineWidth = width;
    }
    this.context.beginPath();
    const diagram = this;
    segments.forEach(function (seg) {
      diagram.context.moveTo(seg.from.x, seg.from.y);
      diagram.context.lineTo(seg.to.x, seg.to.y);
    });
    this.context.stroke();
    this.context.strokeStyle = this.options.defaultColor;
    this.context.lineWidth = this.options.defaultLineWidth;
  }

  animateLine(segments: LineSegment[], color: string, width: number, slice: number) {
    let x1 = segments[0].from.x;
    let y1 = segments[0].from.y;
    let x2: number, y2: number;
    let i = 0; // segment index
    let j = 0; // subsegment
    const context = this.context;
    const perSeg = Math.ceil(slice / (1000 / 60) / segments.length);
    const diagram = this;
    const d = function () {
      const segment = segments[i];
      if (j >= perSeg) {
        i++;
        j = 0;
      }
      else {
        const lastSeg = j === perSeg - 1;
        x2 = lastSeg ? segment.to.x : x1 + (segment.to.x - segment.from.x) / perSeg;
        y2 = lastSeg ? segment.to.y : y1 + (segment.to.y - segment.from.y) / perSeg;
        context.strokeStyle = color;
        context.lineWidth = width;
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        if (lastSeg) {
          if (typeof segment.lineEnd === 'object' && segment.lineEnd.cpx) {
            x2 = segment.lineEnd.x;
            y2 = segment.lineEnd.y;
            context.quadraticCurveTo(segment.lineEnd.cpx, segment.lineEnd.cpy, x2, y2);
          }
          else if (typeof segment.lineEnd === 'function') {
            context.stroke();
            context.fillStyle = color;
            segment.lineEnd(context);
            context.lineWidth = width;
            context.strokeStyle = color;
            context.fillStyle = diagram.options.defaultColor;
          }
        }
        context.stroke();
        context.lineWidth = diagram.options.defaultLineWidth;
        context.strokeStyle = diagram.options.defaultColor;
        j++;
      }
      if (i < segments.length) {
        x1 = x2;
        y1 = y2;
        window.requestAnimationFrame(d);
      }
    };
    d();
  }

  drawDiamond(x: number, y: number, w: number, h: number) {
    const xh = x + w / 2;
    const yh = y + h / 2;
    this.context.beginPath();
    this.context.moveTo(x, yh);
    this.context.lineTo(xh, y);
    this.context.lineTo(x + w, yh);
    this.context.lineTo(xh, y + h);
    this.context.lineTo(x, yh);
    this.context.closePath();
    this.context.stroke();
  }

  drawIcon(src: string, x: number, y: number, w?: number, h?: number) {

    const isInlineSvg = src.startsWith('<svg') || src.startsWith('<?xml');
    if (!isInlineSvg) {
      src = this.options.iconBase ? this.options.iconBase + '/' + src : src;
    }

    if (!this.images) {
      this.images = {};
    }
    let img = this.images[src];
    if (!img) {
      img = new Image();
      if (isInlineSvg) {
        const svg = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
        img.src = URL.createObjectURL(svg);
      } else {
        img.src = src;
      }
      const context = this.context;
      const images = this.images;
      img.onload = function () {
        if (w && h) context.drawImage(img, x, y, w, h);
        else context.drawImage(img, x, y);
        images[src] = img;
      };
    }
    else {
      if (w && h) this.context.drawImage(img, x, y, w, h);
      else this.context.drawImage(img, x, y);
    }
  }

  snap(shape: Shape, resize: boolean = false) {
    if (this.grid) {
      if (shape.flowElement.type === 'step') {
        const step = this.getStep(shape.flowElement.id);
        if (step) {
          this.grid.doSnap(step.display, resize);
          step.setDisplayAttr();
          for (const link of this.getLinks(step)) {
              link.recalc(step);
          }
        } else {
          for (const subflow of this.subflows) {
            const step = subflow.getStep(shape.flowElement.id);
            if (step) {
              this.grid.doSnap(step.display, resize);
              step.setDisplayAttr();
              for (const link of subflow.getLinks(step)) {
                link.recalc(step);
              }
            }
          }
        }
      } else if (shape.flowElement.type === 'subflow') {
        const subflow = this.getSubflow(shape.flowElement.id);
        this.grid.doSnap(subflow.display, resize);
        subflow.setDisplayAttr();
        for (const step of subflow.steps) {
          this.grid.doSnap(step.display);
          step.setDisplayAttr();
          for (const link of subflow.getLinks(step)) {
            link.recalc(step);
          }
        }
      } else if (shape.flowElement.type === 'note') {
        const note = this.getNote(shape.flowElement.id);
        this.grid.doSnap(note.display);
        note.setDisplayAttr();
      }
    }
  }

  selectElement(id: string): SelectObj | undefined {
    if (this.mode === 'connect') return;
    let selObj: SelectObj;
    if (id.startsWith('f')) {
      selObj = this.getSubflow(id);
    } else {
      if (id.startsWith('s')) {
        selObj = this.getStep(id);
      } else if (id.startsWith('l')) {
        selObj = this.getLink(id);
      } else if (id.startsWith('n')) {
        selObj = this.getNote(id);
      }
      if (!selObj && this.subflows) {
        for (const subflow of this.subflows) {
          selObj = subflow.get(id);
          if (selObj) break;
        }
      }
    }

    if (selObj) {
      this.selection.unselect();
      this.draw();
      this.selection.setSelectObj(selObj);
      this.selection.reselect();
      selObj.select();
      return selObj;
    }
  }

  /**
   * TODO: horizontal scroll
   */
  scrollIntoView(item: Step | Link | Subflow, timeSlice = 0) {
    const centerX = item.display.x + item.display.w / 2;
    const centerY = item.display.y + item.display.h / 2;

    const container = this.container;

    const clientRect = this.canvas.getBoundingClientRect();
    const canvasLeftX = clientRect.left;
    const canvasTopY = clientRect.top;

    if (container.scrollHeight > container.clientHeight) {
      const maxVScroll = container.scrollHeight - container.clientHeight;
      const centeringVScroll = centerY - container.clientHeight / 2;
      if (centeringVScroll > 0) {
        const vScroll = centeringVScroll > maxVScroll ? maxVScroll : centeringVScroll;
        const vDelta = vScroll - container.scrollTop;
        // not sure about other logic, but force scroll for these conditions
        if (timeSlice === 0 && container === document.body) {
          window.scroll(0, vDelta);
          return;
        }
        let winDelta = 0;
        const bottomY = canvasTopY + item.display.y + item.display.h - vDelta + this.options.highlight.padding * 2;
        if (document.documentElement.clientHeight < bottomY) {
          winDelta = bottomY - document.documentElement.clientHeight;
        }
        const slices = !timeSlice ? 1 : Math.ceil(timeSlice / (1000 / 60));
        let i = 0;
        let winScrollY = 0;
        const scroll = function () {
          container.scrollTop += vDelta / slices;
          if (winDelta > 0) {
            winScrollY += winDelta / slices;
            window.scroll(0, winScrollY);
          }
          i++;
          if (i < slices) {
            window.requestAnimationFrame(scroll);
          }
        };
        scroll();
      }
    }
  }

  drag = false;
  dragX: number;
  dragY: number;
  shiftDrag = false;
  connectObj: SelectObj;

  onMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const { x, y } = this.unscale(e.clientX - rect.left, e.clientY - rect.top);

    // starting points for drag
    this.dragX = x;
    this.dragY = y;

    const selObj = this.getHoverObj(x, y);
    if (this.mode !== 'connect') {
      if (selObj) {
        if (!this.readonly && (e.shiftKey || e.metaKey || e.ctrlKey)) {
          if (this.selection.includes(selObj)) {
            this.selection.remove(selObj);
            this.diagram.draw(); // remove anchors
            this.selection.select();
          }
          else {
            this.selection.add(selObj);
            selObj.select();
          }
        } else if (!this.selection.includes(selObj)) {
          // normal single select
          this.selection.unselect();
          this.draw();
          this.selection.setSelectObj(selObj);
          this.selection.reselect();
          selObj.select();
        }
      } else {
        // clicked on canvas
        this.selection.unselect();
        this.draw();
      }
    }
  }

  onMouseUp(e: MouseEvent) {
    let chg = false;
    if ((this.shiftDrag || this.mode === 'connect') && this.dragX && this.dragY) {
      // dragging a link
      const selObj = this.mode === 'connect' ? this.connectObj : this.selection.getSelectObj();
      if (selObj?.type === 'step') {
        const rect = this.canvas.getBoundingClientRect();
        const { x, y } = this.unscale(e.clientX - rect.left, e.clientY - rect.top);

        const destObj = this.getHoverObj(x, y);

        if (destObj && destObj.type === 'step') {
          const srcStep = selObj as Step;
          if (this.getStep(srcStep.id) && this.getStep(destObj.id)) {
            this.addLink(srcStep, destObj as Step);
            chg = true;
          } else {
            // src and dest must be in same subflow
            for (let i = 0; i < this.subflows.length; i++) {
              const subflow = this.subflows[i];
              if (subflow.getStep(srcStep.id) && subflow.getStep(destObj.id)) {
                this.addLink(srcStep, destObj as Step);
                chg = true;
                break;
              }
            }
          }
        }
        this.draw();
      }
    }
    this.shiftDrag = false;

    if (this.marquee) {
      this.selection.selectObjs = this.marquee.getSelectObjs();
      this.marquee = null;
      this.draw(); // to get rid of marquee
      this.selection.reselect();
      this.selection.select();
    } else if (!e.shiftKey && this.mode !== 'connect') {
      this.selection.reselect();
      if (this.drag) {
        if (this.grid?.snap) {
          this.selection.snap(this.anchor >= 0);
          this.draw();
        }
        chg = true;
      }
      this.selection.select();
    }

    this.drag = false;
    return chg;
  }

  onMouseEnter(_e: MouseEvent) {
    document.body.style.cursor = this.canvas.style.cursor = 'default';
  }

  onMouseOut(_e: MouseEvent) {
    if (this.drag) {
      this.selection.syncDisplay();
      this.drag = false;
    }
    document.body.style.cursor = this.canvas.style.cursor = 'default';
  }

  onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const { x, y } = this.unscale(e.clientX - rect.left, e.clientY - rect.top);
    this.anchor = -1;

    let hoverObj: SelectObj;
    const hovObj = this.getHoverObj(x, y);
    if (this.mode === 'select' || this.mode === 'runtime') {
      hoverObj = hovObj;
    } else if (this.mode === 'connect') {
      hoverObj = hovObj?.type === 'link' ? hovObj : null;
      this.selection.setSelectObj(hoverObj);
      if (hoverObj) {
        // link is selected by hovering
        hoverObj.select();
      } else {
        this.selection.unselect();
        this.draw();
      }
    }
    if (hoverObj) {
      if (!this.readonly && (hoverObj.id === this.selection.getSelectObj()?.id)) {
        this.anchor = hoverObj.getAnchor(x, y);
        if (this.anchor >= 0) {
          if (hoverObj.type === 'link') {
            document.body.style.cursor = this.canvas.style.cursor = 'crosshair';
          }
          else {
            if (this.anchor === 0 || this.anchor === 2) {
              document.body.style.cursor = this.canvas.style.cursor = 'nwse-resize';
            }
            else if (this.anchor === 1 || this.anchor === 3) {
              document.body.style.cursor = this.canvas.style.cursor = 'nesw-resize';
            }
          }
        }
        else {
          document.body.style.cursor = this.canvas.style.cursor = 'pointer';
        }
      }
      else {
        document.body.style.cursor = this.canvas.style.cursor = 'pointer';
      }
    }
    else {
      document.body.style.cursor = this.canvas.style.cursor = 'default';
    }
  }

  onMouseDrag(e: MouseEvent) {
    if (!this.readonly && this.dragX && this.dragY) {
      this.drag = true;
      const rect = this.canvas.getBoundingClientRect();
      const { x, y } = this.unscale(e.clientX - rect.left, e.clientY - rect.top);
      const deltaX = x - this.dragX;
      const deltaY = y - this.dragY;

      if (Math.abs(deltaX) > this.options.drag.min || Math.abs(deltaY) > this.options.drag.min) {

        this.connectObj = null;
        if (this.mode === 'connect') {
          if (this.selection.getSelectObj()) {
            this.connectObj = this.selection.getSelectObj();
          } else {
            this.connectObj = this.getHoverObj(this.dragX, this.dragY);
          }
        } else if (e.shiftKey) {
          this.shiftDrag = true;
          // select start obj
          this.selection.setSelectObj(this.getHoverObj(this.dragX, this.dragY));
        }

        if (x > rect.right - this.options.padding) {
          this.canvas.width = this.canvas.width + this.options.padding;
        }
        if (y > rect.bottom - this.options.padding) {
          this.canvas.height = this.canvas.height + this.options.padding;
          this.grid?.draw();
        }

        const selObj = this.mode === 'connect' ? this.connectObj : this.selection.getSelectObj();
        if (selObj) {
          const diagram = this;
          if (this.shiftDrag || (this.mode === 'connect' && selObj.type === 'step')) {
            this.draw();
            const startObj = this.getHoverObj(this.dragX, this.dragY);
            if (startObj?.type === 'step') {
              document.body.style.cursor = this.canvas.style.cursor = 'crosshair';
              this.drawLine([{
                from: { x: this.dragX, y: this.dragY },
                to: { x: x, y: y }
              }], this.options.link.drawColor);
              return true;
            }
          }
          else if (this.anchor >= 0) {
            if (this.selection.getSelectObj().type === 'link') {
              const link = this.selection.getSelectObj() as Link;
              link.moveAnchor(this.anchor, x - this.dragX, y - this.dragY);
              let hovStep;
              if (this.anchor === 0) {
                hovStep = this.getHoverStep(x, y);
                if (hovStep && link.from.step.id !== hovStep.step.id) {
                  link.setFrom(hovStep);
                }
              }
              else if (this.anchor === (this.selection.getSelectObj() as Link).display.xs.length - 1) {
                hovStep = this.getHoverStep(x, y);
                if (hovStep && link.to.step.id !== hovStep.step.id) {
                  link.setTo(hovStep);
                }
              }
              this.draw();
              if (hovStep && link.display.xs.length === 2) {
                link.recalc(hovStep);
              }
            }
            if (this.selection.getSelectObj().resize) {
              if (this.selection.getSelectObj().type === 'step') {
                const stepId = (this.selection.getSelectObj() as Step).step.id;
                const step = this.getStep(stepId);
                if (step) {
                  this.selection.getSelectObj().resize(this.dragX, this.dragY, x - this.dragX, y - this.dragY);
                  this.getLinks(step).forEach(function (link) {
                    link.recalc(step);
                  });
                }
                else {
                  // try subflows
                  this.subflows.forEach(function (subflow) {
                    const step = subflow.getStep(stepId);
                    if (step) {
                      // only within bounds of subflow
                      diagram.selection.getSelectObj().resize(diagram.dragX, diagram.dragY, x - diagram.dragX, y - diagram.dragY, subflow.display);
                      subflow.getLinks(step).forEach(function (link) {
                        link.recalc(step);
                      });
                    }
                  });
                }
              }
              else {
                this.selection.getSelectObj().resize(this.dragX, this.dragY, x - this.dragX, y - this.dragY);
              }
              this.draw();
              const obj = this.getHoverObj(x, y);
              if (obj) {
                obj.select();
              }
              return true;
            }
          }
          else {
            this.selection.move(this.dragX, this.dragY, deltaX, deltaY);
            return true;
          }
        }
        else if (!e.shiftKey) {
          if (this.marquee) {
            this.marquee.resize(this.dragX, this.dragY, x - this.dragX, y - this.dragY);
          }
          else {
            this.marquee = new Marquee(this);
            this.marquee.start(this.dragX, this.dragY);
          }
          this.draw();
        }
      }
    }
  }

  onDrop(e: DragEvent, descriptor: Descriptor): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (descriptor.type === 'subflow') {
      this.selection.setSelectObj(this.addSubflow(descriptor.path, x, y));
    }
    else if (descriptor.type === 'note') {
      this.selection.setSelectObj(this.addNote(x, y));
    }
    else {
      this.selection.setSelectObj(this.addStep(descriptor.path, x, y, descriptor.name));
    }
    this.draw();
    if (this.mode !== 'connect') {
      this.selection.getSelectObj().select();
    }
    return true;
  }

  getHoverObj(x: number, y: number): SelectObj | undefined {

    if (this.label?.isHover(x, y)) {
      return this.label;
    }
    // links checked before steps for better anchor selectability
    for (let i = 0; i < this.subflows.length; i++) {
      const subflow = this.subflows[i];
      if ((subflow.title as any).isHover(x, y)) {
        return subflow;
      }
      if (subflow.isHover(x, y)) {
        for (let j = 0; j < subflow.links.length; j++) {
          if (subflow.links[j].isHover(x, y)) {
            return subflow.links[j];
          }
        }
        for (let j = 0; j < subflow.steps.length; j++) {
          if (subflow.steps[j].isHover(x, y)) {
            return subflow.steps[j];
          }
        }
        return subflow;
      }
    }
    for (let i = 0; i < this.links.length; i++) {
      if (this.links[i].isHover(x, y)) {
        return this.links[i];
      }
    }
    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].isHover(x, y)) {
        return this.steps[i];
      }
    }
    for (let i = 0; i < this.notes.length; i++) {
      if (this.notes[i].isHover(x, y)) {
        return this.notes[i];
      }
    }
  }

  getHoverStep(x: number, y: number): Step | undefined {
    for (let i = 0; i < this.subflows.length; i++) {
      const subflow = this.subflows[i];
      if (subflow.isHover(x, y)) {
        for (let j = 0; j < subflow.steps.length; j++) {
          if (subflow.steps[j].isHover(x, y)) {
            return subflow.steps[j];
          }
        }
      }
    }
    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].isHover(x, y)) {
        return this.steps[i];
      }
    }
  }

  unscale(x: number, y: number): { x: number, y: number } {
    if (this.zoom !== 100) {
      const scale = this.zoom / 100;
      return { x: x / scale, y: y / scale };
    } else {
      return { x, y };
    }
  }

  select() {
    // not applicable
  }

  getAnchor(_x: number, _y: number): number {
    return -1; // not applicable
  }

  move(deltaX: number, deltaY: number) {
    // not applicable
  }

  resize(_x: number, _y: number, deltaX: number, deltaY: number) {
    // not applicable
  }

}

