export interface Expression {
    text: string;
    start: number
    end: number;
}

export const findExpressions = (line: string): Expression[] => {
    const expressions: Expression[] = [];
    const regex = /\$\{.+?\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
        const text = match[0];
        expressions.push({ text, start: match.index, end: match.index + text.length - 1 });
    }
    return expressions;
};