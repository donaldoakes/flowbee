import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { FlowElementInstance, FlowElementUpdateEvent, Listener, TypedEvent } from './event';
import { FlowElement, getLabel } from './model/element';
import { ConfigTemplate, Widget } from './model/template';
import { configuratorDefault, ConfiguratorOptions } from './options';
import { Styles } from './style/style';
import { Theme } from './theme';

/**
 * TODO: make template optional, and then display all attributes
 * as text widgets on one tab
 */
export class Configurator {

    private styles: Styles;
    private stylesObj: object;

    private div: HTMLDivElement;
    private title: HTMLDivElement;
    private tabs: HTMLUListElement;
    private tabContent: HTMLDivElement;
    private activeTab?: { name: string, tab: HTMLLIElement };

    flowElement: FlowElement;
    instance?: FlowElementInstance;
    template?: ConfigTemplate;

    private options: ConfiguratorOptions;

    private _onFlowElementUpdate = new TypedEvent<FlowElementUpdateEvent>();
    onFlowElementUpdate(listener: Listener<FlowElementUpdateEvent>) {
        this._onFlowElementUpdate.on(listener);
    }

    constructor() {
        // build html
        this.div = document.createElement('div') as HTMLDivElement;
        const header = document.createElement('div') as HTMLDivElement;
        header.className = 'flowbee-config-header';
        this.title = document.createElement('div') as HTMLDivElement;
        this.title.className = 'flowbee-config-title';
        header.appendChild(this.title);
        const close = document.createElement('div') as HTMLDivElement;
        close.className = 'flowbee-config-close';
        close.onclick = _e => this.close();
        const closeImg = document.createElement('input') as HTMLInputElement;
        closeImg.type = 'image';
        closeImg.alt = closeImg.title = 'Close Configurator';
        closeImg.setAttribute('data-icon', 'close.svg');
        close.appendChild(closeImg);
        header.appendChild(close);
        this.div.appendChild(header);
        const content = document.createElement('div') as HTMLDivElement;
        content.className = 'flowbee-config-content';
        const tabbedContent = document.createElement('div') as HTMLDivElement;
        tabbedContent.className = 'flowbee-config-tabbed-content';
        this.tabs = document.createElement('ul') as HTMLUListElement;
        this.tabs.className = 'flowbee-config-tabs';
        tabbedContent.appendChild(this.tabs);
        this.tabContent = document.createElement('div') as HTMLDivElement;
        this.tabContent.className = 'flowbee-config-tab-content';
        tabbedContent.appendChild(this.tabContent);
        content.appendChild(tabbedContent);
        this.div.appendChild(content);
        document.body.appendChild(this.div);
     }

    render(flowElement: FlowElement, instances: FlowElementInstance[], template: ConfigTemplate | string, options: ConfiguratorOptions) {

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

        // calculate tab content height based on total
        this.tabContent.style.height = (this.div.clientHeight - 30) + 'px';
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
                const table = new Table(widget, value, readonly);
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

    /**
     * TODO repeated in diagram.ts
     */
    toJson(indent = 2): string {
        return JSON.stringify(this.template, null, indent);
    }
    toYaml(indent = 2): string {
        return jsYaml.safeDump(this.template, { noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
    }

    datetime(date: Date): string {
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

export interface TableUpdateEvent {
    value: string
}

class Table {
    tableElement: HTMLTableElement;
    rowElements: HTMLTableRowElement[] = [];
    // does not include entry row
    rows = [];

    private _onTableUpdate = new TypedEvent<TableUpdateEvent>();
    onTableUpdate(listener: Listener<TableUpdateEvent>) {
        this._onTableUpdate.on(listener);
    }

    constructor(readonly widget: Widget, value: string, private readonly: boolean) {
        this.tableElement = document.createElement('table') as HTMLTableElement;
        // header
        const headRow = document.createElement('tr') as HTMLTableRowElement;
        if (this.isFirefox) {
            headRow.style.height = '24px';
        }
        for (const tableWidget of widget.widgets) {
            const th = document.createElement('th') as HTMLTableHeaderCellElement;
            th.textContent = tableWidget.label;
            headRow.appendChild(th);
        }
        this.tableElement.appendChild(headRow);

        this.rows = value ? JSON.parse(value) : [];
        this.setRows();
    }

    setRows() {
        // clear any old data
        for (const rowElement of this.rowElements) {
            this.tableElement.removeChild(rowElement);
        }
        this.rowElements = [];

        // add rows from value (extra row for entry)
        let tabIndex = 100;
        const rowCount = this.readonly ? this.rows.length : this.rows.length + 1;
        for (let i = 0; i < rowCount; i++) {
            const row = this.rows[i];
            const rowElement = document.createElement('tr') as HTMLTableRowElement;
            if (this.isFirefox) {
                rowElement.style.height = '24px';
            }
            for (let j = 0; j < this.widget.widgets.length; j++) {
                const td = document.createElement('td') as HTMLTableCellElement;
                td.tabIndex = tabIndex++;
                td.setAttribute('data-row', '' + i);
                td.setAttribute('data-col', '' + j);
                if (!this.readonly) {
                    td.contentEditable = 'true';
                    td.onblur = (e: FocusEvent) => {
                        let rowIdx: string | null = null;
                        let colIdx: string | null = null;
                        if ((e.relatedTarget as any)?.getAttribute) {
                            rowIdx = (e.relatedTarget as any).getAttribute('data-row');
                            colIdx = (e.relatedTarget as any).getAttribute('data-col');
                        }
                        this.update(rowIdx ? parseInt(rowIdx) : null, colIdx ? parseInt(colIdx) : null);
                    };
                }
                if (i < this.rows.length) {
                    td.textContent = row[j];
                }
                rowElement.appendChild(td);
            }
            this.rowElements.push(rowElement);
            this.tableElement.appendChild(rowElement);
        }
        if (this.isFirefox) {
            this.tableElement.style.height = ((rowCount + 1) * 24) + 'px';
        }
    }

    /**
     * Consolidates empty rows and populates value
     */
    update(rowIndex?: number, colIndex?: number) {
        this.rows = [];
        for (const rowElement of this.rowElements) {
            const tds = rowElement.querySelectorAll('td');
            let rowHasVal = false;
            const row = [];
            for (let i = 0; i < tds.length; i++) {
                const td = tds[i] as HTMLTableCellElement;
                const val = td.textContent;
                if (val) {
                    rowHasVal = true;
                    row[i] = val;
                } else {
                    row[i] = '';
                }
            }
            if (rowHasVal) {
                this.rows.push(row);
            }
        }
        this.setRows();
        if (typeof rowIndex === 'number' && typeof colIndex === 'number') {
            const focusRow = this.rowElements[rowIndex];
            (focusRow.childNodes[colIndex] as HTMLTableCellElement).focus();
        }
        this._onTableUpdate.emit({ value: this.value });
    }

    get value(): string {
        return JSON.stringify(this.rows);
    }

    get isFirefox(): boolean {
        return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    }
}