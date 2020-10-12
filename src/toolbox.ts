import { merge } from 'merge-anything';
import { ToolboxOptions, DefaultOptions } from './options';
import { Specifier, StandardSpecifiers } from './spec';

export class Toolbox {

    options: ToolboxOptions;

    constructor(
        readonly container: HTMLElement,
        options?: ToolboxOptions,
        readonly specs: Specifier[] = StandardSpecifiers
    ) {
        this.options = merge(DefaultOptions.toolbox.light, options || {});
    }

    render() {
        const div = document.createElement('div') as HTMLDivElement;
        div.className = 'flowbee-toolbox';
        const ul = document.createElement('ul') as HTMLUListElement;
        let tabIndex = 1000;
        for (const spec of this.specs) {
            const li = document.createElement('li') as HTMLLIElement;
            li.setAttribute('id', spec.id);
            li.tabIndex = tabIndex;
            const iconDiv = document.createElement('div') as HTMLDivElement;
            iconDiv.className = 'flowbee-toolbox-icon';
            const iconImg = document.createElement('img') as HTMLImageElement;
            const icon = spec.icon || 'step.svg';
            iconImg.src = this.options.iconBase ? this.options.iconBase + '/' + icon : icon;
            iconDiv.appendChild(iconImg);
            li.appendChild(iconDiv);
            const labelDiv = document.createElement('div') as HTMLDivElement;
            labelDiv.className = 'flowbee-toolbox-label';
            labelDiv.style.color = this.options.labelColor;
            labelDiv.appendChild(document.createTextNode(spec.label));
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