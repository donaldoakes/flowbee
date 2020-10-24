import { merge } from 'merge-anything';
import { ToolboxOptions, toolboxDefault } from './options';
import { Descriptor, StandardDescriptors } from './model/descriptor';
import { Styles } from './style/style';
import { Theme } from './theme';

export class Toolbox {

    private div: HTMLDivElement;
    private styles: Styles;
    private stylesObj: object;

    constructor(
        readonly descriptors: Descriptor[] | undefined,
        readonly container: HTMLElement
    ) {
        this.descriptors = descriptors || StandardDescriptors;
    }

    async render(options: ToolboxOptions = {}) {

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
                const iconImg = document.createElement('img') as HTMLImageElement;
                const iconBase = toolboxOptions.iconBase ? toolboxOptions.iconBase : '';
                let icon = descriptor.icon;
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
                iconImg.src = `${iconBase}/${icon}`;
                iconDiv.appendChild(iconImg);
                li.appendChild(iconDiv);
                li.ondragstart = (e: DragEvent) => {
                    e.dataTransfer.setData('text/plain', descriptor.path);
                    e.dataTransfer.setDragImage(iconImg, iconWidth, iconWidth);
                    e.dataTransfer.dropEffect = 'copy';
                };
            }
            const label = document.createElement('label') as HTMLLabelElement;
            label.appendChild(document.createTextNode(descriptor.name));
            li.appendChild(label);
            ul.appendChild(li);
        }
        this.div.appendChild(ul);
        this.container.appendChild(this.div);

        // events
        ul.onmousedown = (e: MouseEvent) => {
            // console.log("MOUSE DOWN");
            let el = e.target as HTMLElement;
            if (el.tagName !== 'LI') {
              while ((el = el.parentElement as HTMLElement) && el.tagName !== 'LI') {
                // find
              }
            }
        };
        ul.onmouseup = (_e: MouseEvent) => {
            // console.log("MOUSE UP");
        };
        ul.onmouseout = (e: MouseEvent) => {
            if (e.buttons !== 1) {
                // console.log("MOUSE OUT BTNS=1");
            }
        };
    }
}