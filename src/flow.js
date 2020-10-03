import * as jsYaml from 'js-yaml';
import deepmerge from 'deepmerge';
import { Diagram } from './diagram';
import { DEFAULT_LIGHT } from './options';

export class Flow {

  constructor(canvas, options) {
    this.canvas = canvas;
    this.options = deepmerge(DEFAULT_LIGHT, options || {});
  }

  parse(text, file) {
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

  render(text, file, animate) {
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
