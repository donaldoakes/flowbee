import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { FlowElementUpdateEvent, Listener, TypedEvent } from './event';
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
    private activeTab: { name: string, tab: HTMLLIElement} | undefined;

    flowElement: FlowElement | undefined;
    template: ConfigTemplate | undefined;

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

    render(flowElement: FlowElement, template: ConfigTemplate | string, options: ConfiguratorOptions) {

        if (!flowElement) throw new Error('flowElement is required');

        this.options = merge(configuratorDefault, options);

        // loading styles is expensive, so only load if theme has changed
        if (!this.styles || !this.stylesObj || (options.theme && options.theme !== this.styles.theme.name)) {
            this.styles = new Styles('flowbee-configurator', new Theme(options.theme), this.div);
            this.stylesObj = this.styles.getObject();
            this.div.className = `flowbee-configurator flowbee-configurator-${this.options.theme || ''}`;
        }

        this.flowElement = flowElement;
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
            if (widget.label) {
                const label = document.createElement('label');
                label.innerHTML = widget.label;
                this.tabContent.appendChild(label);
            } else {
                // todo span
            }

            this.tabContent.style.gridAutoRows = '25px';
            const value = this.flowElement.attributes ? this.flowElement.attributes[widget.attribute] : '';
            const readonly = widget.readonly || this.flowElement.readonly;

            if (widget.type === 'text') {
                const text = document.createElement('input') as HTMLInputElement;
                text.setAttribute('type', 'text');
                text.value = value;
                text.onchange = e => this.update(widget.attribute, text.value);
                this.tabContent.appendChild(text);
            } else if (widget.type === 'textarea' && !readonly) {
                const textarea = document.createElement('textarea') as HTMLTextAreaElement;
                if (widgets.length === 1) {
                    // allow textarea to fill entire tab
                    this.tabContent.style.gridAutoRows = '';
                }
                textarea.value = value;
                textarea.onchange = e => this.update(widget.attribute, textarea.value);
                this.tabContent.appendChild(textarea);
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
                select.onchange = e => this.update(widget.attribute, widget.options[select.selectedIndex]);
                this.tabContent.appendChild(select);
            } else if (widget.type === 'table') {
                // TODO
                if (widgets.length === 1) {
                    // allow textarea to fill entire tab
                    this.tabContent.style.gridAutoRows = '';
                }
            } else if (widget.type === 'source' || (widget.type === 'textarea' && readonly)) {
                const pre = document.createElement('pre') as HTMLPreElement;
                const indent = 2; // TODO config
                // TODO: newline between pre opening tag and
                if (this.options.sourceTab === 'yaml') {
                    pre.textContent = jsYaml.safeDump(this.flowElement, { noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
                } else {
                    pre.textContent = JSON.stringify(this.flowElement, null, indent);
                }
                pre.style.margin = '0';
                this.tabContent.appendChild(pre);
            }
        }
    }

    update(attribute: string, value: string) {
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