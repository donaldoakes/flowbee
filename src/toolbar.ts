import { merge } from 'merge-anything';
import { ToolbarOptions, toolbarDefault } from './options';

export class Toolbar {

    private div: HTMLDivElement;

    constructor(readonly container: HTMLElement) { }

    render(options: ToolbarOptions = {}) {

        const toolbarOptions = merge(toolbarDefault, options);

        if (this.div) {
            this.container.removeChild(this.div);
        }
        this.div = document.createElement('div') as HTMLDivElement;
        this.div.className = `flowbee-toolbar flowbee-toolbar-${toolbarOptions.theme || ''}`;

        this.container.appendChild(this.div);
    }

}