import { Display } from './display';
import { DrawingOptions } from './options';

export class Grid {

    constructor(
        readonly context: CanvasRenderingContext2D,
        readonly display: Display,
        readonly options: DrawingOptions,
        readonly snap = 0
    ) { }

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

}