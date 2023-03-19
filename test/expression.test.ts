import { expect } from 'chai';
import { findExpressions } from '../src/expression';

describe('expression', () => {
    it('finds one expression', () => {
        const line = 'Bearer ${token}';
        const expressions = findExpressions(line);
        expect(expressions.length).to.be.equal(1);
        expect(expressions[0].text).to.be.equal('${token}');
        expect(expressions[0].start).to.be.equal(7);
        expect(expressions[0].end).to.be.equal(14);
    });

    it('finds multiple expressions', () => {
        const line = '${foo}, meet me at the ${bar} at ten';
        const expressions = findExpressions(line);

        expect(expressions.length).to.be.equal(2);
        expect(expressions[0].text).to.be.equal('${foo}');
        expect(expressions[0].start).to.be.equal(0);
        expect(expressions[0].end).to.be.equal(5);
        expect(expressions[1].text).to.be.equal('${bar}');
        expect(expressions[1].start).to.be.equal(23);
        expect(expressions[1].end).to.be.equal(28);
    });

    it('includes regex and ref', () => {
        const line = '${foo}, meet me ${~.*} at ${@.*}';
        const expressions = findExpressions(line);
        expect(expressions.length).to.be.equal(3);
    });

});