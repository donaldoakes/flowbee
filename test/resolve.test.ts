import { expect } from 'chai';
import { resolve, tokenize } from '../src/resolve';

describe('resolve', () => {
    it('tokenizes complex expressions', () => {
        let tokens = tokenize(
            "greeting.response.body['friendly.greetings'][0].salutation",
            {}
        );
        expect(tokens[0]).to.be.equal('greeting');
        expect(tokens[1]).to.be.equal('response');
        expect(tokens[2]).to.be.equal('body');
        expect(tokens[3]).to.be.equal('friendly.greetings');
        expect(tokens[4]).to.be.equal(0);
        expect(tokens[5]).to.be.equal('salutation');

        tokens = tokenize('multidim[0][3][1001]', {});
        expect(tokens[0]).to.be.equal('multidim');
        expect(tokens[1]).to.be.equal(0);
        expect(tokens[2]).to.be.equal(3);
        expect(tokens[3]).to.be.equal(1001);

        tokens = tokenize('foos[12].bar.baz[3]', {});
        expect(tokens[0]).to.be.equal('foos');
        expect(tokens[1]).to.be.equal(12);
        expect(tokens[2]).to.be.equal('bar');
        expect(tokens[3]).to.be.equal('baz');
        expect(tokens[4]).to.be.equal(3);
    });

    it('evaluates untrusted array index', () => {
        const input = '${titles[loopCount]}';
        const values = {
            loopCount: 0,
            titles: ['Frankenstein', 'Island of Lost Souls', 'The Invisible Man']
        };
        const output = resolve(input, values);
        expect(output).to.be.equal('Frankenstein');
    });

    it('evaluates untrusted object index', () => {
        const input = '${titles[item]}';
        const values = {
            item: 'two',
            titles: {
                one: 'Frankenstein',
                two: 'Island of Lost Souls',
                three: 'The Invisible Man'
            }
        };
        const output = resolve(input, values);
        expect(output).to.be.equal('Island of Lost Souls');
    });
});
