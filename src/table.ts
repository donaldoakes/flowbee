import { Disposable, Listener, TypedEvent } from './event';
import { dateTime } from './format';
import { Widget } from './model/template';

export interface TableUpdateEvent {
    value: string;
}

export interface TableActionEvent {
    action: string;
    value: number;
}

export class Table {
    tableElement: HTMLTableElement;
    rowElements: HTMLTableRowElement[] = [];
    // does not include entry row
    rows = [];

    private _onTableUpdate = new TypedEvent<TableUpdateEvent>();
    onTableUpdate(listener: Listener<TableUpdateEvent>): Disposable {
        return this._onTableUpdate.on(listener);
    }
    private _onTableAction = new TypedEvent<TableActionEvent>();
    onTableAction(listener: Listener<TableActionEvent>): Disposable {
        return this._onTableAction.on(listener);
    }


    constructor(readonly widgets: Widget[], value: string, readonly readonly: boolean, readonly fixedRows = false ) {
        this.tableElement = document.createElement('table') as HTMLTableElement;
        // header
        const headRow = document.createElement('tr') as HTMLTableRowElement;
        if (this.isFirefox) {
            headRow.style.height = '24px';
        }
        for (const tableWidget of widgets) {
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
        const rowCount = this.readonly || this.fixedRows ? this.rows.length : this.rows.length + 1;
        for (let i = 0; i < rowCount; i++) {
            const row = this.rows[i];
            const rowElement = document.createElement('tr') as HTMLTableRowElement;
            if (this.isFirefox) {
                rowElement.style.height = '24px';
            }
            for (let j = 0; j < this.widgets.length; j++) {
                const widget = this.widgets[j];
                const td = document.createElement('td') as HTMLTableCellElement;
                td.tabIndex = tabIndex++;
                td.setAttribute('data-row', '' + i);
                td.setAttribute('data-col', '' + j);
                if (widget.type === 'link' && widget.action) {
                    if (i < this.rows.length && row[j]) {
                        const isHttp = widget.action.startsWith('http://') || widget.action.startsWith('https://');
                        const anchor = document.createElement('a');
                        anchor.setAttribute('href', isHttp ? widget.action : '');
                        anchor.innerText = row[j];
                        td.appendChild(anchor);
                        anchor.onclick = e => {
                            if (isHttp) {
                                e.preventDefault();
                            }
                            this._onTableAction.emit({ action: widget.action, value: i });
                        };
                    }
                } else {
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
                        let cellVal = row[j];
                        if (cellVal) {
                            if (widget.type === 'datetime') {
                                cellVal = dateTime(new Date(cellVal));
                            }
                        }
                        td.textContent = cellVal;
                    }
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
        const oldVal = this.value;
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
            (focusRow?.childNodes[colIndex] as HTMLTableCellElement).focus();
        }
        const newVal = this.value;
        if (oldVal !== newVal) {
            this._onTableUpdate.emit({ value: newVal });
        }
    }

    get value(): string {
        return JSON.stringify(this.rows);
    }

    get isFirefox(): boolean {
        return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    }
}