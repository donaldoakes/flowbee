import { merge } from 'merge-anything';
import { ToolboxOptions, toolboxDefault } from './options';
import { StandardDescriptors } from './model/descriptor';
import { Styles } from './style/style';
import { Theme } from './theme';

export class Toolbox {

    readonly options: ToolboxOptions;
    private div: HTMLDivElement;

    constructor(
        readonly container: HTMLElement,
        options?: ToolboxOptions
    ) {
        this.options = merge(toolboxDefault, options || {});
    }

    async render(theme: string, descriptors = StandardDescriptors) {
        const styles = new Styles('flowbee-toolbox', new Theme(theme), this.container);
        const stylesObj = styles.getObject();
        const iconWidth = styles.getSize(stylesObj['flowbee-toolbox ul li img'].width);

        if (this.div) {
            this.container.removeChild(this.div);
        }
        this.div = document.createElement('div') as HTMLDivElement;
        this.div.className = `flowbee-toolbox flowbee-toolbox-${theme || ''}`;
        const ul = document.createElement('ul') as HTMLUListElement;
        let tabIndex = 1;
        for (const descriptor of descriptors) {
            const li = document.createElement('li') as HTMLLIElement;
            li.setAttribute('id', descriptor.name);
            li.setAttribute('draggable', "true");
            li.tabIndex = tabIndex++;
            if (descriptor.icon) {
                const iconDiv = document.createElement('div') as HTMLDivElement;
                const iconImg = document.createElement('img') as HTMLImageElement;
                const iconBase = this.options.iconBase ? this.options.iconBase : '';
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
                    e.dataTransfer.setData('text/plain', descriptor.name);
                    e.dataTransfer.setDragImage(iconImg, iconWidth, iconWidth);
                    e.dataTransfer.dropEffect = 'copy';
                };
            }
            const label = document.createElement('label') as HTMLLabelElement;
            label.appendChild(document.createTextNode(descriptor.label));
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