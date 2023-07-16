/**
 * 0-based numbers
 */
export interface Range {
    line: number;
    start: number;
    end: number;
}

export interface HoverAction {
    name: string;
    args?: { [key: string]: string };
}

export interface HoverLine {
    label?: string;
    value?: string;
    link?: {
        label: string;
        action: HoverAction;
        title?: string;
    }
}
export interface Hover {
    /**
     * Overrides flowbee default (flowbee-tooltip-box)
     */
    className?: string;
    lines: HoverLine[];
    onAction?: (action: HoverAction ) => void;
    location?: {
        top?: string;
        left?: string;
    }
    theme: 'light' | 'dark';
}

export interface LensAction {
    name: string;
    path: string;
    artifact: string;
}

export interface Lens {
    range: Range;
    label: string;
    action: LensAction;
}

export interface Decoration {
    range: Range;
    className?: string;
    glyphClassName?: string;
    hover?: Hover;
    onHover?: (element: HTMLElement, tooltip: HTMLElement, evt: MouseEvent) => void;
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
                let lines = text.split(/\r?\n/);
                // trim trailing line sep
                if (lines.length > 1 && !lines[lines.length - 1].trim()) lines = lines.slice(0, lines.length - 1);
                const lineDecs: { i: number, line: string, decorations: Decoration[] }[] = lines.reduce((decs, line, i) => {
                    const lineDecorations = decorations.filter(dec => dec.range.line === i);
                    if (lineDecorations.length) decs.push({ i, line, decorations: lineDecorations });
                    return decs;
                }, []);

                if (lineDecs.length) {
                    for (const [i, line] of lines.entries()) {
                        const outer = document.createElement('div') as HTMLDivElement;
                        const lineDecoration = lineDecs.find(ld => ld.i === i);
                        if (lineDecoration) {
                            const line = lineDecoration.line;
                            const decs = lineDecoration.decorations;
                            outer.className = 'flowbee-decked';
                            if (decs.length) {
                                let leftOff = -1;
                                for (const lineDec of decs) {
                                    if (lineDec.range.start < leftOff) {
                                        throw new Error(`Overlapping range: ${lineDec.range}`);
                                    }
                                    // text preceding decoration
                                    if (lineDec.range.start > 0 && lineDec.range.start > leftOff) {
                                        addSpan(outer, line.substring(leftOff + 1, lineDec.range.start));
                                    }
                                    // decorated text
                                    addSpan(outer, line.substring(lineDec.range.start, lineDec.range.end + 1), lineDec);
                                    leftOff = lineDec.range.end;
                                }
                                if (leftOff < line.length - 1) {
                                    addSpan(outer, line.substring(leftOff + 1));
                                }
                            } else {
                                outer.textContent = line;
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

const addSpan = (parent: HTMLElement, text: string, decoration?: Decoration) => {
    const span = document.createElement('span') as HTMLSpanElement;
    if (decoration?.className) span.className = decoration.className;
    span.appendChild(document.createTextNode(text));

    if (decoration?.hover) {
        span.className += (span.className ? ' ' : '') + 'flowbee-tipped';
        const tooltip = document.createElement('div') as HTMLDivElement;
        tooltip.className = decoration.hover.className || `flowbee-tooltip-${decoration.hover.theme}`;
        if (decoration.onHover) {
            span.onmousemove = (evt: MouseEvent) => {
                decoration.onHover(span, tooltip, evt);
            };
        }
        for (const [i, hoverLine] of decoration.hover.lines.entries()) {
            const line = document.createElement('div') as HTMLDivElement;
            line.className = 'tooltip-line';
            if (hoverLine.label) {
                const label = document.createElement('span') as HTMLSpanElement;
                label.className = 'tooltip-label';
                label.innerText = hoverLine.label;
                line.appendChild(label);
            }
            if (hoverLine.value) {
                const value = document.createElement('span') as HTMLSpanElement;
                value.className = 'tooltip-value';
                value.innerText = hoverLine.value;
                line.appendChild(value);
            }
            if (hoverLine.link) {
                const link = document.createElement('a') as HTMLAnchorElement;
                link.className = 'tooltip-link';
                if (hoverLine.link?.title) link.title = hoverLine.link.title;
                link.innerText = hoverLine.link.label;
                if (decoration.hover.onAction) {
                    link.onclick = (evt) => {
                        evt.preventDefault();
                        decoration.hover.onAction(hoverLine.link.action);
                    };
                }
                line.appendChild(link);
            }
            if (i === decoration.hover.lines.length - 1) {
                line.style.borderBottom = '1px solid transparent';
            }
            tooltip.appendChild(line);
        }
        if (decoration.hover.location?.top) {
            tooltip.style.top = decoration.hover.location.top;
        } else {
            tooltip.style.top = `-${(decoration.hover.lines.length) * 22 + 6}px`;
        }
        if (decoration.hover.location?.left) {
            tooltip.style.left = decoration.hover.location.left;
        } else {
            tooltip.style.left = '10px';
        }
        span.appendChild(tooltip);
    }
    parent.appendChild(span);
};

/**
 * Retrieve raw element value
 */
export const undecorate = (element: HTMLElement): string => {
    let val: string;
    const firstChild = element.firstChild;
    if (firstChild?.nodeName === 'DIV') {
        // expression line(s)
        val = '';
        element.childNodes.forEach(child => {
            if (val) val += '\n';
            if ((child as HTMLElement).classList?.contains('flowbee-decked')) {
                const firstGrand = child.firstChild as HTMLElement;
                if (firstGrand?.nodeName === 'SPAN') {
                    // segments
                    child.childNodes.forEach((grand: HTMLElement) => {
                        if (grand.classList?.contains('flowbee-tipped') && grand.firstChild?.nodeType === Node.TEXT_NODE) {
                            val += grand.firstChild.textContent;
                        } else {
                            val += grand.textContent;
                        }
                    });
                } else {
                    val += child.textContent;
                }
            } else {
                val += child.textContent;
            }
        });
    } else {
        // compatibility
        val = element.textContent;
    }
    return val;
};