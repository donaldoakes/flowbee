import * as jsYaml from 'js-yaml';
import { Diagram } from './diagram';

const DEFAULT_OPTIONS = {
  websocketUrl: null,
  defaultFont: {
    name: '12px sans-serif',
    size: 12,
  },
  defaultLineWidth: 1,
  defaultColor: 'black',
  metaColor: 'gray',
  defaultRoundingRadius: 12,
  minDrag: 3,
  title: {
    font: {
      name: 'bold 18px sans-serif',
      size: 18
    }
  },
  template: {
    font: {
      name: 'bold italic 18px sans-serif',
      size: 18
    }
  },
  step: {
    outlineColor: 'black',
    minSize: 4
  },
  link: {
    lineWidth: 3,
    hitWidth: 8,
    drawColor: 'green'
  },
  subflow: {
    outlineColor: '#337ab7',
    roundingRadius: 12,
    hitWidth: 7
  },
  note: {
    font: {
      name: '13px monospace',
      size: 13
    },
    outlineColor: 'gray',
    roundingRadius: 2,
    fillColor: '#ffc',
    minSize: 4
  },
  marquee: {
    outlineColor: 'cyan',
    roundingRadius: 2
  },
  anchor: {
    width: 3,
    color: '#ec407a',
    hitWidth: 8,
  },
  highlight: {
    margin: 10,
    color: '#03a9f4'
  },
  oval: {
    lineWidth: 3
  },
  hyperlink: {
    color: '#1565c0'
  },
  statuses: [
    {status: 'Unknown', color: 'transparent'},
    {status: 'Pending', color: 'blue'},
    {status: 'In Progress', color: 'green'},
    {status: 'Failed', color: 'red'},
    {status: 'Completed', color: 'black'},
    {status: 'Canceled', color: 'darkgray'},
    {status: 'Hold', color: 'cyan'},
    {status: 'Waiting', color: 'yellow'}
  ]
};

export class Flow {

  constructor(canvas, options) {
    this.canvas = canvas;
    this.options = options || DEFAULT_OPTIONS;
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
