import { merge } from 'merge-anything';
import { DrawingOptions, Font } from './options';

export class DiagramStyle {

    defaultFontSize: number;

    constructor(canvas: HTMLCanvasElement) {
        this.defaultFontSize = parseFloat(getComputedStyle(canvas).fontSize);
    }

    getDrawingOptions(theme: string): DrawingOptions {
        const obj = {};

        for (let i = 0; i < document.styleSheets.length; i++) {
            const styleSheet = document.styleSheets[i];
            for (let j = 0; j < styleSheet.cssRules.length; j++) {
                const cssRule = styleSheet.cssRules[j];
                const selectorText = (cssRule as any).selectorText;
                if (selectorText) {

                    if (selectorText === '.flowbee-diagram' || selectorText.startsWith('.flowbee-diagram ')
                      || selectorText === `.flowbee-diagram-${theme}` || selectorText.startsWith(`.flowbee-diagram-${theme} `)) {
                        //
                        const selTextObj = {};
                        const style = (cssRule as any).style;
                        if (style) {
                            let selTextName = selectorText.substring(1);
                            if (selTextName === `flowbee-diagram-${theme}`) {
                                selTextName = 'flowbee-diagram';
                            } else if (selTextName.startsWith(`flowbee-diagram-${theme} `)) {
                                const startLen = `flowbee-diagram-${theme}`.length;
                                selTextName = `flowbee-diagram ${selTextName.substring(startLen + 1)}`;
                            }

                            for (let k = 0; k < style.length; k++) {
                                const key = this.mapKey(style[k]);
                                if (key) {
                                    const val = style.getPropertyValue(style[k]);
                                    if (val) {
                                        selTextObj[key] = val;
                                    }
                                }
                            }

                            const prevSelTextObj = obj[selTextName];
                            obj[selTextName] = merge(prevSelTextObj || {}, selTextObj);
                        }
                    }
                }
            }
        }

        const diagram = obj['flowbee-diagram'];
        const grid = obj['flowbee-diagram .grid'];
        const title = obj['flowbee-diagram .title'];
        const meta = obj['flowbee-diagram .meta'];
        const milestone = obj['flowbee-diagram .milestone'];
        const step = obj['flowbee-diagram .step'];
        step.start = obj['flowbee-diagram .step .start'];
        step.stop = obj['flowbee-diagram .step .start'];
        step.pause = obj['flowbee-diagram .step .pause'];
        const link = obj['flowbee-diagram .link'];
        link.draw = obj['flowbee-diagram .link .draw'];
        link.hit = obj['flowbee-diagram .link .hit'];
        link.state = {
            initiated: obj['flowbee-diagram .link .state .initiated'],
            traversed: obj['flowbee-diagram .link .state .traversed']
        };
        const subflow = obj['flowbee-diagram .subflow'];
        subflow.hit = obj['flowbee-diagram .subflow .hit'];
        const note = obj['flowbee-diagram .note'];
        const anchor = obj['flowbee-diagram .anchor'];
        anchor.hit = obj['flowbee-diagram .anchor .hit'];
        const marquee = obj['flowbee-diagram .marquee'];
        const highlight = obj['flowbee-diagram .highlight'];
        const template = obj['flowbee-diagram .template'];
        const data = obj['flowbee-diagram .data'];

        const diagramOptions: DrawingOptions = {
            backgroundColor: diagram['background-color'],
            defaultColor: diagram.color,
            defaultLineWidth: this.getSize(obj['flowbee-diagram .line'].width),
            defaultFont: this.getFont(diagram),
            drag: {
                min: this.getSize(obj['flowbee-diagram .drag']['min-width'])
            },
            grid: {
                color: grid.color
            },
            title: {
                color: title.color,
                font: this.getFont(title)
            },
            meta: {
                color: meta.color
            },
            milestone: {
                color: milestone['background-color']
            },
            step: {
                outlineColor: step['border-color'],
                roundingRadius: this.getSize(step['border-radius']),
                minSize: this.getSize(step['min-width']),
                start: {
                    color: step['start'].color,
                    fillColor: step['start']['background-color']
                },
                stop: {
                    color: step['stop'].color,
                    fillColor: step['stop']['background-color']
                },
                pause: {
                    color: step['pause'].color,
                    fillColor: step['pause']['background-color']
                }
            },
            link: {
                lineWidth: this.getSize(link.width),
                hitWidth: this.getSize(link.hit.width),
                colors: {
                    default: link.color,
                    initiated: link.state.initiated.color,
                    traversed: link.state.traversed.color
                },
                drawColor: link.draw.color
            },
            subflow: {
                outlineColor: subflow['border-color'],
                roundingRadius: this.getSize(subflow['border-radius']),
                hitWidth: this.getSize(subflow.hit.width)
            },
            note: {
                font: this.getFont(note),
                textColor: note.color,
                outlineColor: note['border-color'],
                fillColor: note['background-color'],
                roundingRadius: this.getSize(note['border-radius']),
                minSize: this.getSize(note['min-width'])
            },
            anchor: {
                width: this.getSize(anchor.width),
                color: anchor.color,
                hitWidth: this.getSize(anchor.hit.width),
            },
            marquee: {
                outlineColor: marquee['border-color'],
                roundingRadius: this.getSize(marquee['border-radius'])
            },
            highlight: {
                margin: this.getSize(highlight.margin),
                color: highlight['border-color'],
                lineWidth: this.getSize(highlight['border-width'])
            },
            hyperlink: {
                color: obj['flowbee-diagram .hyperlink'].color
            },
            data: {
                roundingRadius: this.getSize(data['border-radius'])
            },
            template: {
                font: this.getFont(template)
            },
            statuses: [
                { name: 'Unknown', color: 'transparent' },
                { name: 'Pending', color: 'blue' },
                { name: 'In Progress', color: 'green' },
                { name: 'Failed', color: 'red' },
                { name: 'Completed', color: 'black' },
                { name: 'Canceled', color: 'darkgray' },
                { name: 'Hold', color: 'cyan' },
                { name: 'Waiting', color: 'yellow' }
            ]
        };

        return diagramOptions;
    }

