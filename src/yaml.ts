import * as jsYaml from 'js-yaml';

export const dump = (obj: object, indent: number): string => {
    return jsYaml.dump(obj, { noCompatMode: true, skipInvalid: true, indent, lineWidth: -1 });
};

export const load = (file: string, contents: string): any => {
    const loadOptions: jsYaml.LoadOptions = { filename: file };
    return jsYaml.load(contents, loadOptions);
};
