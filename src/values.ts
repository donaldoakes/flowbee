import { merge } from 'merge-anything';
import { valuesDefault, ValuesOptions } from './options';
import { Styles } from './style/style';
import { Theme } from './theme';
import { Table } from './table';
import { Disposable, Listener, TypedEvent } from './event';
import { ExpressionValue, UserValues } from './model/value';
import { Decorator } from './decoration';

export type OpenValuesEvent = { path: string };
export type ValuesActionEvent = { action: string, values?: UserValues };

export class ValuesPopup {

    private styles: Styles;
    private stylesObj: object;

    private div: HTMLDivElement;
    private header: HTMLDivElement;
    private title: HTMLSpanElement;
    private help: {
        link: HTMLAnchorElement;
        image: HTMLImageElement;
    };
    private closeImg: HTMLInputElement;
    private content: HTMLDivElement;
    private footer: HTMLDivElement;

    private container: HTMLElement;
    private options: ValuesOptions;

    private values: UserValues = { values: [] };

    private table?: Table;

    private _onOpenValues = new TypedEvent<OpenValuesEvent>();
    onOpenValues(listener: Listener<OpenValuesEvent>): Disposable {
        return this._onOpenValues.on(listener);
    }

    private _onValuesAction = new TypedEvent<ValuesActionEvent>();
    onValuesAction(listener: Listener<ValuesActionEvent>): Disposable {
        return this._onValuesAction.on(listener);
    }

    setDecorator(decorator: Decorator) {
        this.table?.setDecorator(decorator);
    }

    constructor(container?: HTMLElement, private iconBase?: string) {
        this.container = container || document.body;

        this.div = document.createElement('div') as HTMLDivElement;
        this.div.id = 'flowbee-values';
        this.div.style.display = 'none';

        // header
        this.header = document.createElement('div') as HTMLDivElement;
        this.header.className = 'flowbee-values-header';
        const titleElem = document.createElement('div') as HTMLDivElement;
        titleElem.className = 'flowbee-values-title';
        this.title = document.createElement('span') as HTMLSpanElement;
        titleElem.appendChild(this.title);
        this.help = {
            link: document.createElement('a') as HTMLAnchorElement,
            image: document.createElement('img') as HTMLImageElement
        };
        this.help.link.className = 'flowbee-values-help';
        this.help.image.alt = 'Values help';
        this.help.image.title = 'Values help';
        this.help.link.style.display = 'none';
        this.help.link.appendChild(this.help.image);
        titleElem.appendChild(this.help.link);
        this.header.appendChild(titleElem);

        const close = document.createElement('div') as HTMLDivElement;
        close.className = 'flowbee-values-close';
        close.onclick = (_e) => {
            this.close();
            this._onValuesAction.emit({ action: 'close' });
        };
        this.closeImg = document.createElement('input') as HTMLInputElement;
        this.closeImg.type = 'image';
        this.closeImg.alt = this.closeImg.title = 'Close';
        this.closeImg.src = `${iconBase}/close.svg`;
        this.closeImg.style.display = 'none';
        close.appendChild(this.closeImg);
        this.header.appendChild(close);
        this.div.appendChild(this.header);

        // content
        this.content = document.createElement('div') as HTMLDivElement;
        this.content.className = 'flowbee-values-content';
        this.div.appendChild(this.content);

        // footer
        this.footer = document.createElement('div') as HTMLDivElement;
        this.footer.className = 'flowbee-values-footer';
        this.div.appendChild(this.footer);

        // TODO options for width and height (or margins)
        if (this.container !== document.body) {
            const rect = this.container.getBoundingClientRect();
            this.div.style.width = (rect.right - rect.left - 260) + 'px';
            this.div.style.height = (rect.bottom - rect.top - 100) + 'px';
            this.div.style.left = (rect.left + 50) + 'px';
            this.div.style.top = (rect.top + 50) + 'px';
        }

        document.body.appendChild(this.div);
     }

