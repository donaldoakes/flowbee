import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { Diagram } from './draw/diagram';
import { Flow } from './flow';
import { Specifier } from './specifier';
import { DrawingOptions, DEFAULT_OPTIONS } from './options';

export class FlowDiagram {

    options: DrawingOptions;

    constructor(
        readonly canvas: HTMLCanvasElement,
        options?: DrawingOptions,
        readonly specifiers?: Specifier[]
    ) {
        this.canvas = canvas;
        this.options = merge(DEFAULT_OPTIONS, options || {});
    }

    parse(text: string, file: string): Flow {
        if (text.startsWith('{')) {
            try {
                return JSON.parse(text);
            } catch (err) {
                throw new Error(`Failed to parse ${file}: ${err.message}`);
            }
        } else {
            return jsYaml.safeLoad(text, { filename: file });
        }
    }

    render(text: string, file: string, animate = false) {
        if (typeof text === 'string') {
            const flow = this.parse(text, file);
            if (file) {
                flow.name = file;
                const lastDot = flow.name.lastIndexOf('.');
                if (lastDot > 0) {
                    flow.name = flow.name.substring(0, lastDot);
                }
            }
            const editable = false;
            const instance = null;
            const step = null; // highlighted step
            const instanceEdit = false;
            const data = null;
            const diagram = new Diagram(
                this.canvas,
                this.options,
                flow,
                this.specifiers,
                this.options.iconBase,
                editable,
                instance,
                step,
                instanceEdit,
                data
            );
            diagram.draw(animate);
            // if ($scope.editable) {
            //     $scope.toolbox = Toolbox.getToolbox();
            //     $scope.toolbox.init($scope.specifiers, $scope.hubBase);
            // }
        }
    }
}
