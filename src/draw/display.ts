export type Display = {
    x?: number,
    y?: number,
    w?: number,
    h?: number
}

export type LinkDisplay = Display & {
    type?: string,
    xs?: number[],
    ys?: number[]
}

export type Title = Display & {
    text: string,
    lines?: { text: string, x: number, y: number }[]
}

export type Font = {
    name: string,
    size: number
}