    render(values: UserValues, options?: ValuesOptions) {
        this.values = values;
        this.options = merge(valuesDefault, options);

        // loading styles is expensive, so only load if theme has changed
        if (!this.styles || !this.stylesObj || (options.theme && options.theme !== this.styles.theme.name)) {
            this.styles = new Styles('flowbee-values', new Theme(options.theme), this.div);
            this.stylesObj = this.styles.getObject();
            this.div.className = `flowbee-values flowbee-values-${this.options.theme || ''}`;
        }

        this.title.innerText = this.options.title;
        if (options.help) {
            this.help.link.style.display = 'inline';
            this.help.link.href = options.help.link;
            this.help.image.alt = options.help.title || 'Values help';
            this.help.image.title = options.help.title || 'Values help';
            this.help.image.src = `${this.iconBase}/${this.options.help.icon || 'help.svg'}`;
        } else {
            this.help.link.style.display = 'none';
        }

        this.closeImg.style.display = 'inline-block';

        this.content.innerHTML = '';
        this.table = this.renderTable();
        this.content.appendChild(this.table.tableElement);

        this.footer.innerHTML = '';
        if (options.actions) {
            for (const action of options.actions) {
                const actionButton = document.createElement('input') as HTMLInputElement;
                actionButton.type = 'button';
                actionButton.value = action.label || action.name;
                actionButton.onclick = () => {
                    if (action.close) {
                        this.div.style.display = 'none';
                    }
                    this._onValuesAction.emit({ action: action.name, values: this.values });
                };
                actionButton.className = 'flow-values-files';
                this.footer.appendChild(actionButton);
            }
        }

        this.open();
    }

    renderTable(): Table {
        const table = new Table(
            [
                { type: 'text', label: 'Expression', readonly: true },
                { type: 'text', label: 'Value', readonly: true },
                { type: 'link', label: 'From', action: 'openValues', readonly: true },
                { type: 'text', label: 'Override' }
            ],
            this.toString(),
            { fixedRows: true }
        );
        this.markRequiredValues(table);
        this.addLocationTitles(table);

        // TODO: dispose listeners
        table.onTableAction((actionEvent) => {
            if (actionEvent.action === 'openValues') {
                this._onOpenValues.emit({ path: actionEvent.value[2] });
            }
        });


        table.onTableUpdate((updateEvent) => {
            this.values = this.fromString(updateEvent.value);
        });

        return table;
    }

    private markRequiredValues(table: Table) {
        // TODO: highlight required values
    }

    private addLocationTitles(table: Table) {
        // TODO: set td title to location for hover
    }

    close() {
        if (this.container) {
            this.container.style.opacity = '1';
        }
        this.div.style.display = 'none';
    }

    open() {
        this.div.style.display = 'flex';
        if (this.container) {
            this.container.style.opacity = '0.5';
        }
    }

    get isOpen(): boolean {
        return this.div.style.display === 'flex';
    }

    toString(): string {
        const rows = this.values.values.map((value) => {
            const row = [ value.expression, value.value ];
            if (value.location) {
                row[2] = value.location;
            }
            if (this.values.overrides) {
                row[3] = this.values.overrides[value.expression];
            }
            return row;
        });
        return JSON.stringify(rows);
    }

    fromString(tableVal: string): UserValues {
        const rows = JSON.parse(tableVal);
        const userValues: UserValues = { values: [] };
        for (const row of rows) {
            const userValue: ExpressionValue = { expression: row[0], value: row[1] };
            const override = row[2];
            if (override) {
                if (!userValues.overrides) userValues.overrides = {};
                userValues.overrides[row[0]] = override;
            }
            const thisValue = this.values.values.find(v => v.expression === row[0]);
            userValue.required = thisValue.required;
            userValue.location = thisValue.location;
            userValues.values.push(userValue);
        }
        return userValues;
    }
}