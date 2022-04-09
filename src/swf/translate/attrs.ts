import { Descriptor } from '../../model/descriptor';
import { ConfigTemplate, Widget } from '../../model/template';
import { TranslatorOptions } from './options';
import { SwfWorkflow, AnyState } from '../swf-model';
import * as yaml from '../../yaml';

export type SwfSpec = { [attribute: string]: string | { element: string; props: string[] } };
export type SwfWidget = Widget & { swf?: string };
export type TemplateSpec = string | Descriptor;
export type Attributes = { [name: string]: string };

export class Attrs {
    static swfSpecs = new Map<string, SwfSpec>();

    constructor(readonly options: TranslatorOptions) {}

    /**
     * Writes from swf model and metadata values to attributes (in-place)
     */
    async applySwf(templateSpec: TemplateSpec, swf: SwfWorkflow | AnyState, attributes: Attributes) {
        const swfSpec = await this.getSwfSpec(templateSpec);
        for (const attr of Object.keys(swfSpec)) {
            const spec = swfSpec[attr];
            let value: any;
            if (typeof spec === 'string') {
                const val = this.get(spec, swf);
                if (val !== undefined) {
                    if (typeof val === 'string') {
                        value = val;
                    } else {
                        value = JSON.stringify(val);
                    }
                }
            } else {
                const swfElem = this.get(spec.element, swf);
                if (Array.isArray(swfElem)) {
                    const rows: string[][] = [];
                    for (const swfItem of swfElem) {
                        const row: string[] = [];
                        if (spec.props.length === 1 && typeof swfItem === 'string') {
                            row.push(swfItem);
                        } else {
                            for (let prop of spec.props) {
                                let context = swfItem;
                                if (prop.startsWith('$.')) {
                                    context = swf;
                                    prop = prop.substring(2);
                                }
                                row.push(this.get(prop, context) || '');
                            }
                        }
                        rows.push(row);
                    }
                    value = JSON.stringify(rows);
                } else if (typeof swfElem === 'object') {
                    const rows: string[][] = [];
                    for (const swfKey of Object.keys(swfElem)) {
                        let swfVal = swfElem[swfKey];
                        if (swfVal === undefined) swfVal = '';
                        if (typeof swfVal !== 'string') swfVal = JSON.stringify(swfVal);
                        rows.push([swfKey, swfVal]);
                    }
                    value = JSON.stringify(rows);
                }
            }
            if (value) {
                attributes[attr] = value;
            } else {
                delete attributes[attr];
            }
        }
    }

    /**
     * Writes attributes to swf model and metadata values (in-place)
     */
    async applyAttrs(templateSpec: TemplateSpec, attributes: Attributes, swf: SwfWorkflow | AnyState) {
        const swfSpec = await this.getSwfSpec(templateSpec);
        for (const attr of Object.keys(swfSpec)) {
            const spec = swfSpec[attr];
            const attrVal = attributes[attr];
            if (typeof spec === 'string') {
                // metadata must be flat string values; otherwise parse to object (eg: injectData)
                // TODO tables and maps are stored as arrays/objects -- final pass to serialize metadata vals
                if (
                    attrVal?.startsWith('{') &&
                    attrVal?.endsWith('}') &&
                    !spec.startsWith('metadata.')
                ) {
                    this.set(spec, JSON.parse(attrVal), swf);
                } else {
                    this.set(spec, attrVal, swf);
                }
            } else {
                // table widget attribute
                if (attrVal) {
                    const rows = JSON.parse(attrVal);
                    const isStrings = spec.props.length === 1 && spec.props[0] === '';
                    const isMap =
                        spec.props.length === 2 && spec.props[0] === '' && spec.props[1] === '';
                    this.set(spec.element, isMap ? {} : [], swf);
                    for (const [rowIdx, row] of rows.entries()) {
                        if (isStrings) {
                            this.set(`${spec.element}[${rowIdx}]`, row[0], swf);
                        } else if (isMap) {
                            this.set(`${spec.element}.${row[0]}`, row[1], swf);
                        } else {
                            for (const [propIdx, prop] of spec.props.entries()) {
                                if (row.length > propIdx && row[propIdx] !== '') {
                                    if (prop.startsWith('$.')) {
                                        this.set(prop.substring(2), row[propIdx], swf);
                                    } else {
                                        this.set(
                                            `${spec.element}[${rowIdx}].${prop}`,
                                            row[propIdx],
                                            swf
                                        );
                                    }
                                }
                            }
                        }
                    }
                } else {
                    this.set(spec.element, attrVal, swf);
                }
            }
        }
    }

