import { FlowDiagram } from './diagram';
import { FlowElement } from './model/element';

/**
 * Cut/copy/paste via OS clipboard, plus delete.
 * TODO: also provide undo/redo stack
 */
export class Clipper {

    constructor(readonly flowDiagram: FlowDiagram) { }

    async cut(): Promise<FlowElement[]> {
        const selected = await this.copy();
        if (selected) {
            await this.delete();
        }
        return selected;
    }

    async copy(): Promise<FlowElement[]> {
        const flowElements = this.flowDiagram.selected;
        if (flowElements.length > 0) {
            const txt = JSON.stringify({ flowbeeElements: flowElements });
            await navigator.clipboard.writeText(txt);
        }
        return flowElements;
    }

    async paste() {
        const txt = await navigator.clipboard.readText();
        if (txt.startsWith('{')) {
            try {
               const obj = JSON.parse(txt);
               const elements = obj.flowbeeElements;
               if (elements) {
                   this.flowDiagram.handleInsert(elements as FlowElement[]);
               }
            } catch (err) {
                // not json
            }
        }
    }

    async delete() {
        this.flowDiagram.handleDelete();
    }
}