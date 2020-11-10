import { merge } from 'merge-anything';
import { FlowDiagram } from './diagram';
import { FlowElementEvent } from './event';
import { FlowElement } from './model/element';
import { menuDefault, MenuOptions } from './options';
import { Styles } from './style/style';
import { Theme } from './theme';

export interface MenuItem {
    id?: string;
    label: string;
    key?: string;
    icon?: string;
}

export class ContextMenu {

    private div: HTMLDivElement;
    private static styles: Styles;
    private static stylesObj: object;

    constructor(
        private items: MenuItem[]
    ) { }

    render(options: MenuOptions = {}, x: number, y: number, select: (item: MenuItem) => void ) {

        this.div = document.createElement('div') as HTMLDivElement;

        // loading styles is expensive, so only load if theme has changed
        if (!ContextMenu.styles || !ContextMenu.stylesObj || (options.theme && options.theme !== ContextMenu.styles.theme.name)) {
            ContextMenu.styles = new Styles('flowbee-menu', new Theme(options.theme), this.div);
            ContextMenu.stylesObj = ContextMenu.styles.getObject();
        }

        const menuOptions = merge(menuDefault, options);
        this.div.className = `flowbee-menu flowbee-menu-${menuOptions.theme || ''}`;
        this.div.style.position = 'absolute';
        this.div.style.left = x + 'px';
        this.div.style.top = y + 'px';

        const iconWidth = ContextMenu.styles.getSize(ContextMenu.stylesObj['flowbee-menu ul li img'].width);
        const ul = document.createElement('ul') as HTMLUListElement;
        let tabIndex = 1;
        for (const item of this.items) {
            const li = document.createElement('li') as HTMLLIElement;
            li.setAttribute('id', item.id);
            li.setAttribute('data-flowbee-menu-item', item.id);
            li.tabIndex = tabIndex++;
            const iconDiv = document.createElement('div') as HTMLDivElement;
            if (item.icon) {
                const iconImg = document.createElement('img') as HTMLImageElement;
                const iconBase = menuOptions.iconBase ? menuOptions.iconBase : '';
                iconImg.src = `${iconBase}/${item.icon}`;
                iconDiv.appendChild(iconImg);
            } else {
                iconDiv.style.minWidth = iconWidth + 'px';
            }
            li.appendChild(iconDiv);
            const label = document.createElement('label') as HTMLLabelElement;
            label.appendChild(document.createTextNode(item.label));
            li.appendChild(label);
            if (item.key) {
                const span = document.createElement('span') as HTMLSpanElement;
                span.appendChild(document.createTextNode(item.key));
                li.appendChild(span);
            }
            li.onclick = e => {
                this.close();
                select(item);
            };
            ul.appendChild(li);
        }
        this.div.appendChild(ul);
        document.body.appendChild(this.div);
    }

    close() {
        if (this.div) {
            document.body.removeChild(this.div);
            this.div = null;
        }
    }
}

export interface ContextMenuProvider {
    getItems(flowElementEvent: FlowElementEvent): MenuItem[] | undefined;
    onSelectItem(selectEvent: ContextMenuSelectEvent): boolean;
}

export interface ContextMenuSelectEvent extends FlowElementEvent {
    element: FlowElement;
    item: MenuItem;
}

export class DefaultMenuProvider implements ContextMenuProvider {
    constructor(readonly flowDiagram: FlowDiagram) { }
    getItems(flowElementEvent: FlowElementEvent): MenuItem[] | undefined {
        if (!this.flowDiagram.readonly && flowElementEvent.element) {
            return [
                { id: 'delete', label: 'Delete', key: 'Del' }
            ];
        }
    }
    onSelectItem(selectEvent: ContextMenuSelectEvent): boolean {
        if (selectEvent.item.id === 'delete') {
            this.flowDiagram.handleDelete();
            return true;
        }
    }
}