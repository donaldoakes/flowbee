import * as fs from 'fs';
import { Attrs } from '../src/swf/translate/attrs';
import { TranslatorOptions } from '../src/swf/translate/options';
import * as yaml from '../src/yaml';

export const loadConfigTemplate = async (source: string): Promise<string> => {
    return await fs.promises.readFile(source, 'utf-8');
};

export const options: TranslatorOptions = {
    templatePath: 'test/templates/config',
    output: 'YAML',
    indent: 2,
    loadTemplate: loadConfigTemplate
};

export const attrs = new Attrs(options);

export const loadFileSync = (file: string): any => {
    const contents = fs.readFileSync(file, 'utf-8');
    return yaml.load(file, contents);
};
