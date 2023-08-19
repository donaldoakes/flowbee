import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { ConfiguratorPositionEvent, Disposable, FlowElementInstance, FlowElementUpdateEvent, Listener, TypedEvent } from './event';
import { FlowElement, getLabel } from './model/element';
import { ConfigTemplate, setTitle } from './model/template';
import { configuratorDefault, ConfiguratorOptions } from './options';
import { Styles } from './style/style';
import { Theme } from './theme';
import { Table } from './table';
import { parseDisplay } from './draw/display';
import { dateTime } from './format';

export interface SourceLink {
    path: string;
    label?: string;
    action?: string;
}

/**
 * TODO: make template optional, and then display all attributes
 * as text widgets on one tab
 */
export class Configurator {

    private styles: Styles;
    private stylesObj: object;

    private div: HTMLDivElement;
    private editDiv: HTMLDivElement;
    private editImg: HTMLInputElement;
    private saveDiv: HTMLDivElement;
    private saveImg: HTMLInputElement;
    private closeImg: HTMLInputElement;
    private header: HTMLDivElement;
    private title: HTMLDivElement;
    private content: HTMLDivElement;
    private tabsList: HTMLUListElement;
    private tabContent: HTMLDivElement;
    private tabs: HTMLLIElement[] = [];
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
    onFlowElementUpdate(listener: Listener<FlowElementUpdateEvent>): Disposable {
        return this._onFlowElementUpdate.on(listener);
    }

