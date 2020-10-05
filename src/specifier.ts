import * as fs from 'fs';
import * as glob from 'glob';
import * as jsYaml from 'js-yaml';

export interface Specifier {
    id: string;
    label: string;
    icon?: string;
    category?: string;
    layout?: object; // TODO like pagelet
}

export class FlowSpecifier implements Specifier {

    constructor(
        readonly id: string,
        readonly label: string,
        readonly icon?: string,
        readonly category?: string,
        readonly layout?: object
    ) { }

     /**
      * Read specifiers from JSON or YAML files
      * TODO: base can be a URL
      * @param base base location
      * @param pattern glob pattern for spec files
      */
    static async read(base: string, pattern = '**/*.spec'): Promise<Specifier[]> {
        const specs: Specifier[] = [];
        const files = glob.sync(pattern, { cwd: base });
        for (const file of files) {
            try {
                const text = fs.readFileSync(file, 'utf-8');
                if (text.startsWith('{')) {
                    specs.push(JSON.parse(text));
                } else {
                    specs.push(jsYaml.safeLoad(text, { filename: file }));
                }
            } catch (err) {
                console.log(err);
            }
        }
        return specs;
    }
}