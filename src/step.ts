import { Link } from './link';

/**
 * Model for a diagram step.
 */
export interface Step {
    id: string;
    name: string;
    specifier?: string;
    links?: Link[];
    attributes?: {[key: string]: string};
}