import { Step } from './step';
import { Variable } from './variable';

/**
 * Model for a flow diagram
 **/
export interface Flow {
    name: string;
    steps: Step[];
    variables?: Variable[]; // TODO variables is an object in yaml/json
    attribute?: {[key: string]: string};
}