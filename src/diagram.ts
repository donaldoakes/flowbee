import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { Diagram } from './draw/diagram';
import { Flow, Subflow, FlowInstance } from './model/flow';
import { Step } from './model/step';
import { Link } from './model/link';
import { Note } from './model/note';
import { Descriptor, StandardDescriptors } from './model/descriptor';
import { DiagramOptions, diagramDefault, Mode } from './options';
import { DiagramStyle } from './style/style';
import { DrawingOptions } from './draw/options';
import { Label } from './draw/label';
import { TypedEvent, Listener, FlowElementSelectEvent, FlowChangeEvent, FlowElementUpdateEvent, Disposable, FlowElementAddEvent } from './event';
import { SelectObj } from './draw/selection';
import { ContextMenu, ContextMenuProvider, DefaultMenuProvider } from './menu';
import { DefaultDialog, DialogProvider } from './dialog';
import { FlowElement, getFlowName } from './model/element';
import { Clipper } from './clip';
import { Title } from './draw/display';

export class FlowDiagram {

    private diagram: Diagram;
    theme: string;
    drawingOptions: DrawingOptions;
    flow: Flow;
    contextMenuProvider: ContextMenuProvider;
    dialogProvider: DialogProvider;
    private clipper: Clipper;

    readonly = false;
    step?: string;

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
        readonly descriptors: Descriptor[] = StandardDescriptors,
        options?: DiagramOptions
    ) {
        this.flow = typeof flow === 'string' ? FlowDiagram.parse(flow, filepath) : flow;
        canvas.tabIndex = 100000; // allow key events
        canvas.style.outline = 'none';

        this.diagram = new Diagram(
            this.canvas,
            this.descriptors,
            merge(diagramDefault, options || {}),
        );
        this.canvas.setAttribute('flowbee-canvas', this.flowName);
        this.selectObj = this.diagram;
        this.clipper = new Clipper(this);
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
            flow = jsYaml.load(text, { filename: file }) as Flow;
        }
        flow.type = 'flow';
        flow.path = file.replace(/\\/g, '/');
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
     * @param indent
     */
    toJson(indent = 2): string {
        return JSON.stringify(this.cleanedUp, null, indent);
    }

    toYaml(indent = 2): string {
        return jsYaml.dump(this.cleanedUp, { sortKeys: true, noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
    }

    private cleanup(element: FlowElement): FlowElement {
        const { type: _type, ...clean } = element;
        return clean;
    }

    private get cleanedUp(): Flow {
        const { id: _id, type: _type, path: _path, readonly: _readonly, ...flow } = this.flow;
        if (flow.subflows) {
            flow.subflows = flow.subflows.map(sf => {
                const subflow = this.cleanup(sf) as Subflow;
                if (subflow.steps) {
                    subflow.steps = subflow.steps.map(s => {
                        const step = this.cleanup(s) as Step;
                        if (step.links) {
                            step.links = step.links.map(l => this.cleanup(l) as Link);
                        }
                        return step;
                    });
                }
                return subflow;
            });
        }
        if (flow.steps) {
            flow.steps = flow.steps.map(s => {
                const step = this.cleanup(s) as Step;
                if (step.links) {
                    step.links = step.links.map(l => this.cleanup(l) as Link);
                }
                return step;
            });
        }
        if (flow.notes) {
            flow.notes = flow.notes.map(n => this.cleanup(n) as Note);
        }
        return flow as Flow;
    }

    get zoom(): number {
        return this.diagram.zoom;
    }
    set zoom(zoom: number) {
        this.diagram.zoomCanvas(zoom);
    }

    get mode(): Mode {
        return this.diagram.mode;
    }
    set mode(mode: Mode) {
        this.diagram.mode = mode;
        if (mode !== 'runtime') {
            this.instance = null;
        }
        if (this.diagram.flow) {
            this.diagram.draw();
        }
    }

    get instance(): FlowInstance | null {
        return this.diagram.instance;
    }
    set instance(instance: FlowInstance | null) {
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
            animate
        );

        // events
        this.canvas.onmousedown = e => this.onMouseDown(e);
        this.canvas.onmouseup = e => this.onMouseUp(e);
        this.canvas.onclick = e => this.onMouseClick(e);
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

        this.canvas.oncontextmenu = e => this.onContextMenu(e);

        this.canvas.onblur = e => {
            if (e.relatedTarget) {
                const rt = e.relatedTarget as any;
                if (rt.getAttribute && rt.getAttribute('data-flowbee-menu-item')) {
                    return; // avoid premature menu close
                }
            }
            if (this.menu) {
                this.menu.close();
                this.menu = null;
            }
        };
        this.canvas.onkeydown = e => {
            if (!this.readonly) {
                const macCmd = navigator.platform.startsWith('Mac') && e.metaKey;
                const ctrlCmd = macCmd || e.ctrlKey;
                if (ctrlCmd && e.key === 'x') {
                    e.preventDefault();
                    this.clipper.cut();
                } else if (ctrlCmd && e.key === 'c') {
                    e.preventDefault();
                    this.clipper.copy();
                } else if (ctrlCmd && e.key === 'v') {
                    e.preventDefault();
                    this.clipper.paste();
                } else if (e.key === 'Delete' || (macCmd && e.key === 'Backspace')) {
                    e.preventDefault();
                    this.clipper.delete();
                }
            }
        };
    }

    get flowName(): string {
        return getFlowName(this.flow);
    }

    select(elementId: string, scrollIntoView = false) {
        const selObj = this.diagram.selectElement(elementId);
        if (selObj) {
            this.selectObj = selObj;
            if (scrollIntoView) this.diagram.scrollIntoView(selObj as any);
        }
    }

    focus() {
        this.canvas.focus();
    }

    get selected(): FlowElement[] {
        const selected: FlowElement[] = [];
        this.diagram.selection.selectObjs.forEach(selObj => {
          if (selObj.flowElement) selected.push(selObj.flowElement);
        });
        return selected;
    }

    async handleInsert(flowElements: FlowElement[]) {
        const selObjs = this.diagram.insert(flowElements);
        this.diagram.selection.selectObjs = selObjs;
        this.diagram.draw();
        this.diagram.selection.select();
        this.selectObj = this.diagram.selection.getSelectObj() || this.diagram;
        this._onFlowElementSelect.emit( { element: this.selectObj.flowElement } );
        this.handleChange();
    }

    async handleDelete() {
        const selection = this.diagram.selection;
        const selObj = selection?.getSelectObj();
        if (selObj) {
            let isDelete = false;
            if (this.diagram.options.promptToDelete) {
                const text = selection.isMulti() ? 'Delete selected elements?' : 'Delete ' + selObj.type + '?';
                const dialog = this.dialogProvider || new DefaultDialog();
                isDelete = await dialog.confirm({ title: 'Confirm Delete', text, level: 'warn' });
            } else {
                isDelete = true;
            }
            if (isDelete) {
                selection.doDelete();
                this.diagram.draw();
                this.selectObj = this.diagram;
                this._onFlowElementSelect.emit( { element: this.diagram.flow } );
                this.handleChange();
            }
        }
    }

    // Events

    private _onFlowChange = new TypedEvent<FlowChangeEvent>();
    onFlowChange(listener: Listener<FlowChangeEvent>): Disposable {
        return this._onFlowChange.on(listener);
    }

    private _onFlowElementAdd = new TypedEvent<FlowElementAddEvent>();
    onFlowElementAdd(listener: Listener<FlowElementAddEvent>): Disposable {
        return this._onFlowElementAdd.on(listener);
    }

    private _onFlowElementSelect = new TypedEvent<FlowElementSelectEvent>();
    onFlowElementSelect(listener: Listener<FlowElementSelectEvent>): Disposable {
        return this._onFlowElementSelect.on(listener);
    }

    private _onFlowElementUpdate = new TypedEvent<FlowElementUpdateEvent>();
    onFlowElementUpdate(listener: Listener<FlowElementUpdateEvent>): Disposable {
        return this._onFlowElementUpdate.on(listener);
    }

    private _onFlowElementDrill = new TypedEvent<FlowElementSelectEvent>();
    onFlowElementDrill(listener: Listener<FlowElementSelectEvent>): Disposable {
        return this._onFlowElementDrill.on(listener);
    }

    private down = false;
    private dragging = false;
    private selectObj: SelectObj;
    private menu: ContextMenu | null = null;

    private onMouseMove(e: MouseEvent) {
        if (this.down && !this.readonly) {
            this.dragging = true;
        }
        if (this.dragging) {
            this.diagram.onMouseDrag(e);
        }
        else {
            this.diagram.onMouseMove(e);
        }
    }

    private onMouseDown(e: MouseEvent) {
        this.down = true;
        if (this.menu) {
            this.menu.close();
            this.menu = null;
        }
        this.diagram.onMouseDown(e);
    }

    private onMouseClick(e: MouseEvent) {
        const selObj = this.selObj;
        if (selObj.type === 'flow' && this.selectObj.type === 'flow') {
            // only fire on first diagram select
            return;
        }
        if (this.diagram.mode !== 'connect') {
            this._onFlowElementSelect.emit({
                element: selObj.flowElement,
                instances: selObj.instances
            });
        }
        this.selectObj = selObj;
    }

    private onMouseUp(e: MouseEvent) {
        this.down = false;
        this.dragging = false;
        const chg = this.diagram.onMouseUp(e);
        if (chg) {
            this.handleChange();
            if (typeof chg === 'object') {
                // link added
                this._onFlowElementAdd.emit({
                    element: chg
                });
            }
        }
    }

    private onDrop(e: DragEvent) {
        e.preventDefault();
        if (!this.readonly) {
            const data = e.dataTransfer.getData('application/json');
            const descriptor = JSON.parse(data);
            if (this.diagram.onDrop(e, descriptor)) {
                this.diagram.canvas.focus();
                this.handleChange();
                this._onFlowElementAdd.emit({
                    element: this.diagram.selection.getSelectObj().flowElement,
                    descriptor
                });
            }
        }
    }

    private onMouseOut(e: MouseEvent) {
        this.down = false;
        this.dragging = false;
        this.diagram.onMouseOut(e);
    }

    private onDoubleClick(e: MouseEvent) {
        const emitDrill = () => {
            this._onFlowElementDrill.emit( {
                element: this.selObj.flowElement,
                instances: this.selObj.instances
            });
        };

        if (this.readonly) {
            emitDrill();
        } else {
            const selObj = this.selObj;
            if (selObj.type === 'step' || selObj.type === 'subflow') {
                const title = (selObj as any).title as Title;
                const rect = this.canvas.getBoundingClientRect();
                const { x, y } = this.diagram.unscale(e.clientX - rect.left, e.clientY - rect.top);
                const onTitle = x >= title.x && x <= title.x + title.w && y >= title.y && y <= title.y + title.h;
                if (onTitle) {
                    (selObj as any).edit(text => {
                        (selObj.flowElement as any).name = text;
                        this._onFlowElementUpdate.emit({ element: selObj.flowElement });
                        this.handleChange();
                    });
                } else {
                    emitDrill();
                }
            } else if (selObj.type === 'link' || selObj.type === 'note') {
                (selObj as any).edit(text => {
                    this._onFlowElementUpdate.emit({ element: selObj.flowElement });
                    this.handleChange();
                });
            } else if (selObj.type === 'flow') {
                emitDrill();
            }
        }
    }

    private onContextMenu(e: MouseEvent) {
        e.preventDefault();
        this.selectObj = this.selObj;
        const element = this.selectObj.flowElement;
        if (element) {
            const provider = this.contextMenuProvider || new DefaultMenuProvider(this);
            const evt = {
                element,
                instances: this.selObj?.instances
            };
            const items = provider.getItems(evt);
            if (items && items.length > 0) {
                this.menu = new ContextMenu(this.diagram.container, items);
                const options = {
                    theme: this.diagram.options.theme,
                    iconBase: this.diagram.options.iconBase
                };
                this.menu.render(options, e.pageX + 3, e.pageY, item => {
                    provider.onSelectItem({ item, ...evt });
                    this.menu = null;
                });
            }
        }
    }

    private handleChange() {
        this._onFlowChange.emit({
            flow: this.flow
        });
    }

    private get selObj(): SelectObj {
        let selObj = this.diagram.selection.getSelectObj() || this.diagram;
        if (selObj.type === 'label') {
            selObj = (selObj as Label).owner;
        }
        return selObj;
    }
}