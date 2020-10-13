import { merge } from 'merge-anything';
import { FlowTreeOptions, DefaultOptions } from './options';
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
    private tabIndex: number;

    private _onFlowSelect = new TypedEvent<FlowTreeSelectEvent>();
    onFlowSelect(listener: Listener<FlowTreeSelectEvent>) {
        this._onFlowSelect.on(listener);
    }

    constructor(
        readonly container: HTMLElement,
        options?: FlowTreeOptions
    ) {
        this.options = merge(DefaultOptions.flowTree.light, options || {});
        this.tabIndex = options.tabIndex;
    }

    renderItem(ul: HTMLUListElement, item: FileTree) {
        // TODO honor dark
        if (!item.name.startsWith('.')) {
            if (item.type === 'file') {
                const li = document.createElement('li') as HTMLLIElement;
                li.setAttribute('id', item.path);
                li.className = 'tree-flow-item';
                li.tabIndex = this.tabIndex++;
                const img = document.createElement('img') as HTMLImageElement;
                img.src = '/img/flow.svg';
                img.alt = 'flow';
                img.className = 'tree-flow-icon';
                li.appendChild(img);
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
                span.className = 'tree-caret';
                span.addEventListener('click', () => {
                    li.querySelector('.tree-nested').classList.toggle('tree-hidden');
                    span.classList.toggle('tree-caret-closed');
                });
                li.appendChild(span);
                const dirUl = document.createElement('ul') as HTMLUListElement;
                dirUl.className = 'tree-nested';
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

    async render(fileTree: FileTree) {
        const ul = document.createElement('ul') as HTMLUListElement;
        ul.style.paddingLeft = '0px';
        this.renderItem(ul, fileTree);
        this.container.appendChild(ul);
    }

}