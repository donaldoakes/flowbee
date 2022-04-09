import * as fs from 'fs';
import { ConfigTemplate } from '../src/model/template';
import { Attrs } from '../src/swf/translate/attrs';
import * as yaml from '../src/yaml';

export const loadConfigTemplate = async (source: string): Promise<string> => {
    return await fs.promises.readFile(source, 'utf-8');
};

export const attrs = new Attrs({
    templatePath: 'test/templates/config',
    indent: 2,
    loadTemplate: loadConfigTemplate
});

export const loadFileSync = (file: string): any => {
    const contents = fs.readFileSync(file, 'utf-8');
    return yaml.load(file, contents);
};
