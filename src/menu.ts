import { merge } from 'merge-anything';
import { FlowElementEvent } from './event';
import { FlowElement } from './model/element';
import { menuDefault, MenuOptions } from './options';
import { Styles } from './style/style';
import { Theme } from './theme';

export interface MenuItem {
    label: string;
    key?: string;
    icon?: string;
}

export class ContextMenu {

    private styles: Styles;
    private stylesObj: object;

    constructor(
        private items: MenuItem[]
    ) { }

    render(options: MenuOptions = {}, x: number, y: number) {

        const div = document.createElement('div') as HTMLDivElement;

        // loading styles is expensive, so only load if theme has changed
        if (!this.styles || !this.stylesObj || (options.theme && options.theme !== this.styles.theme.name)) {
            this.styles = new Styles('flowbee-menu', new Theme(options.theme), div);
            this.stylesObj = this.styles.getObject();
        }

        const menuOptions = merge(menuDefault, options);
        div.className = `flowbee-menu flowbee-menu-${menuOptions.theme || ''}`;
        div.style.position = 'absolute';
        div.style.left = x + 'px';
        div.style.top = y + 'px';

        const iconWidth = this.styles.getSize(this.stylesObj['flowbee-menu ul li img'].width);
        const ul = document.createElement('ul') as HTMLUListElement;
        for (const item of this.items) {
            const li = document.createElement('li') as HTMLLIElement;
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
            ul.appendChild(li);
        }
        div.appendChild(ul);
        document.body.appendChild(div);
    }
}

export interface ContextMenuProvider {
    getItems(flowElementEvent: FlowElementEvent): MenuItem[] | undefined;
    onSelectItem(selectEvent: ContextMenuSelectEvent);
}

export interface ContextMenuSelectEvent extends FlowElementEvent {
    element: FlowElement;
    item: MenuItem;
}

export class DefaultMenuProvider implements ContextMenuProvider {
    constructor(readonly readonly: boolean) { }
    getItems(flowElementEvent: FlowElementEvent): MenuItem[] | undefined {
        if (!this.readonly && flowElementEvent.element) {
            return [
                { label: 'Delete', key: 'Del' }
            ];
        }
    }
    onSelectItem(selectEvent: ContextMenuSelectEvent) {
        if (selectEvent.item.label === 'Delete') {
            console.log("DELETE: " + selectEvent.element.id);
        }
    }
}