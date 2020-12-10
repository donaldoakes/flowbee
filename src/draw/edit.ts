import { Diagram } from './diagram';
import { Display } from './display';
import { Font } from '../style/font';
import { diagramDefault } from '../options';

/**
 * In-place editing.
 */
export class Edit {

    font: Font;
    textAlign = 'center';
    backgroundColor: string;
    color: string;

    constructor(private diagram: Diagram, private multiline = false) {
        this.font = diagram.options.defaultFont;
        this.backgroundColor = diagram.options.backgroundColor;
        this.color = diagram.options.defaultColor;
    }

    render(text: string, display: Display, onchange: (text: string) => void, onkey?: (e: KeyboardEvent) => void) {
        this.diagram.context.clearRect(display.x, display.y, display.w, display.h);

        let x = display.x;
        let y = display.y;
        let w = display.w;
        let h = display.h;
        let fontSize = this.font.size;
        if (this.diagram.zoom !== 100) {
            const scale = this.diagram.zoom / 100;
            x = x * scale;
            y = y * scale;
            w = w * scale;
            h = h * scale;
            fontSize = fontSize * this.diagram.zoom / 100;
        }

        // render contenteditable element
        const textedit = document.createElement('p');
        textedit.setAttribute('contenteditable', 'true');
        textedit.style.backgroundColor = this.backgroundColor;
        textedit.style.color = this.color;
        textedit.style.position = 'absolute';
        const rect = this.diagram.canvas.getBoundingClientRect();
        textedit.style.left = (rect.left + window.scrollX + x) + 'px';
        textedit.style.top = (rect.top + window.scrollY + y - fontSize) + 'px';
        textedit.style.width = w + 'px';
        textedit.style.height = h + 'px';
        textedit.style.font = this.font.name;
        textedit.style.fontSize = fontSize + 'px';
        textedit.style.outline = 'none';
        textedit.style.textAlign = this.textAlign;
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
                    if (e.key === 'Enter') onchange(textedit.innerText.trim());
                    document.body.removeChild(textedit);
                    this.diagram.draw();
                }
            };
        } else if (onkey) {
            textedit.onkeydown = (e: KeyboardEvent) => onkey(e);
        }

        textedit.onblur = e => {
            onchange(textedit.innerText.trim());
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