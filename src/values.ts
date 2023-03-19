import { mergeAndConcat as merge } from 'merge-anything';
import * as _traverse from 'traverse';
// https://github.com/rollup/rollup/issues/1267
const traverse = (_traverse as any).default || _traverse;

import * as resolve from './resolve';

export type ValueType = string | number | boolean | Date | null;
export type EnvironmentVariables = { [key: string]: string | undefined };

export interface ValueLocation {
    path: string;  // file or url
    line?: number; // someday maybe
}

export class ValuesAccess {
    /**
     * Merged values
     */
    readonly values: any = {};
    private valuesObjects?: { [path: string]: any };
    private readonly valueLocations: { [expression: string]: ValueLocation } = {};

    /**
     * @param pathVals path to contents or object
     * (raw contents required for future location line numbers)
     * @param envVars environment variables
     */
    constructor(pathVals: { [path: string]: string | object }, private envVars: EnvironmentVariables = {}) {
        this.valuesObjects = {};
        for (const path of Object.keys(pathVals)) {
            let vals = pathVals[path];
            if (typeof vals === 'string') {
                try {
                    vals = JSON.parse(vals);
                } catch (err: any) {
                    throw new Error(`Cannot parse values file: ${location} (${err.message})`);
                }
            }
            vals = this.substEnvVars(vals);
            this.valuesObjects[path] = vals;
            this.values = merge(this.values, vals);
        }
    }

    evaluate(expression: string, trusted: boolean): string | undefined {
        if (!expression.startsWith('${~)') && !expression.startsWith('${@')) {
            const res = resolve.resolve(expression, this.values, trusted);
            if (!res.startsWith('${')) {
                return res;
            }
        }
    }

    getLocation(expression: string, trusted = false): ValueLocation | undefined {
        let location: ValueLocation | undefined = this.valueLocations[expression];
        if (!location) {
            location = this.findLocation(expression, trusted);
            if (location) this.valueLocations[expression] = location;
        }
        return location;
    }

    private findLocation(expression: string, trusted: boolean): ValueLocation | undefined {
        if (!expression.startsWith('${~)') && !expression.startsWith('${@')) {
            // reverse so later overrides
            const paths = Object.keys(this.valuesObjects).reverse();
            for (const path of paths) {
                const obj = this.valuesObjects[path];
                const res = resolve.resolve(expression, obj, trusted);
                if (!res.startsWith('${')) {
                    return { path };
                }
            }
        }
    }

    private substEnvVars(values: any): any {
        // operate on a clone
        const vals = JSON.parse(JSON.stringify(values));
        const envVars = this.envVars;
        traverse(vals).forEach(function (val) {
            if (typeof val === 'string') {
                const envVar = val.match(/^\$\{.+?}/);
                if (envVar && envVar.length === 1) {
                    const varName = envVar[0].substring(2, envVar[0].length - 1);
                    let varVal: any = envVars[varName];
                    if (typeof varVal === 'undefined' && val.trim().length > varName.length + 3) {
                        // fallback specified?
                        const extra = val.substring(envVar[0].length).trim();
                        if (extra.startsWith('||')) {
                            varVal = extra.substring(1).trim();
                        }
                    }
                    this.update(varVal);
                }
            }
        });
        return vals;
    }

}
