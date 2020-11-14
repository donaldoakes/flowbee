import { Display } from './display';
import { DrawingOptions } from './options';
import { DiagramOptions } from '../options';

export class Grid {

    readonly snap: number;

    constructor(
        readonly context: CanvasRenderingContext2D,
        readonly display: Display,
        readonly options: DiagramOptions & DrawingOptions
    ) {
        this.snap = this.options.showGrid && options.snapToGrid ? this.options.grid.width : 0;
    }

    draw() {
        this.context.strokeStyle = this.options.grid.color;
        let x = this.options.grid.width;
        while (x < this.display.w + this.options.padding) {
            this.context.moveTo(x, 0);
            this.context.lineTo(x, this.display.h + this.options.padding);
            x += this.options.grid.width;
        }

        let y = this.options.grid.width;
        while (y < this.display.w + this.options.padding) {
            this.context.moveTo(0, y);
            this.context.lineTo(this.display.w + this.options.padding, y);
            y += this.options.grid.width;
        }
        this.context.stroke();
        this.context.strokeStyle = this.options.defaultColor;
    }

    /**
     * Snaps display to nearest grid lines.  If even, make sure display.w and
     * display.h are divisible by two, for centering link lines.
     */
    doSnap(display: Display, even: boolean = false) {
        if (this.snap > 0) {
            display.x = Math.round(display.x / this.snap) * this.snap;
            display.y = Math.round(display.y / this.snap) * this.snap;
            if (even) {
                display.w = Math.round(display.w / (this.snap * 2)) * (this.snap * 2);
                display.h = Math.round(display.h / (this.snap * 2)) * (this.snap * 2);
            } else {
                display.w = Math.round(display.w / this.snap) * this.snap;
                display.h = Math.round(display.h / this.snap) * this.snap;
            }
        }
    }
}