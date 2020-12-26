import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { FlowElementInstance, FlowElementUpdateEvent, Listener, TypedEvent } from './event';
import { FlowElement, getLabel } from './model/element';
import { ConfigTemplate } from './model/template';
import { configuratorDefault, ConfiguratorOptions } from './options';
import { Styles } from './style/style';
import { Theme } from './theme';
import { Table } from './table';

/**
 * TODO: make template optional, and then display all attributes
 * as text widgets on one tab
 */
export class Configurator {

    private styles: Styles;
    private stylesObj: object;

    private div: HTMLDivElement;
    private header: HTMLDivElement;
    private title: HTMLDivElement;
    private content: HTMLDivElement;
    private tabs: HTMLUListElement;
    private tabContent: HTMLDivElement;
    private activeTab?: { name: string, tab: HTMLLIElement };

    flowElement: FlowElement;
    instance?: FlowElementInstance;
    template?: ConfigTemplate;

    private options: ConfiguratorOptions;

    private isSized = false;
    private container: HTMLElement;
    private drag: Drag | null = null;
    private edge: Edge | null;

    private _onFlowElementUpdate = new TypedEvent<FlowElementUpdateEvent>();
    onFlowElementUpdate(listener: Listener<FlowElementUpdateEvent>) {
        this._onFlowElementUpdate.on(listener);
    }

    get width(): number {
        return this.div.offsetWidth;
    }
    set width(width: number) {
        this.div.style.width = width + 'px';
    }

    get height(): number {
        return this.div.offsetHeight;
    }
    set height(height: number) {
        this.div.style.height = height + 'px';
        this.tabContent.style.height = (this.div.offsetHeight - this.header.offsetHeight - 2) + 'px';
    }

    get left(): number {
        return this.div.offsetLeft;
    }
    set left(left: number) {
        this.div.style.left = left + 'px';
    }

    get top(): number {
        return this.div.offsetTop;
    }
    set top(top: number) {
        this.div.style.top = top + 'px';
    }

    constructor(container?: HTMLElement) {
        this.container = container || document.body;

        // build html
        this.div = document.createElement('div') as HTMLDivElement;
        this.header = document.createElement('div') as HTMLDivElement;
        this.header.className = 'flowbee-config-header';
        this.title = document.createElement('div') as HTMLDivElement;
        this.title.className = 'flowbee-config-title';
        this.header.appendChild(this.title);
        const close = document.createElement('div') as HTMLDivElement;
        close.className = 'flowbee-config-close';
        close.onclick = _e => this.close();
        const closeImg = document.createElement('input') as HTMLInputElement;
        closeImg.type = 'image';
        closeImg.alt = closeImg.title = 'Close Configurator';
        closeImg.setAttribute('data-icon', 'close.svg');
        close.appendChild(closeImg);
        this.header.appendChild(close);
        this.div.appendChild(this.header);
        this.content = document.createElement('div') as HTMLDivElement;
        this.content.className = 'flowbee-config-content';
        const tabbedContent = document.createElement('div') as HTMLDivElement;
        tabbedContent.className = 'flowbee-config-tabbed-content';
        this.tabs = document.createElement('ul') as HTMLUListElement;
        this.tabs.className = 'flowbee-config-tabs';
        tabbedContent.appendChild(this.tabs);
        this.tabContent = document.createElement('div') as HTMLDivElement;
        this.tabContent.className = 'flowbee-config-tab-content';
        tabbedContent.appendChild(this.tabContent);
        this.content.appendChild(tabbedContent);
        this.div.appendChild(this.content);
        document.body.appendChild(this.div);

        new ResizeObserver(() => {
            if (this.isOpen) {
                this.fit();
            }
        }).observe(this.container);
     }

