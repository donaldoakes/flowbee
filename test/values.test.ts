import { expect } from 'chai';
import { ValuesAccess } from '../src/values/access';

describe('values', () => {
    const vals1 = {
        foo: 'bar',
        greeting: {
            salutation: 'Hello',
            user: {
                name: 'Stranger',
                email: 'stranger@example.com',
                contacts: ['someone@example.com', 'otherguy@example.com']
            }
        }
    };

    const vals2 = {
        baz: 'bang',
        greeting: {
            salutation: 'Hey There',
            user: {
                name: 'Stranger',
                email: 'stranger@compuserve.com',
                contacts: ['anyone@example.com', 'otherguy@example.com']
            }
        }
    };

    const checkMergedValues = (values: any) => {
        expect(values.foo).to.be.equal('bar');
        expect(values.baz).to.be.equal('bang');
        expect(values.greeting.salutation).to.be.equal('Hey There');
        expect(values.greeting.user.name).to.be.equal('Stranger');
        expect(values.greeting.user.email).to.be.equal('stranger@compuserve.com');
        expect(values.greeting.user.contacts.length).to.be.equal(4); // array concat
        expect(values.greeting.user.contacts[0]).to.be.equal('someone@example.com');
        expect(values.greeting.user.contacts[3]).to.be.equal('otherguy@example.com');
    };

    it('should merge value objects', async () => {
        const valuesAccess = new ValuesAccess({ vals1, vals2 });
        checkMergedValues(valuesAccess.values);
    });

    it('should merge value contents', async () => {
        const valuesAccess = new ValuesAccess({
            vals1: JSON.stringify(vals1, null, 2),
            vals2: JSON.stringify(vals2, null, 2)
        });
        checkMergedValues(valuesAccess.values);
    });

    it('should locate values', async () => {
        const values = new ValuesAccess({ vals1, vals2 });
        expect(values.getLocation('${foo}')?.path).to.be.equal('vals1');
        expect(values.getLocation('${baz}')?.path).to.be.equal('vals2');
        expect(values.getLocation('${greeting.salutation}')?.path).to.be.equal('vals2');
        expect(values.getLocation('${greeting.user.name}')?.path).to.be.equal('vals2');
    });

    it('resolves ref expression', () => {
        const refVals = {
            __ply_results: {
                s7: {
                    response: {
                        status: {
                          code: 201,
                          message: 'Created'
                        },
                        body: {
                          id: '435b30ad',
                          title: 'The Case of the Howling Dog',
                          year: 1934
                        }
                    }
                }
            }
        };

        const access = new ValuesAccess({}, {}, { refHolder: '__ply_results' }, refVals);
        const result = access.evaluate('${@s7.response.body.id}');
        expect(result).to.be.equal('435b30ad');
    });

});
