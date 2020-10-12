import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { Diagram } from './draw/diagram';
import { Flow } from './flow';
import { Specifier, start, stop, pause, task, StandardSpecifiers } from './spec';
import { Variable } from './var';
import { DiagramOptions, DefaultOptions } from './options';

export class FlowDiagram {

    options: DiagramOptions;
    diagram: Diagram;

    private down = false;
    private dragging = false;
    private dragIn?: string;

    /**
     * Create a flow diagram
     * @param canvas html canvas
     * @param options drawing options
     * @param specifiers step specifiers
     * @param readonly
     */
    constructor(
        readonly canvas: HTMLCanvasElement,
        options?: DiagramOptions,
        readonly specifiers: Specifier[] = StandardSpecifiers,
        readonly readonly = false
    ) {
        this.options = merge(DefaultOptions.diagram.light, options || {});

        this.diagram = new Diagram(
            this.canvas,
            this.options,
            this.specifiers,
            !readonly
        );

        this.diagram.startSpec = start;
        this.diagram.stopSpec = stop;
        this.diagram.pauseSpec = pause;
        this.diagram.taskSpec = task;

        // if ($scope.editable) {
        //     $scope.toolbox = Toolbox.getToolbox();
        //     $scope.toolbox.init($scope.specifiers, $scope.hubBase);
        // }
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
     * Draw a flow diagram
     * @param flow to render
     * @param instance runtime instance (TODO: define class)
     * @param step step id or step instance id to highlight
     * @param animate
     * @param instanceEdit
     * @param data hotspots
     */
    draw(flow: Flow, instance?: any, step?: string, animate = false, instanceEdit = false, data?: any) {
        this.diagram.draw(
            flow,
            instance,
            step,
            animate,
            instanceEdit,
            data
        );

        // events
        this.canvas.onmousedown = e => this.onMouseDown(e);
        this.canvas.onmouseup = e => this.onMouseUp(e);
        this.canvas.onmousemove = e => this.onMouseMove(e);
        this.canvas.onmouseenter = e => this.onMouseEnter(e);
        this.canvas.onmouseover = e => this.onMouseOver(e);
        this.canvas.onmouseout = e => this.onMouseOut(e);
        this.canvas.ondblclick = e => this.onDoubleClick(e);
    }

    /**
     * Parse and render from text
     * @param text json or yaml
     * @param file file name
     * @param instance runtime instance (TODO: define class)
     * @param step step id or step instance id to highlight
     * @param animate
     * @param instanceEdit
     * @param data hotspots
     */
    render(text: string, file: string, instance?: any, step?: string, animate = false, instanceEdit = false, data?: any) {
        if (typeof text === 'string') {
            const flow = this.parse(text, file);
            if (file) {
                flow.name = file;
                const lastDot = flow.name.lastIndexOf('.');
                if (lastDot > 0) {
                    flow.name = flow.name.substring(0, lastDot);
                }
            }
            this.draw(flow, instance, step, animate, instanceEdit, data);
        }
    }

    onMouseMove(e: MouseEvent) {
        if (this.dragIn && !this.readonly) {
            document.body.style.cursor = 'copy';
        }
        else {
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
    }

    onMouseDown(e: MouseEvent) {
        this.down = true;
        // $scope.closeContextMenu();
        if (this.diagram) {
            this.diagram.onMouseDown(e);
            let selObj = this.diagram.selection.getSelectObj();
            if (selObj && selObj.isLabel) {
                selObj = selObj.owner;
            }
            if (selObj) {
                // Inspector.setObj(selObj, !$scope.editable && e.button !== 2);
            }
            else {
                const bgObj = this.diagram.getBackgroundObj(e);
                if (bgObj) {
                    // Inspector.setObj(bgObj, !$scope.editable && e.button !== 2);
                }
            }
        }
    }

    onMouseUp(e: MouseEvent) {
        this.down = false;
        this.dragging = false;
        if (this.diagram) {
            if (this.dragIn) {
                if (this.diagram.onDrop(e, this.dragIn)) {
                    this.handleChange();
                }
            }
            else {
                this.diagram.onMouseUp(e);
            }
        }
        this.dragIn = null;
    }

    onMouseOver(e: MouseEvent) {
        if (e.buttons === 1 /* && this.toolbox && this.toolbox.getSelected() */) {
            // this.dragIn = 'com.centurylink.mdw.workflow.activity.process.InvokeSubProcessActivity'; // this.toolbox.getSelected();
        }
    }

    onMouseEnter(e: MouseEvent) {
        if (e.buttons === 1 /* && this.toolbox && this.toolbox.getSelected() */) {
            //
        }
    }

    onMouseOut(e: MouseEvent) {
        this.down = false;
        this.dragging = false;
        this.dragIn = null;
        if (this.diagram) {
            this.diagram.onMouseOut(e);
        }
    }

    onDoubleClick(e: MouseEvent) {
        if (this.diagram && !this.readonly) {
            let selObj = this.diagram.selection.getSelectObj();
            if (selObj && selObj.isLabel) {
                selObj = selObj.owner;
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
