import * as jsYaml from 'js-yaml';
import { merge } from 'merge-anything';
import { Diagram } from './draw/diagram';
import { DrawingOptions, DEFAULT_OPTIONS } from './options';

export class Flow {

    options: DrawingOptions;

    constructor(readonly canvas: HTMLCanvasElement, options: DrawingOptions) {
        this.canvas = canvas;
        this.options = merge(DEFAULT_OPTIONS, options || {});
    }

    parse(text: string, file: string) {
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
          const diagram = new Diagram(this.canvas, this.options, null, flow, null, 'http://localhost:8080/mdw', false, null, null, false);
          diagram.draw(animate);
          // if ($scope.editable) {
          //     $scope.toolbox = Toolbox.getToolbox();
          //     $scope.toolbox.init($scope.implementors, $scope.hubBase);
          // }
      }
    }
}
