import { isRegex } from './expression';

export const resolve = (expression: string, context: any, trusted = false): string => {
    if (trusted) return resolveTrusted(expression, context);
    if (isRegex(expression)) return expression;

    return '' + safeEval(expression, context);
};

/**
 * Same as resolve(), but returns undefined if unresolved
 */
export const resolveIf = (expression: string, context: any, trusted = false): string | undefined => {
    const res = resolve(expression, context, trusted);
    return res.startsWith('${') ? undefined : res;
};

export const safeEval = (expression: string, context: any): any => {
    // escape all \
    let path = expression.replace(/\\/g, '\\\\');
    // trim ${ and }
    path = path.substring(2, path.length - 1);

    // directly contains expression (flat obj or user-entered values in vscode)
    const type = typeof context[path];
    if (type === 'string' || type === 'number' || type === 'boolean') {
        return context[path];
    }

    let res: any = context;
    for (const seg of tokenize(path, context)) {
        if (!res[seg]) return expression;
        res = res[seg];
    }

    return res;
};

export const resolveTrusted = (expression: string, context: any): string => {
    if (expression.startsWith('${~')) return expression; // ignore regex

    let expr = expression;
    if (!(expr.startsWith('${') && expr.endsWith('}'))) {
        expr = '${' + expr + '}';
    }
    const fun = new Function(...Object.keys(context), 'return `' + expr + '`');
    return fun(...Object.values(context));
};

export const tokenize = (path: string, context: any): (string | number)[] => {
    return path.split(/\.(?![^[]*])/).reduce((segs: (string | number)[], seg) => {
        if (seg.search(/\[.+?]$/) > 0) {
            // indexer(s)
            const start = seg.indexOf('[');
            segs.push(seg.substring(0, start));
            let remains = seg.substring(start);
            while (remains.length > 0) {
                const indexer = remains.substring(1, remains.indexOf(']'));
                if (
                    (indexer.startsWith("'") && indexer.startsWith("'")) ||
                    (indexer.endsWith('"') && indexer.endsWith('"'))
                ) {
                    segs.push(indexer.substring(1, indexer.length - 1)); // object property
                } else {
                    let idx = parseInt(indexer);
                    if (isNaN(idx)) {
                        // indexer is expression
                        const val = resolve('${' + indexer + '}', context);
                        idx = parseInt(val);
                        if (isNaN(idx)) {
                            segs.push(val);
                        } else {
                            segs.push(idx); // array index
                        }
                    } else {
                        segs.push(idx); // array index
                    }
                }
                remains = remains.substring(indexer.length + 2);
            }
        } else {
            segs.push(seg);
        }
        return segs;
    }, []);
};

