import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { Diagram } from './draw/diagram';
import { Flow } from './model/flow';
import { Descriptor, start, stop, pause, task, StandardDescriptors } from './model/descriptor';
import { Variable } from './model/variable';
import { DiagramOptions, diagramDefault } from './options';
import { DiagramStyle } from './style/style';
import { Label } from './draw/label';
import { DrawingOptions } from './draw/options';

export class FlowDiagram {

    options: DiagramOptions;
    private diagram: Diagram;
    private diagramStyle: DiagramStyle;
    flow: Flow;

    readonly = false;
    instance?: any;
    step?: string;
    editInstanceId?: string;
    data?: any;


    private down = false;
    private dragging = false;

    /**
     * Create a flow diagram
     * @param canvas html canvas
     * @param options drawing options
     * @param descriptors flow item descriptors
     */
    constructor(
        readonly canvas: HTMLCanvasElement,
        options?: DiagramOptions,
        readonly descriptors: Descriptor[] = StandardDescriptors
    ) {
        this.options = merge(diagramDefault, options || {});

        this.diagramStyle = new DiagramStyle(canvas);

        this.diagram = new Diagram(
            this.canvas,
            this.options,
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
    parse(text: string, file: string): Flow {
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
        // fix up
        flow.steps?.forEach(step => {
            step.links?.forEach(link => {
                link.from = step.id;
            });
        });
        if (flow.variables) {
            const variables: Variable[] = [];
            Object.keys(flow.variables).forEach(name => {
                const variable = flow.variables[name];
                variables.push({
                    name,
                    type: variable.type
                });
            });
            flow.variables = variables;
        }
        return flow;
    }

    /**
     * Parse and render from text
     * @param theme theme name
     * @param flow text (json or yaml), or Flow
     * @param file file name
     * @param userOptions dynamic drawing options
     * @param animate
     */
    render(theme: string, textOrFlow: string | Flow, file: string, userOptions: DiagramOptions & DrawingOptions = {}, animate = false) {

        this.flow = typeof textOrFlow === 'string' ? this.parse(textOrFlow, file) : textOrFlow;
        if (file) {
            this.flow.name = file;
            const lastDot = this.flow.name.lastIndexOf('.');
            if (lastDot > 0) {
                this.flow.name = this.flow.name.substring(0, lastDot);
            }
        }

        this.diagram.options = merge(this.options, this.diagramStyle.getDrawingOptions(theme), userOptions);
        console.debug(`merged options: ${JSON.stringify(this.diagram.options, null, 2)}`);
        this.diagram.readonly = this.readonly;
        this.canvas.style.backgroundColor = this.diagram.options.backgroundColor;
        this.draw(this.flow, animate);
    }

    /**
     * Draw a flow diagram
     * @param flow to render
     * @param animate
     */
    private draw(flow: Flow, animate = false) {
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

    onMouseMove(e: MouseEvent) {
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

    onMouseDown(e: MouseEvent) {
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

    onMouseUp(e: MouseEvent) {
        this.down = false;
        this.dragging = false;
        if (this.diagram) {
            this.diagram.onMouseUp(e);
        }
    }

    onDrop(e: DragEvent) {
        e.preventDefault();
        if (!this.readonly && this.diagram) {
            if (this.diagram.onDrop(e, e.dataTransfer.getData('text/plain'))) {
                this.handleChange();
            }
        }
    }

    onMouseOut(e: MouseEvent) {
        this.down = false;
        this.dragging = false;
        if (this.diagram) {
            this.diagram.onMouseOut(e);
        }
    }

    onDoubleClick(e: MouseEvent) {
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

    handleChange() {
        // if (this.onChange) {
        //     this.onChange(this.diagram.flow);
        // }
    }

}
