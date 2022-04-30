import { merge } from 'merge-anything';
import { ToolboxOptions, toolboxDefault } from './options';
import { Descriptor, StandardDescriptors } from './model/descriptor';
import { Styles } from './style/style';
import { Theme } from './theme';
import { ItemOpenEvent, Listener, TypedEvent, Disposable } from './event';

export class Toolbox {

    private div: HTMLDivElement;
    private styles: Styles;
    private stylesObj: object;
    private _onItemOpen = new TypedEvent<ItemOpenEvent>();
    onItemOpen(listener: Listener<ItemOpenEvent>): Disposable {
        return this._onItemOpen.on(listener);
    }

    constructor(
        readonly descriptors: Descriptor[] | undefined,
        readonly container: HTMLElement
    ) {
        this.descriptors = descriptors || StandardDescriptors;
    }

    render(options: ToolboxOptions = {}) {

        // loading styles is expensive, so only load if theme has changed
        if (!this.styles || !this.stylesObj || (options.theme && options.theme !== this.styles.theme.name)) {
            this.styles = new Styles('flowbee-toolbox', new Theme(options.theme), this.container);
            this.stylesObj = this.styles.getObject();
        }
        const iconWidth = this.styles.getSize(this.stylesObj['flowbee-toolbox ul li img'].width);

        const toolboxOptions = merge(toolboxDefault, options);

        if (this.div) {
            this.container.removeChild(this.div);
        }

        this.div = document.createElement('div') as HTMLDivElement;
        this.div.className = `flowbee-toolbox flowbee-toolbox-${toolboxOptions.theme || ''}`;
        const ul = document.createElement('ul') as HTMLUListElement;
        let tabIndex = 1;
        for (const descriptor of this.descriptors) {
            const li = document.createElement('li') as HTMLLIElement;
            li.setAttribute('id', descriptor.path);
            li.setAttribute('draggable', "true");
            li.tabIndex = tabIndex++;
            if (descriptor.icon) {
                const iconDiv = document.createElement('div') as HTMLDivElement;
                const iconBase = toolboxOptions.iconBase ? toolboxOptions.iconBase : '';
                let icon = typeof descriptor.icon === 'string' ? descriptor.icon : descriptor.icon.src;
                switch (icon) {
                    case 'shape:start':
                        icon = 'start.png';
                        break;
                    case 'shape:stop':
                        icon = 'stop.png';
                        break;
                    case 'shape:pause':
                        icon = 'pause.png';
                        break;
                    case 'shape:decision':
                        icon = 'decision.png';
                        break;
                }
                let iconElem: HTMLElement;
                if (icon.startsWith('<svg') || icon.startsWith('<?xml')) {
                    if (icon.startsWith('<?xml')) {
                        icon = icon.substring(icon.indexOf('>') + 1).trim();
                    }
                    iconDiv.innerHTML = icon;
                    iconElem = iconDiv.firstChild as HTMLElement;
                } else {
                    iconElem = document.createElement('img');
                    (iconElem as HTMLImageElement).src = `${iconBase}/${icon}`;
                    iconDiv.appendChild(iconElem);
                }
                li.appendChild(iconDiv);
                li.ondragstart = (e: DragEvent) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(descriptor));
                    e.dataTransfer.setDragImage(iconElem, iconWidth, iconWidth);
                    e.dataTransfer.dropEffect = 'copy';
                };
            }
            const label = document.createElement('label') as HTMLLabelElement;
            label.appendChild(document.createTextNode(descriptor.name));
            li.appendChild(label);
            if (descriptor.link) {
                const a = document.createElement('a') as HTMLAnchorElement;
                a.href = descriptor.link.url;
                const t = document.createTextNode(descriptor.link.label);
                a.appendChild(t);
                if (this._onItemOpen) {
                    a.onclick = (e: MouseEvent) => {
                        this._onItemOpen.emit({ url: descriptor.link.url });
                    };
                }
                li.appendChild(a);
            }
            ul.appendChild(li);
        }
        this.div.appendChild(ul);
        this.container.appendChild(this.div);
    }
}