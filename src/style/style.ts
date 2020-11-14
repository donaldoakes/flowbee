import { merge } from 'merge-anything';
import { DrawingOptions } from '../draw/options';
import { Theme } from '../theme';
import { Font, FontElement } from './font';

/**
 * TODO: refactoring needed -- use this for getSize(), getFontSize() below
 */
export class Styles {

    private defaultFontSize: number;

    constructor(
        readonly prefix: string,
        readonly theme: Theme,
        private element: HTMLElement,
        private mapKey?: ((key: string) => string)
    ) {
        this.defaultFontSize = parseFloat(getComputedStyle(element).fontSize);
    }

    /**
     * Creates an object out of css styles
     * @param theme
     */
    getObject(): object {
        let obj = {};
        for (let i = 0; i < document.styleSheets.length; i++) {
            const styleSheet = document.styleSheets[i];
            for (let j = 0; j < styleSheet.cssRules.length; j++) {
                const cssRule = styleSheet.cssRules[j];
                const selectorText = (cssRule as any).selectorText;
                if (selectorText) {
                    if (selectorText === `.${this.prefix}` || selectorText.startsWith(`.${this.prefix} `)
                      || selectorText === `.${this.prefix}-${this.theme.name}` || selectorText.startsWith(`.${this.prefix}-${this.theme.name} `)) {
                        //
                        const selTextObj = {};
                        const style = (cssRule as any).style;
                        if (style) {
                            let selTextName = selectorText.substring(1);
                            if (selTextName === `${this.prefix}-${this.theme.name}`) {
                                selTextName = `${this.prefix}`;
                            } else if (selTextName.startsWith(`${this.prefix}-${this.theme.name} `)) {
                                const startLen = `${this.prefix}-${this.theme.name}`.length;
                                selTextName = `${this.prefix} ${selTextName.substring(startLen + 1)}`;
                            }

                            for (let k = 0; k < style.length; k++) {
                                const key = this.mapKey ? this.mapKey(style[k]) : style[k];
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

        // TODO: ability to extend custom styles (instead of just built-in)
        if (!this.theme.isBuiltin) {
            const base = this.theme.isDark ? 'dark' : 'light';
            const baseStyles = new Styles(this.prefix, new Theme(base), this.element, this.mapKey).getObject();
            obj = merge(baseStyles, obj);
        }

        return obj;
    }

    getSize(value: string): number {
        if (value.endsWith('px')) {
            return parseInt(value.substring(0, value.length - 2).trim());
        }
    }

    getFontSize(value: string): number {
        value = value.trim();
        if (value.endsWith('em')) {
            return Math.round(parseInt(value.substring(0, value.length - 2).trim()) * this.defaultFontSize);
        } else if (value.endsWith('px')) {
            return parseInt(value.substring(0, value.length - 2).trim());
        } else if (value.endsWith('pt')) {
            return Math.round(parseInt(value.substring(0, value.length - 2).trim()) / .75);
        } else if (value.endsWith('%')) {
            return Math.round(parseInt(value.substring(0, value.length - 2).trim()) * this.defaultFontSize / 100);
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

export class DiagramStyle {

    private prefix = 'flowbee-diagram';

    constructor(private canvas: HTMLCanvasElement) { }

    /**
     * Translates styles into drawing options for the specified theme
     * @param theme theme for looking up css diagram styles
     */
    getDrawingOptions(theme: string): DrawingOptions {

        const styles = new Styles(this.prefix, new Theme(theme), this.canvas, this.mapKey);
        const stylesObj = styles.getObject();

        const diagram = stylesObj[`${this.prefix}`];
        const grid = stylesObj[`${this.prefix} .grid`];
        const title = stylesObj[`${this.prefix} .title`];
        const meta = stylesObj[`${this.prefix} .meta`];
        const milestone = stylesObj[`${this.prefix} .milestone`];
        const label = stylesObj[`${this.prefix} .label`] || {};
        label.select = stylesObj[`${this.prefix} .label .select`];
        const step = stylesObj[`${this.prefix} .step`];
        step.start = stylesObj[`${this.prefix} .step .start`];
        step.stop = stylesObj[`${this.prefix} .step .stop`];
        step.pause = stylesObj[`${this.prefix} .step .pause`];
        step.state = stylesObj[`${this.prefix} .step .state`];
        step.state.previous = stylesObj[`${this.prefix} .step .state .previous`];
        const link = stylesObj[`${this.prefix} .link`];
        link.draw = stylesObj[`${this.prefix} .link .draw`];
        link.hit = stylesObj[`${this.prefix} .link .hit`];
        link.state = {
            initiated: stylesObj[`${this.prefix} .link .state .initiated`],
            traversed: stylesObj[`${this.prefix} .link .state .traversed`]
        };
        const subflow = stylesObj[`${this.prefix} .subflow`];
        subflow.hit = stylesObj[`${this.prefix} .subflow .hit`];
        const note = stylesObj[`${this.prefix} .note`];
        const anchor = stylesObj[`${this.prefix} .anchor`];
        anchor.hit = stylesObj[`${this.prefix} .anchor .hit`];
        const marquee = stylesObj[`${this.prefix} .marquee`];
        const highlight = stylesObj[`${this.prefix} .highlight`];
        const template = stylesObj[`${this.prefix} .template`];
        const data = stylesObj[`${this.prefix} .data`];

        const drawingOptions: DrawingOptions = {
            backgroundColor: diagram['background-color'],
            defaultColor: diagram.color,
            defaultLineWidth: styles.getSize(stylesObj[`${this.prefix} .line`].width),
            defaultFont: styles.getFont(diagram),
            minWidth: styles.getSize(diagram['min-width']),
            minHeight: styles.getSize(diagram['min-height']),
            padding: styles.getSize(diagram.padding),
            drag: {
                min: styles.getSize(stylesObj[`${this.prefix} .drag`]['min-width'])
            },
            grid: {
                color: grid.color,
                width: styles.getSize(grid.width)
            },
            title: {
                color: title.color,
                font: styles.getFont(title),
            },
            meta: {
                color: meta.color
            },
            milestone: {
                color: milestone['background-color']
            },
            label: {
                select: {
                    color: label.select.color,
                    padding: styles.getSize(label.select.padding),
                    roundingRadius: styles.getSize(label.select['border-radius'])
                }
            },
            step: {
                outlineColor: step['border-color'],
                roundingRadius: styles.getSize(step['border-radius']),
                minWidth: styles.getSize(step['min-width']),
                minHeight: styles.getSize(step['min-height']),
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
                },
                state: {
                    width: styles.getSize(step.state.width),
                    previous: {
                        width: styles.getSize(step.state.previous.width)
                    }
                }
            },
            link: {
                lineWidth: styles.getSize(link.width),
                hitWidth: styles.getSize(link.hit.width),
                colors: {
                    default: link.color,
                    initiated: link.state.initiated.color,
                    traversed: link.state.traversed.color
                },
                drawColor: link.draw.color
            },
            subflow: {
                outlineColor: subflow['border-color'],
                roundingRadius: styles.getSize(subflow['border-radius']),
                minWidth: styles.getSize(subflow['min-width']),
                minHeight: styles.getSize(subflow['min-height']),
                hitWidth: styles.getSize(subflow.hit.width)
            },
            note: {
                font: styles.getFont(note),
                textColor: note.color,
                outlineColor: note['border-color'],
                fillColor: note['background-color'],
                roundingRadius: styles.getSize(note['border-radius']),
                minWidth: styles.getSize(note['min-width']),
                minHeight: styles.getSize(note['min-width']),
                padding: styles.getSize(note.padding)
            },
            anchor: {
                width: styles.getSize(anchor.width),
                color: anchor.color,
                hitWidth: styles.getSize(anchor.hit.width),
            },
            marquee: {
                outlineColor: marquee['border-color'],
                roundingRadius: styles.getSize(marquee['border-radius'])
            },
            highlight: {
                padding: styles.getSize(highlight.padding),
                color: highlight['border-color'],
                lineWidth: styles.getSize(highlight['border-width'])
            },
            hyperlink: {
                color: stylesObj[`${this.prefix} .hyperlink`].color
            },
            data: {
                roundingRadius: styles.getSize(data['border-radius'])
            },
            template: {
                font: styles.getFont(template)
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

        return drawingOptions;
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
        } else if (key === 'padding-top') {
            return 'padding';
        } else if (key.startsWith('padding-')) {
            return null;
        }
        else {
            return key;
        }
    }

}