    render(
        flowElement: FlowElement,
        instances: FlowElementInstance[],
        template: ConfigTemplate | string,
        options: ConfiguratorOptions
    ) {

        if (!flowElement) throw new Error('flowElement is required');

        this.options = merge(configuratorDefault, options);

        // loading styles is expensive, so only load if theme has changed
        if (!this.styles || !this.stylesObj || (options.theme && options.theme !== this.styles.theme.name)) {
            this.styles = new Styles('flowbee-configurator', new Theme(options.theme), this.div);
            this.stylesObj = this.styles.getObject();
            this.div.className = `flowbee-configurator flowbee-configurator-${this.options.theme || ''}`;
        }

        this.flowElement = flowElement;
        this.instance = instances.length > 0 ? instances[instances.length - 1] : null;
        this.template = typeof template === 'string' ? Configurator.parseTemplate(template, getLabel(flowElement)) : template;
        if (this.options.sourceTab) {
            this.template['Source'] = { widgets: [{ type: 'source' }] };
        }

        // clear old tabs and content
        this.tabs.innerHTML = '';

        // title
        this.title.innerText = getLabel(flowElement);

        const keys = Object.keys(this.template);
        for (let i = 0; i < keys.length; i++) {
            const tabName = keys[i];
            const tab = this.addTab(tabName);
            if (i === 0) this.activate(tabName, tab);
        }

        this.div.style.display = 'flex';

        if (!this.isSized) {
            this.size();
            this.container.style.minHeight = this.minHeight + 'px';
            this.isSized = true;
        }

        // calculate tab content height based on total
        this.tabContent.style.height = (this.div.offsetHeight - this.header.offsetHeight - 2) + 'px';

        this.drag = null;
        if (this.options.moveAndResize) {
            this.header.style.cursor = 'move';
            this.header.onmousedown = e => {
                if (this.edge) {
                    e.preventDefault();
                    this.edge.drag = { x: e.pageX, y: e.pageY };
                } else {
                    e.preventDefault();
                    this.drag = { x: e.pageX, y: e.pageY };
                }
            };
            this.container.onmousedown = this.div.onmousedown = e => {
                if (this.edge) {
                    e.preventDefault();
                    this.edge.drag = { x: e.pageX, y: e.pageY };
                }
            };
            document.onmouseup = _e => {
                if (this.edge) this.edge.drag = null;
                this.drag = null;
            };
            this.div.onmousemove = this.container.onmousemove = this.content.onmousemove = (e: MouseEvent) => {
                if (e.buttons === 0) {
                    this.edge = this.findEdge(e.pageX, e.pageY);
                } else if (this.edge?.drag) {
                    const dx = e.pageX - this.edge.drag.x;
                    const dy = e.pageY - this.edge.drag.y;
                    this.resize(this.edge.loc, dx, dy);
                    this.edge.drag = { x: this.edge.drag.x + dx, y: this.edge.drag.y + dy };
                } else if (this.drag) {
                    this.div.style.position = 'absolute';
                    const dx = e.pageX - this.drag.x;
                    const dy = e.pageY - this.drag.y;
                    this.move(dx, dy);
                    this.drag = { x: this.drag.x + dx, y: this.drag.y + dy };
                }
                if (this.edge) {
                    document.body.style.cursor = this.edge.cursor;
                    this.header.style.cursor = this.edge.cursor;
                    this.tabs.querySelectorAll('.flowbee-config-tab').forEach((t: HTMLElement) => t.style.cursor = this.edge.cursor);
                } else {
                    document.body.style.cursor = 'default';
                    this.header.style.cursor = 'move';
                    this.tabs.querySelectorAll('.flowbee-config-tab').forEach((t: HTMLElement) => t.style.cursor = 'pointer');
                }
            };
            document.body.onmouseleave = _e => {
                this.drag = null;
                this.edge = null;
                document.body.style.cursor = 'default';
                this.header.style.cursor = 'move';
            };
        }
    }

    addTab(label: string): HTMLLIElement {
        const tab = document.createElement('li') as HTMLLIElement;
        tab.innerText = label;
        tab.className = 'flowbee-config-tab';
        tab.onclick = e => {
            this.activate(label, e.target as HTMLLIElement);
        };
        this.tabs.appendChild(tab);
        return tab;
    }