    mapKey(key: string): string | null {
        if (key === 'border-top-color') {
            return 'border-color';
        } else if (key.startsWith('border-') && key.endsWith('-color')) {
            return null;
        } else if (key === 'border-top-left-radius') {
            return 'border-radius';
        } else if (key.startsWith('border-') && key.endsWith('-radius')) {
            return null;
        } else if (key === 'border-top-width') {
            return 'border-width';
        } else if (key.startsWith('border-') && key.endsWith('-width')) {
            return null;
        } else if (key === 'margin-top') {
            return 'margin';
        } else if (key.startsWith('margin-')) {
            return null;
        } else {
            return key;
        }
    }

    getSize(size: string): number {
        if (size.endsWith('px')) {
            return parseInt(size.substring(0, size.length - 2).trim());
        }
    }

    getFontSize(size: string): number {
        size = size.trim();
        if (size.endsWith('em')) {
            return Math.round(parseInt(size.substring(0, size.length - 2).trim()) * this.defaultFontSize);
        } else if (size.endsWith('px')) {
            return parseInt(size.substring(0, size.length - 2).trim());
        } else if (size.endsWith('pt')) {
            return Math.round(parseInt(size.substring(0, size.length - 2).trim()) / .75);
        } else if (size.endsWith('%')) {
            return Math.round(parseInt(size.substring(0, size.length - 2).trim()) * this.defaultFontSize / 100);
        }
    }

    getFont(element: FontElement): Font {
        const size = element['font-size'] || '';
        const family = element['font-family'] || '';
        const weight = element['font-weight'] || '';
        const style = element['font-style'] || '';
        return {
            size: this.getFontSize(element['font-size']),
            name: `${weight} ${style} ${size} ${family}`.trim()
        };
    }
}

interface FontElement {
    'font-size';
    'font-family';
    'font-weight'?;
    'font-style';
}

