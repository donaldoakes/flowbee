import { merge } from 'merge-anything';
import { valuesDefault, ValuesOptions } from './options';
import { Styles } from './style/style';
import { Theme } from './theme';
import { Table } from './table';
import { Disposable, Listener, TypedEvent } from './event';
import { ExpressionValue, UserValues } from './model/value';
import { Decorator } from './decoration';
import { Widget } from './model/template';

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
    getValues(): UserValues {
        return this.values;
    }
    setValues(values: UserValues) {
        this.values = values;
        this.abbreviatedLocations = {};
        this.table = this.updateTable();
        this.content.appendChild(this.table.tableElement);
    }

    private abbreviatedLocations: { [abbrev: string]: string } = {};

    /**
     * Assumes forward slash path sep.
     * Only works if abbrevs are unique across all expressions.
     */
    abbreviateLocations(expressionValues: ExpressionValue[]): ExpressionValue[] {
        const abbrevLocs: { [abbrev: string]: string } = {};
        const abbrevExprVals: ExpressionValue[] = [];
        for (const exprVal of expressionValues) {
            const abbrevExprVal = { ...exprVal };
            if (exprVal.location) {
                const slash = exprVal.location.lastIndexOf('/');
                if (slash && slash < exprVal.location.length - 2) {
                    const abbr = exprVal.location.substring(slash + 1);
                    if (abbrevLocs[abbr] && abbrevLocs[abbr] !== exprVal.location) {
                        // not unique
                        this.abbreviatedLocations = {};
                        return expressionValues;
                    } else {
                        abbrevLocs[abbr] = exprVal.location;
                        abbrevExprVal.location = abbr;
                    }
                }
            }
            abbrevExprVals.push(abbrevExprVal);
        }
        this.abbreviatedLocations = abbrevLocs;
        return abbrevExprVals;
    }

    unabbreviateLocations(abbrevExprVals: ExpressionValue[]): ExpressionValue[] {
        return abbrevExprVals.map(abbrevExprVal => {
            const expressionValue = { ...abbrevExprVal };
            if (abbrevExprVal.location && this.abbreviatedLocations[abbrevExprVal.location]) {
                expressionValue.location = this.abbreviatedLocations[abbrevExprVal.location];
            }
            return expressionValue;
        });
    }

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
        this.div.tabIndex = 0;
        this.div.onkeydown = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape' && this.isOpen) {
              this.close();
              this._onValuesAction.emit({ action: 'close' });
            }
        };

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

        if (this.container !== document.body) {
            const margins = this.options.margins as { top: number, right: number, bottom: number, left: number};
            const rect = this.container.getBoundingClientRect();
            this.div.style.width = (rect.width - (margins.left + margins.right)) + 'px';
            this.div.style.height = (rect.height - (margins.top + margins.bottom)) + 'px';
            this.div.style.left = (rect.left + margins.left) + 'px';
            this.div.style.top = (rect.top + margins.top) + 'px';
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
                this.footer.appendChild(actionButton);
            }
        }

        this.open();
    }

    updateTable(): Table {
        this.content.removeChild(this.table?.tableElement);
        return this.renderTable();
    }

    renderTable(): Table {
        const link: Widget = { type: 'link', label: 'From', action: 'openValues', readonly: true };
        if (this.options.abbreviateLocations) {
            link.title = (val?: string) => this.abbreviatedLocations[val];
        }
        if (this.options.valuesBaseUrl) {
            link.action = this.options.valuesBaseUrl; // just a flag to preventDefault
        }
        const table = new Table(
            [
                { type: 'text', label: 'Expression', readonly: true },
                { type: 'text', label: 'Value', readonly: true },
                link,
                { type: 'text', label: 'Override' }
            ],
            this.toString(),
            { fixedRows: true }
        );

        // TODO: dispose listeners
        table.onTableAction((actionEvent) => {
            if (actionEvent.action === 'openValues') {
                let path = actionEvent.value[2];
                if (this.options.abbreviateLocations && this.abbreviatedLocations[path]) {
                    path = this.abbreviatedLocations[path];
                }
                this._onOpenValues.emit({ path });
            }
        });


        table.onTableUpdate((updateEvent) => {
            this.values = this.fromString(updateEvent.value);
        });

        return table;
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
        this.div.focus();
    }

    clear() {
        const { overrides: _overrides, ...values } = this.values;
        this.setValues({ ...values, overrides: {} });
    }

    get isOpen(): boolean {
        return this.div.style.display === 'flex';
    }

    toString(): string {
        let tableVals = this.values.values;
        if (this.options.abbreviateLocations) {
            tableVals = this.abbreviateLocations(tableVals);
        }
        const rows = tableVals.map((value) => {
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
            const override = row[3];
            if (override) {
                if (!userValues.overrides) userValues.overrides = {};
                userValues.overrides[row[0]] = override;
            }
            const thisValue = this.values.values.find(v => v.expression === row[0]);
            userValue.location = thisValue.location;
            userValues.values.push(userValue);
        }
        if (this.options.abbreviateLocations) {
            return { ...userValues, values: this.unabbreviateLocations(userValues.values) };
        } else {
            return userValues;
        }
    }
}