import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { Diagram } from './draw/diagram';
import { Flow } from './flow';
import { Specifier } from './specifier';
import { DrawingOptions, DEFAULT_OPTIONS } from './options';

export class FlowDiagram {

    options: DrawingOptions;
    diagram: Diagram;

    /**
     * Create a flow diagram
     * @param canvas html canvas
     * @param options drawing options
     * @param specifiers step specifiers
     * @param readonly
     */
    constructor(
        readonly canvas: HTMLCanvasElement,
        options?: DrawingOptions,
        readonly specifiers?: Specifier[],
        readonly = false
    ) {
        this.canvas = canvas;
        this.options = merge(DEFAULT_OPTIONS, options || {});

        this.diagram = new Diagram(
            this.canvas,
            this.options,
            this.specifiers,
            !readonly
        );

        // if ($scope.editable) {
        //     $scope.toolbox = Toolbox.getToolbox();
        //     $scope.toolbox.init($scope.specifiers, $scope.hubBase);
        // }
    }

    /**
     * Parse flow from text
     * @param text json or yaml
     * @param file file name
     */
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

    /**
     * Draw a flow diagram
     * @param flow to render
     * @param instance runtime instance (TODO: define class)
     * @param step step id or step instance id to highlight
     * @param animate
     * @param instanceEdit
     * @param data hotspots
     */
    draw(flow: Flow, instance?: any, step?: string, animate = false, instanceEdit = false, data?: any) {
        this.diagram.draw(
            flow,
            instance,
            step,
            animate,
            instanceEdit,
            data
        );
    }

    /**
     * Parse and render from text
     * @param text json or yaml
     * @param file file name
     * @param instance runtime instance (TODO: define class)
     * @param step step id or step instance id to highlight
     * @param animate
     * @param instanceEdit
     * @param data hotspots
     */
    render(text: string, file: string, instance?: any, step?: string, animate = false, instanceEdit = false, data?: any) {
        if (typeof text === 'string') {
            const flow = this.parse(text, file);
            if (file) {
                flow.name = file;
                const lastDot = flow.name.lastIndexOf('.');
                if (lastDot > 0) {
                    flow.name = flow.name.substring(0, lastDot);
                }
            }
            this.draw(flow, instance, step, animate, instanceEdit, data);
        }
    }
}
