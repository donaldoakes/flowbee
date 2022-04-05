import { Descriptor } from '../../model/descriptor';
import { ConfigTemplate } from '../../model/template';

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
    indent: number;
}
