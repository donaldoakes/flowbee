import { Diagram } from './diagram';
import { Display } from './display';
import { Font } from '../style/font';

/**
 * In-place editing.
 */
export class Edit {

    constructor(private diagram: Diagram, private multiline = false) { }

    render(text: string, display: Display, font: Font, onch: (text: string) => void) {
        this.diagram.context.clearRect(display.x, display.y, display.w, display.h);

        // render contenteditable element
        const textedit = document.createElement('p');
        textedit.setAttribute('contenteditable', 'true');
        textedit.style.position = 'absolute';
        const rect = this.diagram.canvas.getBoundingClientRect();
        textedit.style.left = (rect.left + window.scrollX + display.x) + 'px';
        textedit.style.top = (rect.top + window.scrollY + display.y - font.size) + 'px';
        textedit.style.width = display.w + 'px';
        textedit.style.height = display.h + 'px';
        textedit.style.fontFamily = font.name;
        textedit.style.fontSize = font.size + 'px';
        textedit.style.outline = 'none';
        textedit.style.textAlign = 'center';
        textedit.style.whiteSpace = 'pre';
        textedit.style.zIndex = '100';
        textedit.style.lineHeight = '1.0';
        textedit.style.display = 'inline-block';
        textedit.style.minWidth = '2px';

        textedit.appendChild(document.createTextNode(text));

        if (!this.multiline) {
            textedit.onkeydown = (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    textedit.onblur = null;
                    if (e.key === 'Enter') onch(textedit.innerText.trim());
                    document.body.removeChild(textedit);
                    this.diagram.draw();
                }
            };
        }

        textedit.onblur = e => {
            onch(textedit.innerText.trim());
            document.body.removeChild(textedit);
            this.diagram.draw();
        };

        document.body.appendChild(textedit);

        textedit.focus();
        const range = document.createRange();
        range.selectNodeContents(textedit);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}