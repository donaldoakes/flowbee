import { Link } from './link';

/**
 * Model for a diagram step.
 */
export interface Step {
    id: string;
    name: string;
    descriptor?: string;
    links?: Link[];
    attributes?: {[key: string]: string};
}