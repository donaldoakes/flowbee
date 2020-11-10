import { Diagram } from './diagram';
import { Step } from './step';

/**
 * In-place editing.
 */
export class Edit {

    constructor(private diagram: Diagram) { }

    render(step: Step) {
        if (step.title && step.title.lines && step.title.lines.length > 0) {
          this.diagram.context.clearRect(step.title.x, step.title.y, step.title.w, step.title.h);

          // render contenteditable element
          const textedit = document.createElement('p');
          textedit.setAttribute('contenteditable', 'true');
          textedit.style.position = 'absolute';
          const font = this.diagram.options.defaultFont;
          const rect = this.diagram.canvas.getBoundingClientRect();
          textedit.style.left = (rect.left + window.scrollX + step.title.x) + 'px';
          textedit.style.top = (rect.top + window.scrollY + step.title.y - font.size) + 'px';
          textedit.style.width = step.title.w + 'px';
          textedit.style.height = step.title.h + 'px';
          textedit.style.fontFamily = font.name;
          textedit.style.fontSize = font.size + 'px';
          textedit.style.outline = 'none';
          textedit.style.textAlign = 'center';
          textedit.style.whiteSpace = 'pre';
          textedit.style.zIndex = '100';
          textedit.style.lineHeight = '1.0';
          textedit.style.display = 'inline-block';

          textedit.appendChild(document.createTextNode(step.title.text));

          textedit.onblur = e => {
            step.step.name = textedit.innerText;
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
}