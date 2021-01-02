import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { Diagram } from './draw/diagram';
import { Flow, FlowInstance } from './model/flow';
import { Descriptor, StandardDescriptors } from './model/descriptor';
import { DiagramOptions, diagramDefault } from './options';
import { DiagramStyle } from './style/style';
import { DrawingOptions } from './draw/options';
import { Label } from './draw/label';
import { TypedEvent, Listener, FlowElementSelectEvent, FlowChangeEvent, FlowElementUpdateEvent } from './event';
import { SelectObj } from './draw/selection';
import { ContextMenu, ContextMenuProvider, DefaultMenuProvider } from './menu';
import { DefaultDialog, DialogProvider } from './dialog';
import { FlowElement, getFlowName } from './model/element';
import { Clipper } from './clip';

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
        readonly descriptors: Descriptor[] = StandardDescriptors
    ) {
        this.flow = typeof flow === 'string' ? FlowDiagram.parse(flow, filepath) : flow;
        canvas.tabIndex = 100000; // allow key events
        canvas.style.outline = 'none';

        this.diagram = new Diagram(
            this.canvas,
            diagramDefault,
            this.descriptors
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
            flow = jsYaml.safeLoad(text, { filename: file });
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
     * @param flow
     * @param indent
     */
    toJson(indent = 2): string {
        const { id: _id, type: _type, path: _path, ...flow } = this.flow;
        return JSON.stringify(flow, null, indent);
    }

    toYaml(indent = 2): string {
        const { id: _id, type: _type, path: _path, ...flow } = this.flow;
        return jsYaml.safeDump(flow, { sortKeys: true, noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
    }

    get zoom(): number {
        return this.diagram.zoom;
    }
    set zoom(zoom: number) {
        this.diagram.zoomCanvas(zoom);
    }

    get mode(): 'select' | 'connect' | 'runtime' {
        return this.diagram.mode;
    }
    set mode(mode: 'select' | 'connect' | 'runtime') {
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
    onFlowChange(listener: Listener<FlowChangeEvent>) {
        this._onFlowChange.on(listener);
    }

    private _onFlowElementSelect = new TypedEvent<FlowElementSelectEvent>();
    onFlowElementSelect(listener: Listener<FlowElementSelectEvent>) {
        this._onFlowElementSelect.on(listener);
    }

    private _onFlowElementUpdate = new TypedEvent<FlowElementUpdateEvent>();
    onFlowElementUpdate(listener: Listener<FlowElementUpdateEvent>) {
        this._onFlowElementUpdate.on(listener);
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
            if (this.diagram.onMouseDrag(e)) {
                this.handleChange();
            }
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
        this.diagram.onMouseUp(e);
    }

    private onDrop(e: DragEvent) {
        e.preventDefault();
        if (!this.readonly) {
            if (this.diagram.onDrop(e, e.dataTransfer.getData('text/plain'))) {
                this.diagram.canvas.focus();
                this.handleChange();
            }
        }
    }

    private onMouseOut(e: MouseEvent) {
        this.down = false;
        this.dragging = false;
        this.diagram.onMouseOut(e);
    }

    private onDoubleClick(e: MouseEvent) {
        if (!this.readonly) {
            const selObj = this.selObj;
            if (selObj.type === 'step' || selObj.type === 'link'
                  || selObj.type === 'subflow' || selObj.type === 'note') {
                (selObj as any).edit(text => {
                    if (selObj.type === 'step' || selObj.type === 'subflow') {
                        (selObj.flowElement as any).name = text;
                    }
                    this._onFlowElementUpdate.emit({ element: selObj.flowElement });
                    this.handleChange();
                });
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