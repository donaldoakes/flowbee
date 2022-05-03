import { Descriptor } from '../../model/descriptor';

export interface TranslatorOptions {
    templatePath: string;
    /**
     * Base path for runtime custom templates
     * (whose subpaths are taken from their descriptor)
     */
    customPath?: string;
    customDescriptors?: Descriptor[];
    /**
     * Throws if template not found
     */
    loadTemplate: (source: string) => Promise<string>;
    output: 'JSON' | 'YAML';
    indent: number;
}
