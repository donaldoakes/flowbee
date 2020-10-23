import { Shape } from './shape';
import { Selection, SelectObj } from './selection';
import { Label } from './label';
import { Step } from './step';
import { Link, LineSegment } from './link';
import { Subflow } from './subflow';
import { Note } from './note';
import { Marquee } from './marquee';
import { Descriptor } from '../model/descriptor';
import { DiagramOptions } from '../options';
import { Flow, FlowInstance, SubflowInstance } from '../model/flow';
import { StepInstance } from '../model/step';
import { Display } from './display';
import { FlowElementType } from '../model/element';
import { DrawingOptions } from './options';
import { Grid } from './grid';
import { LinkInstance } from '../model/link';

const Toolbox = null; // TODO

export class Diagram extends Shape {

  context: CanvasRenderingContext2D
  flow: Flow;
  grid: Grid;
  label: Label;
  steps: Step[];
  links: Link[];
  subflows: Subflow[];
  notes: Note[];
  readonly = false;
  marquee?: Marquee;
  dialog = null; // TODO: see this.onDelete()
  anchor = -1;
  selection: Selection;
  containerId?: string;
  stepId?: string;
  instance?: FlowInstance;
  instances = null;
  stepInstanceId?: string;
  drawBoxes = true;
  allowInstanceEdit = false;
  editInstanceId?: string;
  data?: any;

  images?: {[key: string]: HTMLImageElement};

  // TODO extract zoom
  zoom = 100;
  zoomControl?: HTMLElement;
  origPanelWidth?: number;

  startDescriptor: Descriptor;
  stopDescriptor: Descriptor;
  pauseDescriptor: Descriptor;
  taskDescriptor: Descriptor;