    /**
     * throws if template not found
     */
    async getSwfSpec(templateSpec: TemplateSpec): Promise<SwfSpec> {
        const key = typeof templateSpec === 'string' ? templateSpec : templateSpec.path;
        let swfSpec = Attrs.swfSpecs.get(key);
        if (!swfSpec) {
            let cfgTemplate: ConfigTemplate;
            if (typeof templateSpec === 'string') {
                cfgTemplate = await this.loadTemplate(
                    `${this.options.templatePath}/${templateSpec}.yaml`
                );
            } else if (templateSpec.template) {
                if (typeof templateSpec.template === 'string') {
                    cfgTemplate = await this.loadTemplate(
                        `${this.options.customPath || '.'}/${templateSpec.template}`);
                } else {
                    cfgTemplate = templateSpec.template;
                }
            } else {
                cfgTemplate = {};
            }
            swfSpec = {};
            for (const topKey of Object.keys(cfgTemplate)) {
                const widgets = cfgTemplate[topKey].widgets as SwfWidget[];
                if (widgets) {
                    for (const widget of widgets) {
                        // const widget = w as Widget & { swf?: string };
                        if (widget.attribute) {
                            const spec = widget.swf || `metadata.${widget.attribute}`;
                            if (widget.type === 'table') {
                                const specs: string[] = [];
                                if (widget.widgets) {
                                    for (const tblWidget of widget.widgets as SwfWidget[]) {
                                        if (tblWidget.swf) {
                                            specs.push(tblWidget.swf);
                                        } else {
                                            specs.push(''); // no default -- col align spacer
                                        }
                                        swfSpec[widget.attribute] = { element: spec, props: specs };
                                    }
                                }
                            } else {
                                swfSpec[widget.attribute] = spec;
                            }
                        }
                    }
                }
            }
            Attrs.swfSpecs.set(key, swfSpec);
        }
        return swfSpec;
    }

    private async loadTemplate(source: string): Promise<ConfigTemplate> {
        const templateText = await this.options.loadTemplate(source);
        if (templateText.startsWith('{')) {
            return JSON.parse(templateText);
        } else {
            return yaml.load(source, templateText);
        }
    }

    /**
     * Safe evaluation of object paths
     */
    private get(path: string, context: any): any {
        let res = context;
        for (const seg of this.tokenize(path)) {
            if (!res[seg]) return undefined;
            res = res[seg];
        }
        return res;
    }

    private set(path: string, value: any, context: any) {
        let target = context;
        const segs = this.tokenize(path);
        for (let i = 0; i < segs.length; i++) {
            const seg = segs[i];
            if (i === segs.length - 1) {
                target[seg] = value;
            } else {
                if (value === undefined) {
                    break;
                } else if (!target[seg]) {
                    target[seg] = typeof segs[i + 1] === 'number' ? [] : {};
                }
                target = target[seg];
            }
        }
    }

    private tokenize(path: string): (string | number)[] {
        return path.split(/\.(?![^[]*])/).reduce((segs: (string | number)[], seg) => {
            if (seg.search(/\[.+?]$/) > 0) {
                // indexer(s)
                const start = seg.indexOf('[');
                segs.push(seg.substring(0, start));
                let remains = seg.substring(start);
                while (remains.length > 0) {
                    const indexer = remains.substring(1, remains.indexOf(']'));
                    if (
                        (indexer.startsWith("'") && indexer.startsWith("'")) ||
                        (indexer.endsWith('"') && indexer.endsWith('"'))
                    ) {
                        segs.push(indexer.substring(1, indexer.length - 1)); // object property
                    } else {
                        segs.push(parseInt(indexer)); // array index
                    }
                    remains = remains.substring(indexer.length + 2);
                }
            } else {
                segs.push(seg);
            }
            return segs;
        }, []);
    }
}
