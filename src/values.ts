import { Popup } from './popup';
import { ValuesOptions } from './options';
import { Table } from './table';
import { Disposable, Listener, TypedEvent } from './event';
import { ExpressionValue, UserValues } from './model/value';
import { Widget } from './model/template';
import { Decorator } from './decoration';

export type OpenValuesEvent = { path: string };
export type ValuesActionEvent = { action: string, values?: UserValues };

export class ValuesPopup extends Popup {

    protected options: ValuesOptions;

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

    setDecorator(decorator: Decorator) {
        this.table?.setDecorator(decorator);
    }

    constructor(container?: HTMLElement, readonly iconBase?: string) {
        super(container, iconBase);
     }

    render(spec: { values: UserValues, options?: ValuesOptions }) {
        this.values = spec.values;
        super.render(spec);
    }

    protected renderContent() {
        this.table = this.renderTable();
        this.content.appendChild(this.table.tableElement);
    }

    protected emitAction(action: string): void {
        this._onPopupAction.emit({ action, values: this.values });
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

    updateTable(): Table {
        this.content.removeChild(this.table?.tableElement);
        return this.renderTable();
    }

    clear() {
        const { overrides: _overrides, ...values } = this.values;
        this.setValues({ ...values, overrides: {} });
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