    activate(tabName: string, tab: HTMLLIElement) {

        if (this.activeTab) {
            this.activeTab.tab.classList.toggle('flowbee-config-tab-active');
        }
        tab.classList.toggle('flowbee-config-tab-active');
        this.activeTab = { name: tabName, tab };

        this.tabContent.innerHTML = '';

        const widgets = this.template[tabName].widgets;
        for (const widget of widgets) {
            if (widget.label && (widgets.length > 1 || widget.type !== 'textarea')) {
                const label = document.createElement('label');
                label.innerHTML = widget.type === 'note' ? '' : widget.label;
                this.tabContent.appendChild(label);
            } else {
                // todo span
            }

            this.tabContent.style.gridAutoRows = '25px';
            let value = '';
            if (widget.instanceProp && this.instance) {
                value = this.instance[widget.instanceProp];
            } else if (this.flowElement.attributes && this.flowElement.attributes[widget.attribute]) {
                value = this.flowElement.attributes[widget.attribute];
            } else if (widget.default) {
                value = widget.default;
                this.update(widget.attribute, value);
            }
            const readonly = !!this.instance || widget.readonly || this.flowElement.readonly;

            // TODO separate date/datetime entry widget
            if (widget.type === 'text' || widget.type === 'datetime') {
                const text = document.createElement('input') as HTMLInputElement;
                text.type = 'text';
                text.value = value && widget.type === 'datetime' ? this.datetime(new Date(value)) : value;
                if (readonly) {
                    text.readOnly = true;
                    text.style.borderColor = 'transparent';
                    text.style.outline = 'none';
                } else {
                    text.onchange = e => this.update(widget.attribute, text.value);
                }
                this.tabContent.appendChild(text);
            } else if (widget.type === 'checkbox') {
                const checkbox = document.createElement('input') as HTMLInputElement;
                checkbox.type = 'checkbox';
                checkbox.checked = value === 'true';
                if (readonly) {
                    checkbox.readOnly = true;
                } else {
                    checkbox.onclick = e => this.update(widget.attribute, '' + checkbox.checked);
                }
                this.tabContent.appendChild(checkbox);
            } else if (widget.type === 'radio') {
                const div = document.createElement('div') as HTMLDivElement;
                if (widget.options) {
                    for (const opt of widget.options) {
                        const radio = document.createElement('input') as HTMLInputElement;
                        radio.type = 'radio';
                        radio.id = opt.replace(/\s+/g, '-').toLowerCase();
                        radio.name = widget.attribute;
                        if (opt === value) {
                            radio.checked = true;
                        }
                        if (!readonly) {
                            radio.onchange = e => this.update(widget.attribute, opt);
                        }
                        div.appendChild(radio);
                        const label = document.createElement('label') as HTMLLabelElement;
                        label.setAttribute('for', radio.id);
                        label.innerHTML = opt;
                        div.appendChild(label);
                    }
                }
                this.tabContent.appendChild(div);
            } else if (widget.type === 'textarea') {
                if (widgets.length === 1) {
                    this.tabContent.style.gridAutoRows = ''; // fill entire tab
                }
                if (readonly) {
                    const pre = document.createElement('pre') as HTMLPreElement;
                    pre.textContent = value;
                    pre.style.margin = '0';
                    this.tabContent.appendChild(pre);
                } else {
                    const textarea = document.createElement('textarea') as HTMLTextAreaElement;
                    textarea.value = value;
                    if (widget.label) {
                        textarea.placeholder = widget.label;
                    }
                    textarea.onchange = e => this.update(widget.attribute, textarea.value);
                    this.tabContent.appendChild(textarea);
                }
            } else if (widget.type === 'select') {
                const select = document.createElement('select') as HTMLSelectElement;
                if (widget.options) {
                    for (const opt of widget.options) {
                        const option = document.createElement('option') as HTMLOptionElement;
                        option.innerHTML = opt;
                        select.appendChild(option);
                    }
                }
                if (value) {
                    select.selectedIndex = widget.options.indexOf(value);
                } else {
                    select.selectedIndex = 0;
                }
                if (!readonly) {
                    select.onchange = e => this.update(widget.attribute, widget.options[select.selectedIndex]);
                }
                this.tabContent.appendChild(select);
            } else if (widget.type === 'table') {
                if (widgets.length === 1) {
                    this.tabContent.style.gridAutoRows = ''; // fill entire tab
                }
                const table = new Table(widget.widgets, value, readonly);
                table.onTableUpdate(tableUpdate => this.update(widget.attribute, tableUpdate.value));
                this.tabContent.appendChild(table.tableElement);
            } else if (widget.type === 'note') {
                const span = document.createElement('span');
                span.innerText = widget.label;
                this.tabContent.appendChild(span);
            } else if (widget.type === 'source') {
                const pre = document.createElement('pre') as HTMLPreElement;
                const indent = 2; // TODO config
                const sourceObj = this.instance || this.flowElement;
                if (this.options.sourceTab === 'yaml') {
                    pre.textContent = jsYaml.safeDump(sourceObj, { noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
                } else {
                    pre.textContent = JSON.stringify(sourceObj, null, indent);
                }
                pre.style.margin = '0';
                this.tabContent.appendChild(pre);
            }
        }
    }

    update(attribute: string, value: string) {
        if (!attribute) return;
        const val = value?.trim();
        if (val) {
            if (this.flowElement.attributes) {
                this.flowElement.attributes[attribute] = val;
            } else {
                this.flowElement.attributes = { [attribute]: val };
            }
        } else {
            delete this.flowElement.attributes[attribute];
        }
        this._onFlowElementUpdate.emit({ element: this.flowElement });
    }

    get isOpen(): boolean {
        return this.div.style.display && this.div.style.display !== 'none';
    }

    close() {
        this.div.style.display = 'none';
    }

    private size() {
        const leftRightPad = this.container.offsetWidth > 100 ? 50 : 0;
        const bottomPad = 15;
        this.width = this.container.offsetWidth - leftRightPad * 2;
        this.height = this.minHeight;
        this.left = this.container.offsetLeft + leftRightPad;
        this.top = this.container.offsetTop + this.container.offsetHeight - this.height - bottomPad;
    }

    private findEdge(x: number, y: number): Edge | null {
        const hit = 8;
        const north = Math.abs(this.top - y) <= hit;
        const south = !north && Math.abs(this.top + this.height - y) <= hit;
        const west = Math.abs(this.left - x) <= hit;
        const east = !west && Math.abs(this.left + this.width - x) <= hit;
        if (north && west) return new Edge('nw');
        else if (north && east) return new Edge('ne');
        else if (north) return new Edge('n');
        else if (south && west) return new Edge('sw');
        else if (south && east) return new Edge('se');
        else if (south) return new Edge('s');
        else if (west) return new Edge('w');
        else if (east) return new Edge('e');
        else return null;
    }

    private get maxX() {
        return this.container.offsetLeft + this.container.offsetWidth - 15; // account for scrollbars
    }
    private get maxY() {
        return this.container.offsetTop + this.container.offsetHeight - 15; // account for scrollbars
    }
    private get minHeight() {
        return this.styles.getSize(this.stylesObj['flowbee-configurator'].height);
    }
    private get minWidth() {
        return 200;
    }

    /**
     * Resize if needed to fit within container
     */
    private fit() {
        if (this.width > this.container.offsetWidth) {
            this.width = this.container.offsetWidth;
        }
        if (this.left < this.container.offsetLeft) {
            this.left = this.container.offsetLeft;
        }
        const maxX = this.maxX;
        if (this.left + this.width > maxX) {
            this.left = maxX - this.width;
        }
        if (this.top < this.container.offsetTop) {
            this.top = this.container.offsetTop;
        }
        const maxY = this.maxY;
        if (this.top + this.height > maxY) {
            this.top = maxY - this.height;
        }
    }

    /**
     * Move configurator when dragged
     */
    private move(dx: number, dy: number) {
        let left = this.left + dx;
        let top = this.top + dy;
        if (this.container) {
            if (dx < 0 && left < this.container.offsetLeft) {
                left = this.container.offsetLeft;
            } else if (dx > 0) {
                const maxX = this.maxX;
                if (left + this.width > maxX) {
                    left = maxX - this.width;
                }
            }
            if (dy < 0 && top < this.container.offsetTop) {
                top = this.container.offsetTop;
            } else if (dy > 0) {
                const maxY = this.maxY;
                if (top + this.height > maxY) {
                    top = maxY - this.height;
                }
            }
        }
        this.left = left;
        this.top = top;
    }

    private resize(loc: Loc, dx: number, dy: number) {
        let left = this.left;
        let top = this.top;
        let width = this.width;
        let height = this.height;
        if (loc.indexOf('w') >= 0) {
            width = Math.max(this.width - dx, this.minWidth);
            left = this.left + this.width - width;
            if (left < this.container.offsetLeft) {
                width = width - (this.container.offsetLeft - left);
                left = this.container.offsetLeft;
            }
        } else if (loc.indexOf('e') >= 0) {
            width = Math.max(this.width + dx, this.minWidth);
            const maxX = this.maxX;
            if (left + width > maxX) {
                width = maxX - left;
            }
        }
        if (loc.startsWith('n')) {
            height = Math.max(this.height - dy, this.minHeight);
            top = this.top + this.height - height;
            if (top < this.container.offsetTop) {
                height = height - (this.container.offsetTop - top);
                top = this.container.offsetTop;
            }
        } else if (loc.startsWith('s')) {
            height = Math.max(this.height + dy, this.minHeight);
            const maxY = this.maxY;
            if (top + height > maxY) {
                height = maxY - top;
            }
        }
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }

    /**
     * TODO repeated in diagram.ts
     */
    toJson(indent = 2): string {
        return JSON.stringify(this.template, null, indent);
    }
    toYaml(indent = 2): string {
        return jsYaml.safeDump(this.template, { noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
    }

    private datetime(date: Date): string {
        const millis = String(date.getMilliseconds()).padStart(3, '0');
        return `${date.toLocaleString(navigator.language, { hour12: false })}:${millis}`;
    }

    static parseTemplate(text: string, file: string): ConfigTemplate {
        if (text.startsWith('{')) {
            try {
                return JSON.parse(text);
            } catch (err) {
                throw new Error(`Failed to parse ${file}: ${err.message}`);
            }
        } else {
            return jsYaml.safeLoad(text, { filename: file });
        }
    }
}

type Drag = { x: number, y: number };
type Loc = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

class Edge {
    drag: Drag | null;

    constructor(readonly loc: Loc) {}

    get cursor(): string {
        if (this.loc === 'n' || this.loc === 's') {
            return 'ns-resize';
        } else if (this.loc === 'e' || this.loc === 'w') {
            return 'ew-resize';
        } else if (this.loc === 'nw' || this.loc === 'se') {
            return 'nwse-resize';
        } else if (this.loc === 'ne' || this.loc === 'sw') {
            return 'nesw-resize';
        }
    }
}