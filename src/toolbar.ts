import { merge } from 'merge-anything';
import { ToolbarOptions, toolbarDefault } from './options';
import { ToolbarActionEvent, Disposable, Listener, TypedEvent } from './event';

export class Toolbar {

    private div: HTMLDivElement;

    private _onToolbarAction = new TypedEvent<ToolbarActionEvent>();
    onToolbarAction(listener: Listener<ToolbarActionEvent>): Disposable {
        return this._onToolbarAction.on(listener);
    }

    constructor(readonly container: HTMLElement) { }

    render(options: ToolbarOptions = {}) {

        const toolbarOptions = merge(toolbarDefault, options);
        const iconBase = toolbarOptions.iconBase || '';

        if (this.div) {
            this.container.removeChild(this.div);
        }
        this.div = document.createElement('div') as HTMLDivElement;
        this.div.className = `flowbee-toolbar flowbee-toolbar-${toolbarOptions.theme || ''}`;

        // diagram-tools
        const diagramTools = document.createElement('div') as HTMLDivElement;
        diagramTools.id = 'diagram-tools';
        diagramTools.className = 'drawing-tools';
        this.addInput(diagramTools, { id: 'grid', src: `${iconBase}/grid.svg`, type: 'image', alt: 'grid', title: 'Grid', 'data-icon': 'grid.svg' });
        this.addInput(diagramTools, { id: 'snap', src: `${iconBase}/snap.svg`, type: 'image', alt: 'snap', title: 'Snap to grid', 'data-icon': 'snap.svg' });
        this.addInput(diagramTools, { id: 'zoom-out', src: `${iconBase}/zoom-out.svg`, type: 'image', alt: 'zoom-out', title: 'Zoom out', 'data-icon': 'zoom-out.svg' });
        this.addInput(diagramTools, { id: 'zoom-range', type: 'range', min: '20', max: '200', value: '100', title: '100%' });
        this.addInput(diagramTools, { id: 'zoom-in', src: `${iconBase}/zoom-in.svg`, type: 'image', alt: 'zoom-in', title: 'Zoom in', 'data-icon': 'zoom-in.svg' });
        this.div.appendChild(diagramTools);

        // mode-group
        const modeGroup = document.createElement('div') as HTMLDivElement;
        modeGroup.id = 'mode-group';
        modeGroup.className = 'drawing-tools tool-group mode-group';

        const modeSelect = document.createElement('div') as HTMLDivElement;
        modeSelect.id = 'mode-select';
        modeSelect.className = 'mode-select';
        this.addInput(modeSelect, { id: 'select', src: `${iconBase}/select.png`, type: 'image', alt: 'select', title: 'Select', 'data-icon': 'select.png' });
        const connect = this.addInput(modeSelect, { id: 'connect', src: `${iconBase}/connect.svg`, type: 'image', alt: 'connect', title: 'Connect', 'data-icon': 'connect.png' });
        connect.className = 'hidden';
        const inspect = this.addInput(modeSelect, { id: 'runtime', src: `${iconBase}/inspect.svg`, type: 'image', alt: 'inspect', title: 'Inspect', 'data-icon': 'inspect.png' });
        inspect.className = 'hidden';
        const modeDrop = document.createElement('span') as HTMLSpanElement;
        modeDrop.id = 'mode-drop';
        modeDrop.className = 'drop-caret';
        modeDrop.innerText = '▼';
        modeSelect.appendChild(modeDrop);
        modeGroup.appendChild(modeSelect);

        const modeMenu = document.createElement('ul') as HTMLUListElement;
        modeMenu.id = 'mode-menu';
        modeMenu.className = 'mode-menu hidden';
        modeMenu.tabIndex = 1025;
        const selectMode = document.createElement('li') as HTMLLIElement;
        selectMode.id = 'select-mode';
        this.addImg(selectMode, `${iconBase}/select.png`, 'select', 'select.png');
        const selectSpan = document.createElement('span') as HTMLSpanElement;
        selectSpan.innerText = 'Select';
        selectMode.appendChild(selectSpan);
        modeMenu.appendChild(selectMode);
        const connectMode = document.createElement('li') as HTMLLIElement;
        connectMode.id = 'connect-mode';
        this.addImg(connectMode, `${iconBase}/connect.png`, 'connect', 'connect.png');
        const connectSpan = document.createElement('span') as HTMLSpanElement;
        connectSpan.innerText = 'Connect';
        connectMode.appendChild(connectSpan);
        modeMenu.appendChild(connectMode);
        const inspectMode = document.createElement('li') as HTMLLIElement;
        inspect.id = 'runtime-mode';
        this.addImg(inspectMode, `${iconBase}/inspect.png`, 'inspect', 'inspect.png');
        const inspectSpan = document.createElement('span') as HTMLSpanElement;
        inspectSpan.innerText = 'Inspect';
        inspectMode.appendChild(inspectSpan);
        modeMenu.appendChild(inspectMode);
        modeGroup.appendChild(modeMenu);
        this.div.appendChild(modeGroup);

        // flow-actions
        const flowActions = document.createElement('div') as HTMLDivElement;
        flowActions.id = 'flow-actions';
        flowActions.className = 'drawing-tools tool-group action-group';
        const debugInput = this.addInput(flowActions, { id: 'debug', src: `${iconBase}/debug.svg`, type: 'image', alt: 'debug', title: 'Debug', 'data-icon': 'debug.svg' });
        debugInput.className = 'hidden';
        this.addInput(flowActions, { id: 'run', src: `${iconBase}/run.svg`, type: 'image', alt: 'run', title: 'Run', 'data-icon': 'run.svg' });
        this.addInput(flowActions, { id: 'test', src: `${iconBase}/test.svg`, type: 'image', alt: 'test', title: 'Test', 'data-icon': 'test.svg' });
        const helpLink = document.createElement('a') as HTMLAnchorElement;
        helpLink.href = options.helpUrl || 'https://www.npmjs.com/package/flowbee';
        helpLink.target = '_blank';
        this.addInput(helpLink, { id: 'help', src: `${iconBase}/help.svg`, type: 'image', alt: 'help', title: 'Help', 'data-icon': 'help.svg' });
        flowActions.appendChild(helpLink);
        this.div.appendChild(flowActions);

        this.container.appendChild(this.div);
    }

    addInput(el: HTMLElement, attributes: { [name: string]: string }) {
        const input = document.createElement('input') as HTMLInputElement;
        for (const name of Object.keys(attributes)) {
            input.setAttribute(name, attributes[name]);
        }
        input.onclick = (e: MouseEvent) => {
            this._onToolbarAction.emit({ action: attributes.id });
        };

        el.appendChild(input);
        return input;
    }

    addImg(el: HTMLElement, src: string, alt: string, dataIcon: string) {
        const img = document.createElement('img') as HTMLImageElement;
        img.src = src;
        img.alt = alt;
        img.setAttribute('data-icon', dataIcon);
        el.appendChild(img);
        return img;
    }

}