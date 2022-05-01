import * as fs from 'fs';
import { expect } from 'chai';
import { loadFileSync, options } from './shared';
import { FlowTranslator } from '../src/swf/translate/translate';
import * as yaml from '../src/yaml';

describe('state flows', () => {

    it('switch state', async () => {
        const translator = new FlowTranslator('test/flows/switch-state.flow.yml', options);
        const swfText = fs.readFileSync('test/flows/switch-state.flow.yml', 'utf-8');
        const flowbeeText = await translator.toFlowbee(swfText);
        const flowbeeFlow = yaml.load('test/flows/switch-state.flow.yml', flowbeeText);
        const checkAppStep = flowbeeFlow.steps!.find(s => s.name === 'Check\nApplication');
        expect(checkAppStep.links?.length).to.be.equal(3);
        const conditionsAttr = checkAppStep.attributes.conditions;
        const rows = JSON.parse(conditionsAttr);
        expect(rows[0]).to.be.deep.equal(['', '${ .applicants | .income < 18000 }',true,'']);
        expect(rows[1]).to.be.deep.equal(['', '${ .applicants | .age >= 18 }','','Submit\nApplication\n']);
        expect(rows[2]).to.be.deep.equal(['reject', '${ .applicants | .age < 18 }','','Reject\nApplication\n']);
        // round-trip
        const swf = yaml.load('test/flows/switch-state.flow.yml', await translator.toSwf(flowbeeText));
        const checkAppState = swf.states.find(s => s.name === 'Check\nApplication');
        const dataConditions = checkAppState.dataConditions;
        expect(dataConditions[0].condition).to.be.equal('${ .applicants | .income < 18000 }');
        expect(dataConditions[0].end).to.be.true;
        expect(dataConditions[0].transition).to.be.undefined;
        expect(dataConditions[1].condition).to.be.equal('${ .applicants | .age >= 18 }');
        expect(dataConditions[1].end).to.be.undefined;
        expect(dataConditions[1].transition).to.be.equal('Submit\nApplication\n');
        expect(dataConditions[2].condition).to.be.equal('${ .applicants | .age < 18 }');
        expect(dataConditions[2].end).to.be.undefined;
        expect(dataConditions[2].transition).to.be.equal('Reject\nApplication\n');


        // console.log("FLOWBEE STEP: " + JSON.stringify(checkAppStep, null, 2));
    });
});