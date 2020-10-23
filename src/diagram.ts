import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { Diagram } from './draw/diagram';
import { Flow, FlowInstance } from './model/flow';
import { Descriptor, start, stop, pause, task, StandardDescriptors } from './model/descriptor';
import { DiagramOptions, diagramDefault } from './options';
import { DiagramStyle } from './style/style';
import { Label } from './draw/label';
import { DrawingOptions } from './draw/options';

export class FlowDiagram {

    private diagram: Diagram;
    private theme: string;
    private drawingOptions: DrawingOptions;
    flow: Flow;

    readonly = false;
    step?: string;
    editInstanceId?: string;
    data?: any;

    /**
     * Create a flow diagram
     * @param flow Flow model or text to parse for flow
     * @param canvas html canvas
     * @param filepath file path of flow (for error messages)
     * @param descriptors flow item descriptors
     */
    constructor(
        flow: string | Flow,
        readonly canvas: HTMLCanvasElement,
        readonly filepath: string,
        readonly descriptors: Descriptor[] = StandardDescriptors
    ) {
        this.flow = typeof flow === 'string' ? FlowDiagram.parse(flow, filepath) : flow;

        this.diagram = new Diagram(
            this.canvas,
            diagramDefault,
            this.descriptors
        );

        this.diagram.startDescriptor = start;
        this.diagram.stopDescriptor = stop;
        this.diagram.pauseDescriptor = pause;
        this.diagram.taskDescriptor = task;
    }

    /**
     * Parse flow from text
     * @param text json or yaml
     * @param file file name
     */
    static parse(text: string, file: string): Flow {
        let flow: Flow;
        if (text.startsWith('{')) {
            try {
                flow = JSON.parse(text);
            } catch (err) {
                throw new Error(`Failed to parse ${file}: ${err.message}`);
            }
        } else {
            flow = jsYaml.safeLoad(text, { filename: file });
        }
        flow.path = file.replace(/\\/g, '/'); // TODO relative to asset path
        return flow;
    }

    /**
     * Parse and render from text
     * @param options rendering options
     */
    render(options: DiagramOptions & DrawingOptions = {}, animate = false) {
        // loading styles is expensive, so perform only if theme has changed
        if (!this.drawingOptions || (options.theme && options.theme !== this.theme)) {
            this.theme = options.theme;
            const diagramStyle = new DiagramStyle(this.canvas);
            this.drawingOptions = diagramStyle.getDrawingOptions(options.theme);
        }
        this.diagram.options = merge(diagramDefault, this.drawingOptions, options);
        console.debug(`merged options: ${JSON.stringify(this.diagram.options, null, 2)}`);
        this.diagram.readonly = this.readonly;
        this.canvas.style.backgroundColor = this.diagram.options.backgroundColor;
        this.draw(this.flow, animate);
    }

    /**
     * Serialize to JSON string
     * @param flow
     * @param indent
     */
    toJson(indent = 2): string {
        return JSON.stringify(this.flow, null, indent);
    }

    toYaml(indent = 2): string {
        return jsYaml.safeDump(this.flow, { noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
    }

    get instance(): FlowInstance {
        return this.diagram.instance;
    }
    set instance(instance: FlowInstance) {
        this.diagram.instance = instance;
    }

    /**
     * Draw a flow diagram
     * @param flow to render
     * @param animate
     */
    private draw(flow: Flow, animate: boolean) {
        this.diagram.draw(
            flow,
            this.instance,
            this.step,
            animate,
            this.editInstanceId,
            this.data
        );

        // events
        this.canvas.onmousedown = e => this.onMouseDown(e);
        this.canvas.onmouseup = e => this.onMouseUp(e);
        this.canvas.onmousemove = e => this.onMouseMove(e);
        this.canvas.onmouseout = e => this.onMouseOut(e);
        this.canvas.ondblclick = e => this.onDoubleClick(e);

        this.canvas.ondragover = e => {
            if (!this.readonly) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            }
        };
        this.canvas.ondrop = e => this.onDrop(e);
    }

    /**
     * Without path or extension
     */
    get flowName(): string {
        const lastSlash = this.flow.path.lastIndexOf('/');
        if (lastSlash > 0 && lastSlash < this.flow.path.length - 1) {
          return this.flow.path.substring(lastSlash + 1);
        }
        const lastDot = this.flow.path.lastIndexOf('.');
        if (lastDot > 1) {
          return this.flow.path.substring(0, lastDot);
        }
    }



    private down = false;
    private dragging = false;

    private onMouseMove(e: MouseEvent) {
        if (this.down && !this.readonly) {
            this.dragging = true;
        }
        if (this.diagram) {
            if (this.dragging) {
                if (this.diagram.onMouseDrag(e)) {
                    this.handleChange();
                }
            }
            else {
                this.diagram.onMouseMove(e);
            }
        }
    }

    private onMouseDown(e: MouseEvent) {
        this.down = true;
        // $scope.closeContextMenu();
        if (this.diagram) {
            this.diagram.onMouseDown(e);
            const selObj = this.diagram.selection.getSelectObj();
            if (selObj && selObj.type === 'label') {
                // selObj = (selObj as Label).owner;
            }
            if (selObj) {
                // Inspector.setObj(selObj, this.options.readonly && e.button !== 2);
            }
            else {
                const bgObj = this.diagram.getBackgroundObj(e);
                if (bgObj) {
                    // Inspector.setObj(bgObj, this.options.readonly && e.button !== 2);
                }
            }
        }
    }

    private onMouseUp(e: MouseEvent) {
        this.down = false;
        this.dragging = false;
        if (this.diagram) {
            this.diagram.onMouseUp(e);
        }
    }

    private onDrop(e: DragEvent) {
        e.preventDefault();
        if (!this.readonly && this.diagram) {
            if (this.diagram.onDrop(e, e.dataTransfer.getData('text/plain'))) {
                this.handleChange();
            }
        }
    }

    private onMouseOut(e: MouseEvent) {
        this.down = false;
        this.dragging = false;
        if (this.diagram) {
            this.diagram.onMouseOut(e);
        }
    }

    private onDoubleClick(e: MouseEvent) {
        if (this.diagram && !this.readonly) {
            let selObj = this.diagram.selection.getSelectObj();
            if (selObj && selObj.type === 'label') {
                selObj = (selObj as Label).owner;
            }
            if (selObj) {
                // Inspector.setObj(selObj, true);
            }
        }
    }

    private handleChange() {
        // if (this.onChange) {
        //     this.onChange(this.diagram.flow);
        // }
    }

}
