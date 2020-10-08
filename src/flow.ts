import { Step } from './step';
import { Note } from './note';
import { Variable } from './var';

/**
 * Model for a flow diagram
 **/
export interface Flow {
    id?: string; // for subflows
    name: string;
    steps?: Step[];
    subflows?: Flow[];
    notes?: Note[];
    variables?: Variable[]; // TODO variables is an object in yaml/json
    attributes?: {[key: string]: string};
}