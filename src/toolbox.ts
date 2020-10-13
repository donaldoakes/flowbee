import { merge } from 'merge-anything';
import { ToolboxOptions, DefaultOptions } from './options';
import { Descriptor, StandardDescriptors } from './descriptor';

export class Toolbox {

    options: ToolboxOptions;

    constructor(
        readonly container: HTMLElement,
        options?: ToolboxOptions,
        readonly descriptors: Descriptor[] = StandardDescriptors
    ) {
        this.options = merge(DefaultOptions.toolbox.light, options || {});
    }

    render() {
        const div = document.createElement('div') as HTMLDivElement;
        div.className = 'flowbee-toolbox';
        const ul = document.createElement('ul') as HTMLUListElement;
        let tabIndex = 1000;
        for (const descriptor of this.descriptors) {
            const li = document.createElement('li') as HTMLLIElement;
            li.setAttribute('id', descriptor.name);
            li.tabIndex = tabIndex;
            const iconDiv = document.createElement('div') as HTMLDivElement;
            iconDiv.className = 'flowbee-toolbox-icon';
            const iconImg = document.createElement('img') as HTMLImageElement;
            const icon = descriptor.icon || 'step.svg';
            iconImg.src = this.options.iconBase ? this.options.iconBase + '/' + icon : icon;
            iconDiv.appendChild(iconImg);
            li.appendChild(iconDiv);
            const labelDiv = document.createElement('div') as HTMLDivElement;
            labelDiv.className = 'flowbee-toolbox-label';
            labelDiv.style.color = this.options.labelColor;
            labelDiv.appendChild(document.createTextNode(descriptor.label));
            li.appendChild(labelDiv);
            ul.appendChild(li);
            tabIndex++;
        }
        div.appendChild(ul);
        this.container.appendChild(div);

        // events
        ul.onmousedown = (e: MouseEvent) => {
            console.log("MOUSE DOWN");
            let el = e.target as HTMLElement;
            if (el.tagName !== 'LI') {
              while ((el = el.parentElement as HTMLElement) && el.tagName !== 'LI') {
                // find
              }
            }
        };
        ul.onmouseup = (_e: MouseEvent) => {
            console.log("MOUSE UP");
        };
        ul.onmouseout = (e: MouseEvent) => {
            if (e.buttons !== 1) {
                console.log("MOUSE OUT BTNS=1");
            }
        };
    }
}