import { merge } from 'merge-anything';
import { FlowTreeOptions, flowTreeDefault} from './options';
import { Theme } from './theme';
import { TypedEvent, Listener, Disposable } from './event';

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

    private div: HTMLDivElement;
//    private styles: Styles;
    private stylesObj: object;

    private tabIndex = 1;

    private _onFlowSelect = new TypedEvent<FlowTreeSelectEvent>();
    onFlowSelect(listener: Listener<FlowTreeSelectEvent>): Disposable {
        return this._onFlowSelect.on(listener);
    }

    constructor(
        public fileTree: FileTree,
        readonly container: HTMLElement
    ) { }

    render(options: FlowTreeOptions = {}) {

        // loading styles is expensive, so only load if theme has changed
        // if (!this.styles || !this.stylesObj || (options.theme && options.theme !== this.styles.theme.name)) {
        //     this.styles = new Styles('flowbee-toolbox', new Theme(options.theme), this.container);
        //     this.stylesObj = this.styles.getObject();
        // }

        const flowTreeOptions = merge(flowTreeDefault, options || {});

        if (this.div) {
            this.container.removeChild(this.div);
        }
        this.div = document.createElement('div') as HTMLDivElement;
        this.div.className = `flowbee-tree flowbee-tree-${flowTreeOptions.theme || ''}`;
        const ul = document.createElement('ul') as HTMLUListElement;
        ul.style.paddingLeft = '0px';
        this.renderItem(ul, this.fileTree, flowTreeOptions);
        this.div.appendChild(ul);
        this.container.appendChild(this.div);
    }

    private renderItem(ul: HTMLUListElement, item: FileTree, options: FlowTreeOptions) {
        if (!item.name.startsWith('.')) {
            if (item.type === 'file') {
                const li = document.createElement('li') as HTMLLIElement;
                li.setAttribute('id', item.path);
                li.className = 'flowbee-tree-flow-item';
                li.tabIndex = this.tabIndex++;
                if (options.fileIcon) {
                    let icon = options.fileIcon;
                    if (typeof icon !== 'string') {
                        icon = new Theme(options.theme).isDark ? icon.dark : icon.light;
                    }
                    const img = document.createElement('img') as HTMLImageElement;
                    img.src = icon;
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
                        this.renderItem(dirUl, child, options);
                    }
                }
                li.appendChild(dirUl);
                ul.appendChild(li);
            }
        }
    }

}