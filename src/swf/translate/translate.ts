import * as yaml from '../../yaml';
import * as swf from '../swf-model';
import { TranslatorOptions } from './options';
import { FlowbeeTranslator } from './flowbee';
import { SwfTranslator } from './swf';

export class FlowTranslator {
    constructor(readonly path: string, readonly options: TranslatorOptions) {}

    async toFlowbee(swfText: string): Promise<string> {
        if (swfText === '') return ''; // newly-created: use template
        const swf = this.parse(swfText) as swf.SwfWorkflow;
        const translator = new FlowbeeTranslator(this.path, swf, this.options);
        const flow = await translator.getFlow();
        if (this.options.output === 'JSON') {
            return JSON.stringify(flow, null, this.options.indent);
        } else {
            return yaml.dump(flow, this.options.indent);
        }
    }

    async toSwf(flowbeeText: string): Promise<string> {
        const flowbee = this.parse(flowbeeText);
        const translator = new SwfTranslator(this.path, flowbee, this.options);
        const swf = await translator.getWorkflow();
        if (this.options.output === 'JSON') {
            return JSON.stringify(swf, null, this.options.indent);
        } else {
            return yaml.dump(swf, this.options.indent);
        }
    }

    private parse(text: string): any {
        if (text.startsWith('{') && text.endsWith('}')) {
            return JSON.parse(text);
        } else {
            return yaml.load(this.path, text);
        }
    }
}