    private _onReposition = new TypedEvent<ConfiguratorPositionEvent>();
    onReposition(listener: Listener<ConfiguratorPositionEvent>): Disposable {
        return this._onReposition.on(listener);
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

    constructor(container?: HTMLElement, iconBase?: string) {
        this.container = container || document.body;

        // build html
        this.div = document.createElement('div') as HTMLDivElement;
        this.div.id = 'flowbee-configurator';
        this.div.style.display = 'none';
        this.header = document.createElement('div') as HTMLDivElement;
        this.header.className = 'flowbee-config-header';
        this.title = document.createElement('div') as HTMLDivElement;
        this.title.className = 'flowbee-config-title';
        this.header.appendChild(this.title);

        this.editDiv = document.createElement('div') as HTMLDivElement;
        this.editDiv.className = 'flowbee-edit-icon';
        this.editDiv.style.display = 'none';
        this.editDiv.onclick = _e => this.editData();
        this.editImg = document.createElement('input') as HTMLInputElement;
        this.editImg.type = 'image';
        if (iconBase) this.editImg.src = `${iconBase}/edit.svg`;
        this.editImg.alt = this.editImg.title = 'Edit Data';
        this.editImg.setAttribute('data-icon', 'edit.svg');
        this.editDiv.appendChild(this.editImg);
        this.header.appendChild(this.editDiv);

        this.saveDiv = document.createElement('div') as HTMLDivElement;
        this.saveDiv.className = 'flowbee-edit-icon';
        this.saveDiv.style.display = 'none';
        this.saveDiv.onclick = _e => this.saveData();
        this.saveImg = document.createElement('input') as HTMLInputElement;
        this.saveImg.type = 'image';
        if (iconBase) this.saveImg.src = `${iconBase}/save.svg`;
        this.saveImg.alt = this.saveImg.title = 'Save Data';
        this.saveImg.setAttribute('data-icon', 'save.svg');
        this.saveDiv.appendChild(this.saveImg);
        this.header.appendChild(this.saveDiv);

        const close = document.createElement('div') as HTMLDivElement;
        close.className = 'flowbee-config-close';
        close.onclick = _e => this.close();
        this.closeImg = document.createElement('input') as HTMLInputElement;
        this.closeImg.type = 'image';
        if (iconBase) this.closeImg.src = `${iconBase}/close.svg`;
        this.closeImg.alt = this.closeImg.title = 'Close Configurator';
        this.closeImg.setAttribute('data-icon', 'close.svg');
        close.appendChild(this.closeImg);
        this.header.appendChild(close);

        this.div.appendChild(this.header);
        this.content = document.createElement('div') as HTMLDivElement;
        this.content.className = 'flowbee-config-content';
        const tabbedContent = document.createElement('div') as HTMLDivElement;
        tabbedContent.className = 'flowbee-config-tabbed-content';
        this.tabsList = document.createElement('ul') as HTMLUListElement;
        this.tabsList.className = 'flowbee-config-tabs';
        tabbedContent.appendChild(this.tabsList);
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
        template: ConfigTemplate,
        options: ConfiguratorOptions,
        source?: SourceLink,
        position?: { left: number, top: number, width: number, height: number }
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
        this.template = template;
        if (this.options.sourceTab) {
            this.template['Source'] = { widgets: [{ type: 'source' }] };
        }

        // clear old tabs and content
        this.tabs = [];
        this.tabsList.innerHTML = '';

        // title
        if (source) {
            // path is to a module (custom step)
            this.title.innerHTML = '';
            const span = document.createElement('span') as HTMLSpanElement;
            span.innerText = getLabel(flowElement);
            this.title.appendChild(span);
            const anchor = document.createElement('a');
            anchor.setAttribute('href', '');
            anchor.innerText = source.label || source.path;
            anchor.onclick = e => {
                this._onFlowElementUpdate.emit({ element: this.flowElement, action: source.action || source.path });
            };
            this.title.appendChild(anchor);
        } else {
            this.title.innerText = getLabel(flowElement);
        }

        const keys = Object.keys(this.template);
        if (keys.length > 0) {
            for (let i = 0; i < keys.length; i++) {
                const tabName = keys[i];
                const tab = this.addTab(tabName);
                this.tabs.push(tab);
                if (i === 0) this.activate(tabName, tab);
            }
        } else {
            this.tabContent.innerHTML = '';
            this.activeTab = undefined;
        }

        this.div.style.display = 'flex';

        if (position) {
            this.left = position.left;
            this.top = position.top;
            this.width = position.width;
            this.height = position.height;
            this.isSized = true;

        } else {
            if (!this.isSized) {
                this.size();
                this.container.style.minHeight = this.minHeight + 'px';
                this.isSized = true;
            }
            this.position();
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
                if (this.edge?.drag || this.drag) {
                    this._onReposition.emit({ position: { left: this.left, top: this.top, width: this.width, height: this.height } });
                }
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
                    this.tabsList.querySelectorAll('.flowbee-config-tab').forEach((t: HTMLElement) => t.style.cursor = this.edge.cursor);
                } else {
                    document.body.style.cursor = 'default';
                    this.header.style.cursor = 'move';
                    this.tabsList.querySelectorAll('.flowbee-config-tab').forEach((t: HTMLElement) => t.style.cursor = 'pointer');
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
        this.tabsList.appendChild(tab);
        return tab;
    }

    setTab(tabName: string) {
        const tab = this.tabs.find(t => t.innerText === tabName);
        if (tab) {
            this.activate(tabName, tab);
        }
    }

    activate(tabName: string, tab: HTMLLIElement) {

        if (this.activeTab) {
            this.activeTab.tab.classList.toggle('flowbee-config-tab-active');
        }
        tab.classList.toggle('flowbee-config-tab-active');
        this.activeTab = { name: tabName, tab };

        this.tabContent.innerHTML = '';

        const widgets = this.template[tabName].widgets;
        for (const [i, widget] of widgets.entries()) {
            if (widget.type === 'button' || widget.type === 'link' || widget.type === 'note') {
                const span = document.createElement('span');
                span.innerText = '';
                this.tabContent.appendChild(span);
            } else if (widget.label && (widgets.length > 1 || (widget.type !== 'textarea' && widget.type !== 'code'))) {
                const label = document.createElement('label');
                label.innerHTML = widget.label;
                this.tabContent.appendChild(label);
            }

            this.tabContent.style.gridAutoRows = 'max-content';

            let value = '';
            if (widget.instanceProp && this.instance) {
                value = this.instance[widget.instanceProp];
            } else if (this.flowElement.attributes && this.flowElement.attributes[widget.attribute]) {
                value = this.flowElement.attributes[widget.attribute];
            } else if (widget.default) {
                if (typeof widget.default === 'function') {
                    value = widget.default(this.flowElement);
                } else {
                    value = '' + widget.default;
                }
                if (!widget.action) {
                    this.update(widget.attribute, value);
                }
            }
            const readonly = !!this.instance || widget.readonly || this.flowElement.readonly;

            // TODO separate date/datetime entry widget
            if (widget.type === 'text' || widget.type === 'datetime' || widget.type === 'number') {
                const input = document.createElement('input') as HTMLInputElement;
                if (widget.type === 'number') {
                    input.type = 'number';
                    if (typeof widget.min === 'number') input.min = '' + widget.min;
                    if (typeof widget.max === 'number') input.max = '' + widget.max;
                } else {
                    input.type = 'text';
                }
                if (value) {
                    input.value = widget.type === 'datetime' ? dateTime(new Date(value)) : value;
                }
                if (readonly) {
                    input.readOnly = true;
                    input.style.borderColor = 'transparent';
                    input.style.outline = 'none';
                    setTitle(input, widget, input.value);
                } else {
                    if (widget.action) {
                        input.onchange = e => this.action(widget.action, input.value);
                    } else {
                        input.onchange = e => this.update(widget.attribute, input.value);
                    }
                }
                this.tabContent.appendChild(input);
            } else if (widget.type === 'button') {
                const button = document.createElement('button') as HTMLButtonElement;
                button.innerText = widget.label;
                setTitle(button, widget, widget.label);
                button.onclick = e => {
                    this._onFlowElementUpdate.emit({ element: this.flowElement, action: value });
                };
                this.tabContent.appendChild(button);
            } else if (widget.type === 'checkbox') {
                const checkbox = document.createElement('input') as HTMLInputElement;
                checkbox.type = 'checkbox';
                checkbox.checked = value === 'true';
                setTitle(checkbox, widget, value);
                if (readonly) {
                    checkbox.readOnly = true;
                } else {
                    if (widget.action) {
                        checkbox.onclick = e => this.action(widget.action, '' + checkbox.checked);
                    } else {
                        checkbox.onclick = e => this.update(widget.attribute, '' + checkbox.checked);
                    }
                }
                this.tabContent.appendChild(checkbox);
            } else if (widget.type === 'radio') {
                const div = document.createElement('div') as HTMLDivElement;
                if (widget.options) {
                    if (typeof widget.options === 'function') {
                        widget.options = widget.options(widget.attribute);
                    }
                    for (const opt of widget.options) {
                        const radio = document.createElement('input') as HTMLInputElement;
                        radio.type = 'radio';
                        radio.id = opt.replace(/\s+/g, '-').toLowerCase();
                        radio.name = widget.attribute;
                        if (opt === value) {
                            radio.checked = true;
                        }
                        setTitle(radio, widget, value);
                        if (!readonly) {
                            if (widget.action) {
                                radio.onchange = e => this.action(widget.action, opt);
                            } else {
                                radio.onchange = e => this.update(widget.attribute, opt);
                            }
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
                const textarea = document.createElement('textarea') as HTMLTextAreaElement;
                textarea.value = value;
                if (readonly) {
                    textarea.readOnly = true;
                    textarea.style.outline = 'none';
                    setTitle(textarea, widget, value);
                } else {
                    if (widget.label) {
                        textarea.placeholder = widget.label;
                    }
                    if (widget.action) {
                        textarea.onchange = e => this.action(widget.action, textarea.value);
                    } else {
                        textarea.onchange = e => this.update(widget.attribute, textarea.value);
                    }
                }
                this.tabContent.appendChild(textarea);
            } else if (widget.type === 'code') {
                if (widgets.length === 1) {
                    this.tabContent.style.gridAutoRows = ''; // fill entire tab
                }
                const code = document.createElement('code') as HTMLElement;
                code.textContent = value;
                code.style.margin = '0';
                if (readonly) {
                    setTitle(code, widget, value);
                } else {
                    code.setAttribute('contenteditable', 'plaintext-only');
                    if (widget.action) {
                        code.oninput = e => this.action(widget.action, code.innerText);
                    } else {
                        code.oninput = e => this.update(widget.attribute, code.innerText);
                    }
                }
                this.tabContent.appendChild(code);
            } else if (widget.type === 'select') {
                const select = document.createElement('select') as HTMLSelectElement;
                if (widget.multi) {
                    select.setAttribute('multiple', 'true');
                }
                if (widget.options) {
                    if (typeof widget.options === 'function') {
                        widget.options = widget.options(widget.attribute);
                    }
                    for (const opt of widget.options) {
                        const option = document.createElement('option') as HTMLOptionElement;
                        option.innerHTML = opt;
                        select.appendChild(option);
                    }
                }
                if (value) {
                    select.selectedIndex = (widget.options as string[]).indexOf(value);
                } else {
                    select.selectedIndex = 0;
                }
                setTitle(select, widget, value);
                if (!readonly) {
                    if (widget.action) {
                        select.onchange = e => this.action(widget.action, widget.options[select.selectedIndex]);
                    } else {
                        select.onchange = e => this.update(widget.attribute, widget.options[select.selectedIndex]);
                    }
                }
                this.tabContent.appendChild(select);
            } else if (widget.type === 'table') {
                if (widgets.length === 1) {
                    this.tabContent.style.gridAutoRows = ''; // fill entire tab
                }
                const table = new Table(widget.widgets, value, { readonly, singleLine: widget.multi === false });
                if (widget.action) {
                    table.onTableUpdate(tableUpdate => this.action(widget.action, tableUpdate.value));
                } else {
                    table.onTableUpdate(tableUpdate => this.update(widget.attribute, tableUpdate.value));
                }
                table.onTableAction(tableAction => {
                    const action: { name: string, value: string | string[] } = { name: tableAction.action, value: tableAction.value };
                    if (tableAction.action.endsWith('...')) {
                        // value needs to indicate rownum
                        action.value = '' + tableAction.rownum;
                    }
                    this._onFlowElementUpdate.emit({ element: this.flowElement, action });
                });
                this.tabContent.appendChild(table.tableElement);
            } else if (widget.type === 'note') {
                const span = document.createElement('span');
                span.innerText = widget.label;
                setTitle(span, widget, widget.label);
                this.tabContent.appendChild(span);
            } else if (widget.type === 'link' && value) {
                const isHttp = value.startsWith('http://') || value.startsWith('https://');
                const anchor = document.createElement('a');
                anchor.setAttribute('href', isHttp ? value : '');
                anchor.innerText = widget.label;
                setTitle(anchor, widget, widget.label);
                this.tabContent.appendChild(anchor);
                anchor.onclick = e => {
                    if (isHttp) {
                        e.preventDefault();
                    }
                    this._onFlowElementUpdate.emit({ element: this.flowElement, action: value });
                };
            } else if (widget.type === 'file') {
                if (widget.label) {
                    // label means display link to open file
                    const anchor = document.createElement('a');
                    anchor.setAttribute('href', '');
                    anchor.innerText = value;
                    setTitle(anchor, widget, value);
                    anchor.onclick = e => {
                        this._onFlowElementUpdate.emit({ element: this.flowElement, action: value });
                    };
                    anchor.style.visibility = value ? 'visible' : 'hidden';
                    this.tabContent.appendChild(anchor);
                }

                if (!readonly && (widget.default || widget.action)) {
                    const spacer = document.createElement('span');
                    spacer.innerText = '';
                    this.tabContent.appendChild(spacer);

                    const span = document.createElement('span');
                    if (!widget.label && i === 0) {
                        span.style.position = 'relative';
                        span.style.top = '1px';
                        span.style.left = '-85px';
                    }

                    if (widget.default) {
                        const createBtn = document.createElement('button') as HTMLButtonElement;
                        if (typeof widget.default === 'string') {
                            createBtn.innerText = widget.default;
                        }
                        createBtn.onclick = e => {
                            this._onFlowElementUpdate.emit({ element: this.flowElement, action: '' + widget.default });
                        };
                        span.appendChild(createBtn);
                    }

                    if (widget.action) {
                        const selectBtn = document.createElement('button') as HTMLButtonElement;
                        selectBtn.innerText = widget.action;
                        selectBtn.onclick = e => {
                            this._onFlowElementUpdate.emit({ element: this.flowElement, action: widget.action });
                        };
                        span.appendChild(selectBtn);
                    }

                    this.tabContent.appendChild(span);
                }
            } else if (widget.type === 'source') {
                const pre = document.createElement('pre') as HTMLPreElement;
                const indent = 2; // TODO config
                const sourceObj = this.instance || this.flowElement;
                if (this.options.sourceTab === 'yaml') {
                    pre.textContent = jsYaml.dump(sourceObj, { noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
                } else {
                    pre.textContent = JSON.stringify(sourceObj, null, indent);
                }
                pre.style.margin = '0';
                setTitle(pre, widget, pre.textContent);
                this.tabContent.appendChild(pre);
            }
        }

        this.saveDiv.style.display = 'none';
        if (this.instance && widgets.find(w => w.instanceEdit)) {
            this.editDiv.style.display = 'inline-block';
        } else {
            this.editDiv.style.display = 'none';
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

    action(action: string, value: string) {
        this._onFlowElementUpdate.emit({ element: this.flowElement, action: { name: action, value }});
    }

    get isOpen(): boolean {
        return this.div.style.display?.length > 0 && this.div.style.display !== 'none';
    }

    editData() {
        this.editDiv.style.display = 'none';
        const textarea = this.tabContent.querySelector('textarea');
        if (textarea) {
            textarea.readOnly = false;
            textarea.style.outline = '1px auto #005fcc'; // webkit default
        }
        this.saveDiv.style.display = 'inline-block';
    }

    saveData() {
        this.saveDiv.style.display = 'none';
        const textarea = this.tabContent.querySelector('textarea');
        if (textarea) {
            if (this.template && this.activeTab) {
                const widget = this.template[this.activeTab.name].widgets.find(w => w.instanceEdit);
                if (widget) this.action(widget.instanceProp, textarea.value);
            }
            textarea.readOnly = true;
            textarea.style.outline = 'none';
        }
        this.editDiv.style.display = 'inline-block';
    }

    close() {
        this.div.style.display = 'none';
        this._onReposition.emit({ });
    }

    private size() {
        const leftRightPad = this.container.offsetWidth > 100 ? 50 : 0;
        const bottomPad = 25; // TODO css or option
        this.width = this.container.offsetWidth - leftRightPad * 2;
        this.height = this.minHeight;
        this.left = this.container.offsetLeft + leftRightPad;
        this.top = this.container.offsetTop + this.container.offsetHeight - this.height - bottomPad;
    }

    private position() {
        const display = parseDisplay(this.flowElement);
        if (display && display.w) { // TODO links
            const top = this.top - this.container.offsetTop + this.container.scrollTop || 0;
            const left = this.left - this.container.offsetLeft + this.container.scrollLeft || 0;
            const bottom = top + this.height;
            const right = left + this.width;
            const hidden = top < display.y + display.h && bottom > display.y && left < display.x + display.w && right > display.x;
            if (hidden) {
                const displayTop = display.y - this.container.scrollTop; // relative to scroll window
                const displayBottom = displayTop + display.h;
                if (this.container.offsetHeight - displayBottom > this.height + 5) {
                    // there's room below
                    this.top = displayBottom + this.container.offsetTop + 5;
                } else if (displayTop > this.height) {
                    // there's room up top
                    this.top = displayTop - this.height + this.container.offsetTop;
                }
            }
        }
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
        return jsYaml.dump(this.template, { noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
    }

    static parseTemplate(text: string, file: string): ConfigTemplate {
        if (text.startsWith('{')) {
            try {
                return JSON.parse(text);
            } catch (err) {
                throw new Error(`Failed to parse ${file}: ${err.message}`);
            }
        } else {
            return jsYaml.load(text, { filename: file }) as ConfigTemplate;
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