import { merge } from 'merge-anything';
import { ToolboxOptions, toolboxDefault } from './options';
import { StandardDescriptors } from './descriptor';

export class Toolbox {

    options: ToolboxOptions;

    constructor(
        readonly container: HTMLElement,
        options?: ToolboxOptions
    ) {
        this.options = merge(toolboxDefault, options || {});
    }

    async render(theme: string, descriptors = StandardDescriptors) {
        const div = document.createElement('div') as HTMLDivElement;
        div.className = `toolbox toolbox-${theme || ''}`;
        const ul = document.createElement('ul') as HTMLUListElement;
        let tabIndex = 1;
        for (const descriptor of descriptors) {
            const li = document.createElement('li') as HTMLLIElement;
            li.setAttribute('id', descriptor.name);
            li.tabIndex = tabIndex++;
            if (descriptor.icon) {
                const iconDiv = document.createElement('div') as HTMLDivElement;
                iconDiv.className = 'toolbox-icon';
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
            }
            const labelDiv = document.createElement('div') as HTMLDivElement;
            labelDiv.className = 'toolbox-label';
            labelDiv.appendChild(document.createTextNode(descriptor.label));
            li.appendChild(labelDiv);
            ul.appendChild(li);
        }
        div.appendChild(ul);
        this.container.appendChild(div);

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