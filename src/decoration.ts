/**
 * 0-based numbers
 */
export interface Range {
    line: number;
    start: number;
    end: number;
}

export interface Decoration {
    range: Range;
    className: string;
}

export type Decorator = (text: string) => Decoration[];

const isDecorator = (dec: Decorator | Decoration): dec is Decorator => {
    return typeof dec === 'function';
};

export const decorate = (element: HTMLElement, text: string, decs: Decorator[] | Decoration[]) =>  {
    if (decs.length) {
        if (isDecorator(decs[0])) {
            decorate(element, text, (decs as Decorator[]).reduce((decorations, dec) => {
                decorations.push(...dec(text));
                return decorations;
            }, []));
        } else {
            const decorations = decs as Decoration[];
            if (decorations.length) {
                decorations.sort((dec1, dec2) => {
                    if (dec1.range.line !== dec2.range.line) {
                        return dec1.range.line - dec2.range.line;
                    }
                    if (dec1.range.start !== dec2.range.start) {
                        return dec1.range.start - dec2.range.start;
                    }
                    return 0;
                });

                // apply decorations
                const lines = text.split(/\r?\n/);
                const lineDecs: { line: string, decorations: Decoration[] }[] = lines.reduce((decs, line, i) => {
                    const lineDecorations = decorations.filter(dec => dec.range.line === i);
                    if (lineDecorations.length) decs.push({ line, decorations: lineDecorations });
                    return decs;
                }, []);

                if (lineDecs.length) {
                    for (const lineDecorations of lineDecs) {
                        const line = lineDecorations.line;
                        const decs = lineDecorations.decorations;
                        const outer = document.createElement('div') as HTMLDivElement;
                        if (decs.length) {
                            let leftOff = -1;
                            for (const lineDec of decs) {
                                if (lineDec.range.start < leftOff) {
                                    throw new Error(`Overlapping range: ${lineDec.range}`);
                                }
                                // text preceding decoration
                                if (lineDec.range.start > leftOff) {
                                    addSpan(outer, line.substring(leftOff + 1, lineDec.range.start));
                                }
                                // decorated text
                                addSpan(outer, line.substring(lineDec.range.start, lineDec.range.end + 1), lineDec.className);

                                leftOff = lineDec.range.end;
                            }
                            if (leftOff < line.length - 1) {
                                addSpan(outer, line.substring(leftOff + 1));
                            }
                        } else {
                            outer.textContent = line;
                        }
                        element.appendChild(outer);
                    }
                }
            } else {
                element.textContent = text;
            }
        }
    } else {
        element.textContent = text;
    }

};

const addSpan = (parent: HTMLElement, text: string, className?: string) => {
    const span = document.createElement('span') as HTMLSpanElement;
    if (className) span.className = className;
    span.textContent = text;
    parent.appendChild(span);
};

/**
 * Retrieve raw element value
 */
export const undecorate = (element: HTMLElement): string => {
    let val: string;
    if (element.firstChild?.nodeName === 'DIV') {
        // multiline
        val = '';
        element.childNodes.forEach(child => {
            if (val) val += '\n';
            val += child.textContent;
        });
    } else {
        val = element.textContent;
    }
    return val;
};