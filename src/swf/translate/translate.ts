import { URI as Uri } from 'vscode-uri';
import * as yaml from '../../yaml';
import * as swf from '../swf-model';
import { TranslatorOptions } from './options';
import { FlowbeeTranslator } from './flowbee';
import { SwfTranslator } from './swf';

export class FlowTranslator {
    constructor(readonly flowUri: Uri, readonly options: TranslatorOptions) {}

    async toFlowbee(swfText: string): Promise<string> {
        if (swfText === '') return ''; // newly-created: use template
        const swf = this.parse(swfText) as swf.SwfWorkflow;
        const translator = new FlowbeeTranslator(this.flowUri.toString(), swf, this.options);
        const flow = await translator.getFlow();
        const flowbeeYaml = yaml.dump(flow, this.options.indent);
        // console.debug('Loaded flowbee yaml: ' + flowbeeYaml);
        return flowbeeYaml;
    }

    async toSwf(flowbeeText: string): Promise<string> {
        // console.debug('Saving flowbee yaml: ' + flowbeeText);
        const flowbee = this.parse(flowbeeText);
        const translator = new SwfTranslator(this.flowUri.fsPath, flowbee, this.options);
        const swf = await translator.getWorkflow();
        return yaml.dump(swf, this.options.indent);
    }

    private parse(text: string): any {
        return yaml.load(this.flowUri.toString(), text);
    }
}
