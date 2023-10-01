import { merge } from 'merge-anything';
import { popupDefaults, PopupOptions } from './options';
import { Styles } from './style/style';
import { Theme } from './theme';
import { Disposable, Listener, TypedEvent } from './event';

export type PopupActionEvent = { action: string, [key: string]: any };

export class Popup {

    protected styles: Styles;
    protected stylesObj: object;

    protected div: HTMLDivElement;
    protected header: HTMLDivElement;
    protected title: HTMLSpanElement;
    protected help?: {
        link: HTMLAnchorElement;
        image: HTMLImageElement;
    };
    protected closeImg: HTMLInputElement;
    protected content: HTMLDivElement;
    protected footer: HTMLDivElement;

    protected container: HTMLElement;
    protected options: PopupOptions;

    protected _onPopupAction = new TypedEvent<PopupActionEvent>();
    onPopupAction(listener: Listener<PopupActionEvent>): Disposable {
        return this._onPopupAction.on(listener);
    }

    constructor(container?: HTMLElement, readonly iconBase?: string) {
        this.container = container || document.body;

        this.div = document.createElement('div') as HTMLDivElement;
        this.div.id = 'flowbee-popup';
        this.div.style.display = 'none';
        this.div.tabIndex = 0;
        this.div.onkeydown = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape' && this.isOpen) {
              this.close();
              this._onPopupAction.emit({ action: 'close' });
            }
        };

        // header
        this.header = document.createElement('div') as HTMLDivElement;
        this.header.className = 'flowbee-popup-header';
        const titleElem = document.createElement('div') as HTMLDivElement;
        titleElem.className = 'flowbee-popup-title';
        this.title = document.createElement('span') as HTMLSpanElement;
        titleElem.appendChild(this.title);
        this.help = {
            link: document.createElement('a') as HTMLAnchorElement,
            image: document.createElement('img') as HTMLImageElement
        };
        this.help.link.className = 'flowbee-popup-help';
        this.help.image.alt = 'Values help';
        this.help.image.title = 'Values help';
        this.help.link.style.display = 'none';
        this.help.link.appendChild(this.help.image);
        titleElem.appendChild(this.help.link);
        this.header.appendChild(titleElem);

        const close = document.createElement('div') as HTMLDivElement;
        close.className = 'flowbee-popup-close';
        close.onclick = (_e) => {
            this.close();
            this._onPopupAction.emit({ action: 'close' });
        };
        this.closeImg = document.createElement('input') as HTMLInputElement;
        this.closeImg.type = 'image';
        this.closeImg.alt = this.closeImg.title = 'Close';
        this.closeImg.src = `${iconBase}/close.svg`;
        this.closeImg.style.display = 'none';
        close.appendChild(this.closeImg);
        this.header.appendChild(close);
        this.div.appendChild(this.header);

        // content
        this.content = document.createElement('div') as HTMLDivElement;
        this.content.className = 'flowbee-popup-content';
        this.div.appendChild(this.content);

        // footer
        this.footer = document.createElement('div') as HTMLDivElement;
        this.footer.className = 'flowbee-popup-footer';
        this.div.appendChild(this.footer);

        document.body.appendChild(this.div);
    }

    render(spec: { options?: PopupOptions }) {
        this.options = merge(popupDefaults, spec.options);

        this.loadStyles(spec.options);
        this.doLayout();

        this.title.innerText = this.options.title;
        this.renderHelp();
        this.closeImg.style.display = 'inline-block';

        this.content.innerHTML = '';
        this.renderContent();

        this.footer.innerHTML = '';
        this.renderActions();

        this.open();
    }

    protected loadStyles(options?: PopupOptions) {
        // loading styles is expensive, so only load if theme has changed
        if (!this.styles || !this.stylesObj || (options.theme && options.theme !== this.styles.theme.name)) {
            this.styles = new Styles('flowbee-popup', new Theme(options.theme), this.div);
            this.stylesObj = this.styles.getObject();
            this.div.className = `flowbee-popup flowbee-popup-${this.options.theme || ''}`;
        }
    }

    protected renderHelp() {
        if (this.options.help) {
            this.help.link.style.display = 'inline';
            this.help.link.href = this.options.help.link;
            this.help.image.alt = this.options.help.title || 'Help';
            this.help.image.title = this.options.help.title || 'Help';
            this.help.image.src = `${this.iconBase}/${this.options.help.icon || 'help.svg'}`;
        } else {
            this.help.link.style.display = 'none';
        }
    }

    protected doLayout() {
        if (this.container !== document.body) {
            const margins = this.options.margins as { top: number, right: number, bottom: number, left: number};
            const rect = this.container.getBoundingClientRect();
            this.div.style.width = (rect.width - (margins.left + margins.right)) + 'px';
            this.div.style.height = (rect.height - (margins.top + margins.bottom)) + 'px';
            this.div.style.left = (rect.left + margins.left) + 'px';
            this.div.style.top = (rect.top + margins.top) + 'px';
        }
    }


    protected renderContent() {
    }

    protected renderActions() {
        if (this.options.actions) {
            for (const action of this.options.actions) {
                const actionButton = document.createElement('input') as HTMLInputElement;
                actionButton.type = 'button';
                actionButton.value = action.label || action.name;
                actionButton.onclick = () => {
                    if (action.close) {
                        this.div.style.display = 'none';
                    }
                    this.emitAction(action.name);
                };
                this.footer.appendChild(actionButton);
            }
        }
    }

    protected emitAction(action: string) {
        this._onPopupAction.emit({ action });
    }

    close() {
        if (this.container) {
            this.container.style.opacity = '1';
        }
        this.div.style.display = 'none';
    }

    open() {
        this.div.style.display = 'flex';
        if (this.container) {
            this.container.style.opacity = '0.5';
        }
        this.div.focus();
    }

    get isOpen(): boolean {
        return this.div.style.display === 'flex';
    }
}