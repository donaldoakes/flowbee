import { merge } from 'merge-anything';
import { FlowTreeOptions, flowTreeDefault } from './options';
import { TypedEvent, Listener } from './event';

export type FileItemType = 'file' | 'directory';

/**
 * Tree model for rendering flows
 * (TODO: categorized toolbox also rendered in collapsible panels
 * using same model).
 */
export interface FileTree {
    path: string;
    name: string;
    type: FileItemType;
    children?: FileTree[];
    size?: number;
}

export interface FlowTreeSelectEvent {
    path: string;
    name: string;
    size?: number;
}

export class FlowTree {

    options: FlowTreeOptions;
    private tabIndex = 1;

    private _onFlowSelect = new TypedEvent<FlowTreeSelectEvent>();
    onFlowSelect(listener: Listener<FlowTreeSelectEvent>) {
        this._onFlowSelect.on(listener);
    }

    constructor(
        readonly container: HTMLElement,
        options?: FlowTreeOptions
    ) {
        this.options = merge(flowTreeDefault, options || {});
    }

    async render(theme: string, fileTree: FileTree) {
        const div = document.createElement('div') as HTMLDivElement;
        div.className = `flowbee-tree flowbee-tree-${theme || ''}`;
        const ul = document.createElement('ul') as HTMLUListElement;
        ul.style.paddingLeft = '0px';
        this.renderItem(ul, fileTree);
        div.appendChild(ul);
        this.container.appendChild(div);
    }

    renderItem(ul: HTMLUListElement, item: FileTree) {
        // TODO honor dark
        if (!item.name.startsWith('.')) {
            if (item.type === 'file') {
                const li = document.createElement('li') as HTMLLIElement;
                li.setAttribute('id', item.path);
                li.className = 'flowbee-tree-flow-item';
                li.tabIndex = this.tabIndex++;
                if (this.options.fileIcon) {
                    const img = document.createElement('img') as HTMLImageElement;
                    img.src = this.options.fileIcon;
                    img.alt = 'flow';
                    img.className = 'flowbee-flow-icon';
                    li.appendChild(img);
                }
                li.addEventListener('click', async () => {
                    this._onFlowSelect.emit({
                        path: item.path,
                        name: item.name,
                        size: item.size
                    });
                });
                li.appendChild(document.createTextNode(item.name));
                ul.appendChild(li);

            } else if (item.type === 'directory') {
                const li = document.createElement('li') as HTMLLIElement;
                const span = document.createElement('span') as HTMLSpanElement;
                span.className = 'flowbee-caret';
                span.addEventListener('click', () => {
                    li.querySelector('.flowbee-nested').classList.toggle('flowbee-hidden');
                    span.classList.toggle('flowbee-caret-closed');
                });
                li.appendChild(span);
                const dirUl = document.createElement('ul') as HTMLUListElement;
                dirUl.className = 'flowbee-nested';
                span.appendChild(document.createTextNode(item.name));
                if (item.children) {
                    for (const child of item.children) {
                        this.renderItem(dirUl, child);
                    }
                }
                li.appendChild(dirUl);
                ul.appendChild(li);
            }
        }
    }

}