  constructor(
    readonly canvas: HTMLCanvasElement,
    public options: DiagramOptions & DrawingOptions,
    public descriptors: Descriptor[]
  ) {
    super(canvas.getContext("2d"), options);
    this.dialog = null;
    this.descriptors = descriptors;
    this.context = this.canvas.getContext("2d");
    this.anchor = -1;
    this.selection = new Selection(this);

    // zoom setup TODO refactor
    const zoomControls = document.getElementsByClassName('flow-zoom');
    if (zoomControls.length === 1) {
      const diagram = this;
      this.zoomControl = zoomControls[0] as HTMLElement;
      if (!this.readonly && Toolbox) {
        this.zoomControl.style.top = "90px";
        this.zoomControl.style.right = '270px';
      }
      const rangeInput = diagram.zoomControl.getElementsByTagName('input')[0] as HTMLInputElement;
      this.zoomControl.oninput = function (e) {
        diagram.zoomCanvas(parseInt((e.target as HTMLInputElement).value));
      };
      this.zoomControl.onchange = function (e) {
        diagram.adjustSection();
      };
      this.zoomControl.onclick = function (e) {
        e.preventDefault();
        if ((e.target as HTMLElement).className) {
          if ((e.target as HTMLElement).className.endsWith('zoom-in') && diagram.zoom < 200) {
            diagram.zoomCanvas(diagram.zoom + 20);
            rangeInput.value = '' + (diagram.zoom + 20);
            diagram.adjustSection();
          }
          else if ((e.target as HTMLElement).className.endsWith('zoom-out') && diagram.zoom > 20) {
            diagram.zoomCanvas(diagram.zoom - 20);
            rangeInput.value = '' + (diagram.zoom - 20);
            diagram.adjustSection();
          }
        }
      };
      // zoom hover title
      rangeInput.onmousemove = function (e) {
        const rect = rangeInput.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = (x / rangeInput.clientWidth) * 100;
        let z = parseInt(rangeInput.min) + (parseInt(rangeInput.max) - parseInt(rangeInput.min)) * pct / 100;
        if (z > (diagram.zoom - 10) && z < (diagram.zoom + 10)) {
          z = diagram.zoom;
        }
        rangeInput.title = Math.round(z) + '%';
      };
      // show/hide/close
      const closeBtn = this.zoomControl.getElementsByClassName('zoom-close')[0] as HTMLButtonElement;
      this.zoomControl.onmouseover = function (e) {
        closeBtn.style.visibility = 'visible';
      };
      this.zoomControl.onmouseout = function (e) {
        closeBtn.style.visibility = 'hidden';
      };
      closeBtn.onclick = function (e) {
        diagram.zoomControl.style.visibility = 'hidden';
        (e.target as HTMLElement).style.visibility = 'hidden';
      };
      // pinch gesture
      window.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
          e.preventDefault();
          let z = diagram.zoom - e.deltaY;
          if (z < 20) {
            z = 20;
          }
          else if (z > 200) {
            z = 200;
          }
          diagram.zoomCanvas(z);
          rangeInput.value = '' + diagram.zoom;
          diagram.adjustSection();
        }
      }, { passive: false });
    }
  }

  get diagram(): Diagram { return this; }

  get name(): string {
    let name = this.flow.path;
    if (!this.instance?.template) {
      const lastSlash = name.lastIndexOf('/');
      if (lastSlash > 0 && lastSlash < name.length - 1) {
        name = name.substring(lastSlash + 1);
      }
      const lastDot = name.lastIndexOf('.');
      if (lastDot > 1) {
        name = name.substring(0, lastDot);
      }
    }
    return name;
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
   * adjust section to accommodate zoomed canvas
   */
  adjustSection() {
    const sections = document.getElementsByClassName('zoom-section');
    if (sections.length) {
      const section = sections[0];
      const scale = this.zoom / 100;
      const cw = this.canvas.style.width.substring(0, this.canvas.style.width.length - 2);
      let w = (cw ? parseInt(cw) : this.canvas.width) * scale; // canvas style width not populated on windows
      const panels = document.getElementsByClassName('panel-full-width');
      if (panels.length) {
        // don't shrink width smaller than original panel width
        if (!this.origPanelWidth) {
          this.origPanelWidth = (panels[0] as HTMLElement).offsetWidth;
        }
        if (w < this.origPanelWidth - 37) {
          w = this.origPanelWidth - 37;
        }
      }
      const ch = this.canvas.style.height.substring(0, this.canvas.style.height.length - 2);
      let h = (ch ? parseInt(ch) : this.canvas.height) * scale;
      if (h < 540) {
        h = 540;
      }
      (section as HTMLElement).style.width = (w + 20) + 'px';
      (section as HTMLElement).style.height = (h + 20) + 'px';
    }
  }

  /**
   * params are only passed during initial draw
   */
  draw(flow?: Flow, instance?: any, step?: string, animate = false, editInstanceId?: string, data?: any) {
    if (flow) {
      this.flow = flow;
      this.flowElement = { ...flow, type: 'flow' };
      this.drawBoxes = flow.attributes.NodeStyle === 'BoxIcon';
    }
    if (step) {
      if (instance) {
        this.stepInstanceId = step;
      }
      else {
        this.stepId = step;
      }
    }
    this.instance = instance;
    this.editInstanceId = editInstanceId;
    this.data = data;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const display = this.prepareDisplay();

    if (this.options.grid.visibility === 'visible') {
      this.grid = new Grid(this.context, display, this.options);
      this.grid.draw();
    }

    if (!instance && this.options.title.visibility === 'visible') {
      this.label.draw(this.options.title.color);
    }

    const diagram = this;
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
      const s = function () {
        const it = sequence[i];
        it.draw(timeSlice);
        if (it instanceof Step && it.flowElement.id === diagram.stepId) {
          it.highlight();
          highlighted = it;
        }
        diagram.scrollIntoView(it, timeSlice);
        i++;
        if (i < sequence.length) {
          const nextSlice = sequence[i] instanceof Link ? linkSlice : nonLinkSlice;
          setTimeout(s, timeSlice);
          timeSlice = nextSlice;
        }
        else if (highlighted) {
          diagram.scrollIntoView(highlighted, nonLinkSlice);
        }
      };
      s();
    }
    else {
      // draw quickly
      this.steps.forEach(function (step) {
        step.draw();
        if (step.flowElement.id === diagram.stepId) {
          step.highlight();
          highlighted = step;
        }
      });
      this.links.forEach(function (link) {
        link.draw();
      });
      this.subflows.forEach(function (subflow) {
        subflow.draw();
      });
      if (highlighted) {
        this.scrollIntoView(highlighted, diagram.stepId ? 0 : 500);
      }
    }

    if (this.instance) {
      this.applyState(animate, function () {
        diagram.notes.forEach(function (note) {
          note.draw();
        });
        if (diagram.options.webSocketUrl) {
          const socket = new WebSocket(diagram.options.webSocketUrl);
          socket.addEventListener('open', function (event) {
            socket.send(`{ "topic": "flowInstance-${diagram.instance.id}" }`);
          });
          socket.addEventListener('message', function (event) {
            const message = JSON.parse(event.data);
            if (message.type === 'step') {
              const step = diagram.getStep('s' + message.instance.stepId);
              if (step) {
                if (!step.instances) {
                  step.instances = [];
                }
                const stepIdx = step.instances.findIndex(inst => inst.id === message.instance.id);
                if (stepIdx) {
                  step.instances[stepIdx] = message.instance;
                }
                else {
                  step.instances.push(message.instance);
                  diagram.instance.stepInstances.push(message.instance);
                }
                step.draw();
                diagram.scrollIntoView(step);
              }
            }
            else if (message.subtype === 'l') {
              const link = diagram.getLink('l' + message.id);
              if (link) {
                if (!link.instances) {
                  link.instances = [];
                }
                const linkInst = link.instances.find(function (inst) {
                  return inst.id === message.instId;
                });
                if (linkInst) {
                  linkInst.statusCode = message.status;
                }
                else {
                  link.instances.push({
                    linkId: message.id,
                    id: message.instId,
                    statusCode: message.status
                  });
                }
                link.draw();
                diagram.scrollIntoView(link);
              }
            }
          });
        }
      });
    }
    else if (this.data) {
      this.applyData();
    }
    else {
      diagram.notes.forEach(function (note) {
        note.draw();
      });
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
      h: Math.max(this.canvas.clientHeight, this.options.minWidth) - this.options.padding
    };

    const diagram = this; // forEach inner access

    // label
    const font = this.instance?.template ? this.options.template.font : this.options.title.font;
    diagram.label = new Label(this, this.name, this.getDisplay(), font);
    if (this.instance?.id) {
      diagram.label.subtext = this.instance.id;
    }
    diagram.makeRoom(canvasDisplay, diagram.label.prepareDisplay());

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
    canvasDisplay.w += diagram.options.padding;
    canvasDisplay.h += diagram.options.padding;

    // TODO embedded toolbox (like Hub)
    // if (!this.readonly && Toolbox) {
    //   var toolbox = Toolbox.getToolbox();
    //   // fill available
    //   var parentWidth = this.canvas.parentElement.offsetWidth;
    //   if (toolbox) {
    //     parentWidth -= toolbox.getWidth();
    //   }
    //   if (canvasDisplay.w < parentWidth) {
    //     canvasDisplay.w = parentWidth;
    //   }
    //   if (toolbox && canvasDisplay.h < toolbox.getHeight()) {
    //     canvasDisplay.h = toolbox.getHeight();
    //   }
    // }

    let dpRatio = 1;
    if (window.devicePixelRatio) {
      dpRatio = window.devicePixelRatio;
    }
    if (dpRatio === 1) {
      this.canvas.width = canvasDisplay.w;
      this.canvas.height = canvasDisplay.h;
    }
    else {
      // fix blurriness on retina displays
      this.canvas.width = canvasDisplay.w * dpRatio;
      this.canvas.height = canvasDisplay.h * dpRatio;
      this.canvas.style.width = canvasDisplay.w + 'px';
      this.canvas.style.height = canvasDisplay.h + 'px';
      const ctx = this.canvas.getContext('2d');
      ctx.scale(dpRatio, dpRatio);
    }

    return canvasDisplay;
  }

  /**
   * post-animation callback is the only way to prevent notes from screwing up context font (why?)
   */
  applyState(animate: boolean, callback: () => void) {
    const diagram = this; // forEach inner access

    if (this.flow.steps) {
      this.flow.steps.forEach(function (step) {
        diagram.getStep(step.id).instances = diagram.getStepInstances(step.id);
      });
    }

    diagram.steps.forEach(function (step) {
      if (step.step.links) {
        step.step.links.forEach(function (link) {
          diagram.getLink(link.id).instances = diagram.getLinkInstances(link.id);
        });
      }
    });

    if (this.flow.subflows) {
      this.flow.subflows.forEach(function (subproc) {
        const subflow = diagram.getSubflow(subproc.id);
        subflow.instances = diagram.getSubflowInstances(subproc.id);
        // needed for subflow & task instance retrieval
        subflow.mainFlowInstanceId = diagram.instance.id;
        if (subflow.subflow.steps) {
          subflow.subflow.steps.forEach(function (step) {
            subflow.getStep(step.id).instances = subflow.getStepInstances(step.id);
          });
        }
        subflow.steps.forEach(function (step) {
          if (step.step.links) {
            step.step.links.forEach(function (link) {
              subflow.getLink(link.id).instances = subflow.getLinkInstances(link.id);
            });
          }
        });
      });
    }

    let highlighted = null;
    const sequence = this.getSequence(true);
    if (sequence) {
      const update = function (it, slice) {
        let highlight = false;
        if (it instanceof Step) {
          if (animate) {
            // TODO: more sensible live scrolling based on ultimate endpoint (esp highlight)
            diagram.scrollIntoView(it, slice);
          }
          if (diagram.stepInstanceId) {
            it.instances.forEach(function (inst) {
              if (inst.id === diagram.stepInstanceId) {
                highlight = true;
              }
            });
          }
        }
        it.draw(animate ? slice : null);
        if (highlight) {
          it.highlight();
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
          else {
            callback();
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
        callback();
      }
    }
  }

  applyData() {
    const diagram = this; // forEach inner access

    if (this.data.hotspots && this.data.hotspots.length) {
      const hottest = this.data.hotspots.reduce((max, cur) => cur.ms > max.ms ? cur : max);
      diagram.steps.forEach(function (step) {
        const hotspot = diagram.data.hotspots.find(hs => ('s' + hs.id) === step.step.id);
        if (hotspot && hotspot.ms) {
          step.data = { message: hotspot.ms + ' ms', heat: hotspot.ms / hottest.ms };
          step.data.color = "hsl(" + ((1.0 - step.data.heat) * 240) + ", 100%, 50%)";
          step.draw();
        }
      });
      if (diagram.subflows) {
        diagram.subflows.forEach(function (subflow) {
          subflow.steps.forEach(function (step) {
            const hotspot = diagram.data.hotspots.find(hs => ('s' + hs.id) === step.step.id);
            if (hotspot && hotspot.ms) {
              step.data = { message: hotspot.ms + ' ms', heat: hotspot.ms / hottest.ms };
              step.data.color = "hsl(" + ((1.0 - step.data.heat) * 240) + ", 100%, 50%)";
              step.draw();
            }
          });
        });
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
      if (!runtime || link.instances.length > 0) {
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

  getStart(): Step | undefined {
    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].step.path === this.startDescriptor.path) {
        return this.steps[i];
      }
    }
  }

  makeRoom(canvasDisplay: Display, display: Display) {
    if (display.w > canvasDisplay.w) {
      canvasDisplay.w = display.w;
    }
    if (display.h > canvasDisplay.h) {
      canvasDisplay.h = display.h;
    }
  }

  getStep(stepId: string): Step | undefined {
    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].step.id === stepId) {
        return this.steps[i];
      }
    }
  }

  getLink(linkId: string): Link | undefined {
    for (let i = 0; i < this.links.length; i++) {
      if (this.links[i].link.id === linkId) {
        return this.links[i];
      }
    }
  }

  getLinks(step: Step): Link[] {
    const links: Link[] = [];
    for (let i = 0; i < this.links.length; i++) {
      if (step.step.id === this.links[i].to.step.id || step.step.id === this.links[i].from.step.id) {
        links.push(this.links[i]);
      }
    }
    return links;
  }

  getOutLinks(step: Step): Link[] {
    let links: Link[] = [];
    for (let i = 0; i < this.links.length; i++) {
      if (step.step.id === this.links[i].from.step.id) {
        links.push(this.links[i]);
      }
    }
    this.subflows.forEach(function (subflow) {
      links = links.concat(subflow.getOutLinks(step));
    });
    return links;
  }

  getSubflow(subflowId: string): Subflow | undefined {
    for (let i = 0; i < this.subflows.length; i++) {
      if (this.subflows[i].subflow.id === subflowId) {
        return this.subflows[i];
      }
    }
  }

  getNote(noteId: string): Note | undefined {
    for (let i = 0; i < this.notes.length; i++) {
      if (this.notes[i].note.id === noteId) {
        return this.notes[i];
      }
    }
  }

  get(id: string): Step | Link | Subflow | Note {
    if (id.startsWith('s')) {
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

  /**
   * Whether the obj can be edited at instance level.
   * Cannot have instances and (TODO) must be reachable downstream of a currently paused step.
   */
  isInstanceEditable(id: string): boolean {
    if (this.allowInstanceEdit) {
      let obj = this.get(id);
      if (!obj && this.subflows) {
        for (let i = 0; i < this.subflows.length; i++) {
          obj = this.subflows[i].get(id);
          if (obj) break;
        }
      }
      if (obj) {
        if (obj.type === 'subflow' && obj.instances && obj.instances.length === 1 && obj.instances[0].status === 'In Progress') {
          return true;
        }
        if (!obj.instances || !obj.instances.length) {
          return true;
        }
      }
    }
  }

  getDescriptor(name: string): Descriptor {
    if (this.descriptors) {
      for (let i = 0; i < this.descriptors.length; i++) {
        const descriptor = this.descriptors[i];
        if (descriptor.path === name) {
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

  addStep(descriptorName: string, x: number, y: number) {
    const descriptor = this.getDescriptor(descriptorName);
    let steps = this.steps.slice(0);
    if (this.subflows) {
      for (let i = 0; i < this.subflows.length; i++) {
        steps = steps.concat(this.subflows[i].steps);
      }
    }
    const step = Step.create(this, this.genId(steps, 'step'), descriptor, x, y);
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
  }

  addLink(from: Step, to: Step) {
    let links = this.links.slice(0);
    if (this.subflows) {
      for (let i = 0; i < this.subflows.length; i++) {
        links = links.concat(this.subflows[i].links);
      }
    }
    const link = Link.create(this, this.genId(links, 'link'), from, to);
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
  }

  addSubflow(type: string, x: number, y: number) {
    const startStepId = this.genId(this.steps, 'step');
    const startLinkId = this.genId(this.links, 'link');
    const subprocId = this.genId(this.subflows, 'subflow');
    const subflow = Subflow.create(this, subprocId, startStepId, startLinkId, type, x, y);
    if (!this.flow.subflows) {
      this.flow.subflows = [];
    }
    this.flow.subflows.push(subflow.subflow);
    this.subflows.push(subflow);
  }

  addNote(x: number, y: number) {
    const note = Note.create(this, this.genId(this.notes, 'note'), x, y);
    this.flow.notes.push(note.note);
    this.notes.push(note);
  }

  genId(items: (Step | Link | Subflow | Note)[], type: FlowElementType): number {
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
    if (this.instance) {
      const insts = []; // should always return something, even if empty
      if (this.instance.stepInstances) {
        const flowInstId = this.instance.id;
        this.instance.stepInstances.forEach(function (stepInst) {
          if ('s' + stepInst.stepId === stepId) {
            stepInst.flowInstanceId = flowInstId; // needed for subflow & task instance retrieval
            insts.push(stepInst);
          }
        });
      }
      insts.sort(function (a1, a2) {
        return a2.id - a1.id;
      });
      return insts;
    }
  }

  getLinkInstances(linkId: string): LinkInstance[] {
    if (this.instance) {
      const insts = []; // should always return something, even if empty
      if (this.instance.linkInstances) {
        this.instance.linkInstances.forEach(function (linkInst) {
          if ('l' + linkInst.linkId === linkId) {
            insts.push(linkInst);
          }
        });
      }
      insts.sort(function (t1, t2) {
        return t2.id - t1.id;
      });
      return insts;
    }
  }

  getSubflowInstances(subflowId: string): SubflowInstance[] {
    if (this.instance) {
      const insts = []; // should always return something, even if empty
      if (this.instance.subflowInstances) {
        this.instance.subflowInstances.forEach(function (subInst) {
          if ('f' + subInst.subflowId === subflowId) {
            insts.push(subInst);
          }
        });
      }
      insts.sort(function (s1, s2) {
        return s2.id - s1.id;
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
        if (instance.statusCode) {
          const status = this.options.statuses[instance.statusCode];
          instance.status = status.name;
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

  drawData(display: Display, size: number, color: string, opacity: number) {
    if (opacity) {
      this.context.globalAlpha = opacity;
    }
    const rounding = this.options.data.roundingRadius;
    let x1: number, y1: number, w1: number, h1: number;
    this.rect(
      display.x,
      display.y,
      display.w,
      display.h,
      color, rounding, color);
    x1 = display.x + size;
    y1 = display.y + size;
    w1 = display.w - 2 * size;
    h1 = display.h - 2 * size;
    x1 += this.options.step.state.previous.width;
    y1 += this.options.step.state.previous.width;
    w1 -= 2 * this.options.step.state.previous.width;
    h1 -= 2 * this.options.step.state.previous.width;
    if (w1 > 0 && h1 > 0) {
      this.context.clearRect(x1, y1, w1, h1);
    }
    if (opacity) {
      this.context.globalAlpha = 1.0;
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
            context.fillStyle = this.options.defaultColor;
          }
        }
        context.stroke();
        context.lineWidth = this.options.defaultLineWidth;
        context.strokeStyle = this.options.defaultColor;
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

  drawIcon(src: string, x: number, y: number) {
    src = this.options.iconBase ? this.options.iconBase + '/' + src : src;
    if (!this.images) {
      this.images = {};
    }
    let img = this.images[src];
    if (!img) {
      img = new Image();
      img.src = src;
      const context = this.context;
      const images = this.images;
      img.onload = function () {
        context.drawImage(img, x, y);
        images[src] = img;
      };
    }
    else {
      this.context.drawImage(img, x, y);
    }
  }

  /**
   * TODO: horizontal scroll
   */
  scrollIntoView(item: Step | Link | Subflow, timeSlice = 0) {
    const centerX = item.display.x + item.display.w / 2;
    const centerY = item.display.y + item.display.h / 2;

    let container = document.body;
    if (this.containerId) {
      container = document.getElementById(this.containerId);
    }

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

  dragX: number;
  dragY: number;
  shiftDrag = false;
  hoverObj: SelectObj;

  onMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // starting points for drag
    this.dragX = x;
    this.dragY = y;

    const selObj = this.getHoverObj(x, y);

    if (!this.readonly && e.ctrlKey) {
      if (selObj) {
        if (this.selection.includes(selObj)) {
          this.selection.remove(selObj);
        }
        else {
          this.selection.add(selObj);
        }
        selObj.select();
      }
    }
    else {
      if (!this.selection.includes(selObj)) {
        // normal single select
        this.selection.setSelectObj(selObj);
        this.unselect();
        if (this.selection.getSelectObj()) {
          this.selection.getSelectObj().select();
          if (!this.readonly && e.shiftKey && this.selection.getSelectObj().type === 'step') {
            this.shiftDrag = true;
          }
        }
      }
    }
  }

  onMouseUp(e: MouseEvent) {
    if (this.shiftDrag && this.dragX && this.dragY) {
      if (this.selection.getSelectObj() && this.selection.getSelectObj().type === 'step') {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const destObj = this.getHoverObj(x, y);
        if (destObj && destObj.type === 'step') {
          this.addLink(this.selection.getSelectObj() as Step, destObj as Step);
          this.draw();
        }
      }
    }
    this.shiftDrag = false;

    if (this.marquee) {
      this.selection.setSelectObj(null);
      const selObjs = this.marquee.getSelectObjs();
      for (let i = 0; i < selObjs.length; i++) {
        selObjs[i].select();
        this.selection.add(selObjs[i]);
      }
      this.marquee = null;
    }
    else {
      this.selection.reselect();
    }
  }

  onMouseOut(e: MouseEvent) {
    document.body.style.cursor = 'default';
  }

  onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.anchor = -1;
    this.hoverObj = this.getHoverObj(x, y);
    if (this.hoverObj) {
      if (!this.readonly && (this.hoverObj === this.selection.getSelectObj())) {
        this.anchor = this.hoverObj.getAnchor(x, y);
        if (this.anchor >= 0) {
          if (this.hoverObj.type === 'link') {
            document.body.style.cursor = 'crosshair';
          }
          else {
            if (this.anchor === 0 || this.anchor === 2) {
              document.body.style.cursor = 'nw-resize';
            }
            else if (this.anchor === 1 || this.anchor === 3) {
              document.body.style.cursor = 'ne-resize';
            }
          }
        }
        else {
          document.body.style.cursor = 'pointer';
        }
      }
      else {
        document.body.style.cursor = 'pointer';
      }
    }
    else {
      document.body.style.cursor = '';
    }
  }

  onMouseDrag(e: MouseEvent) {
    if (!this.readonly && this.dragX && this.dragY && !e.ctrlKey) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const deltaX = x - this.dragX;
      const deltaY = y - this.dragY;

      if (Math.abs(deltaX) > this.options.drag.min || Math.abs(deltaY) > this.options.drag.min) {

        if (x > rect.right - this.options.padding) {
          this.canvas.width = this.canvas.width + this.options.padding;
        }
        if (y > rect.bottom - this.options.padding) {
          this.canvas.height = this.canvas.height + this.options.padding;
        }

        const selObj = this.selection.getSelectObj();
        if (selObj) {
          if (this.allowInstanceEdit && (!selObj.flowElement || !this.isInstanceEditable(selObj.flowElement.id))) {
            return;
          }

          const diagram = this;
          if (this.shiftDrag) {
            if (this.selection.getSelectObj().type === 'step') {
              this.draw();
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
              if (this.anchor === 0) {
                const hovStep = this.getHoverStep(x, y);
                if (hovStep && link.from.step.id !== hovStep.step.id) {
                  link.setFrom(hovStep);
                }
              }
              else if (this.anchor === (this.selection.getSelectObj() as Link).display.xs.length - 1) {
                const hovStep = this.getHoverStep(x, y);
                if (hovStep && link.to.step.id !== hovStep.step.id) {
                  link.setTo(hovStep);
                }
              }
              this.draw();
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
            // non-workflow selection may not be reselected after move
            const hovObj = this.getHoverObj(x, y);
            if (hovObj) {
              hovObj.select();
            }
            return true;
          }
        }
        else {
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

  onDrop(e: DragEvent, descriptorName: string): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const descriptor = this.getDescriptor(descriptorName);
    if (descriptor?.type === 'subflow') {
      this.addSubflow(descriptor.path, x, y);
    }
    else if (descriptor?.type === 'note') {
      this.addNote(x, y);
    }
    else {
      this.addStep(descriptor?.path, x, y);
    }
    this.draw();
    return true;
  }

  onDelete(e: MouseEvent, onChange) {
    const selection = this.selection;
    const selObj = this.selection.getSelectObj();
    if (selObj && selObj.type !== 'label') {
      const msg = this.selection.isMulti ? 'Delete selected elements?' : 'Delete ' + selObj.type + '?';
      this.dialog.confirm('Confirm Delete', msg, function (res) {
        if (res) {
          selection.doDelete();
          selection.diagram.draw();
          onChange();
        }
      });
    }
  }

  getLatestInstance() {
    const instances = this.selection.getSelectObj().instances;
    if (instances && instances.length) {
      return instances[0]; // they're sorted in descending order
    }
  }

  getContextMenuItems(e: MouseEvent) {
    const selObj = this.selection.getSelectObj();
    if (selObj && selObj.type === 'step') {
      const actions = [];
      if (this.instance && (this.instance.status === 'In Progress' || this.instance.status === 'Waiting')) {
        const inst = this.getLatestInstance();
        if (inst && inst.status) {
          if (inst.status === 'Failed') {
            actions.push('retry');
            actions.push('proceed');
          }
          else if (inst.status === 'Waiting' || inst.status === 'In Progress') {
            const descriptor = (selObj as Step).descriptor;
            if (inst.status === 'Waiting') {
              actions.push('proceed');
              if (descriptor && descriptor.path === this.pauseDescriptor.path) {
                actions.push('resume');
              }
            }
            if (descriptor && descriptor.category !== 'Task') {
              actions.push('fail');
            }
          }
        }
      }
      return actions;
    }
  }

  getHoverObj(x: number, y: number): SelectObj | undefined {
    if (this.zoom !== 100) {
      const scale = this.zoom / 100;
      x = x / scale;
      y = y / scale;
    }

    if (this.label.isHover(x, y)) {
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

  /**
   * when nothing selectable is hovered
   */
  getBackgroundObj(e: MouseEvent): SelectObj {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let bgObj: Diagram | Subflow = this;
    for (let i = 0; i < this.subflows.length; i++) {
      if (this.subflows[i].isHover(x, y)) {
        bgObj = this.subflows[i];
        break;
      }
    }

    if (bgObj !== this) {
      bgObj.select();
    }

    return bgObj;
  }

  /**
   * removes anchors from currently selected obj, if any
   */
  unselect() {
    this.draw();
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

