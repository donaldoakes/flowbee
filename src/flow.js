import * as jsYaml from 'js-yaml';
import { DiagramFactory } from './diagram';
import { LabelFactory } from './label';
import { LinkFactory } from './link';
import { MarqueeFactory } from './marquee';
import { NoteFactory } from './note';
import { SelectionFactory } from './selection';
import { ShapeFactory } from './shape';
import { StepFactory } from './step';
import { SubflowFactory } from './subflow';

const DEFAULT_OPTIONS = {
  DEFAULT_FONT: {
    FONT: '12px sans-serif',
    SIZE: 12,
  },
  TITLE_FONT: {
    FONT: 'bold 18px sans-serif',
    SIZE: 18
  },
  TEMPLATE_FONT: {
    FONT: 'bold italic 18px sans-serif',
    SIZE: 18
  },
  DEFAULT_LINE_WIDTH: 1,
  DEFAULT_COLOR: 'black',
  HYPERLINK_COLOR: '#1565c0',
  LINE_COLOR: 'green',
  META_COLOR: 'gray',
  BOX_OUTLINE_COLOR: 'black',
  TRANSPARENT: 'rgba(0, 0, 0, 0)',
  BOX_ROUNDING_RADIUS: 12,
  ANCHOR_W: 3,
  ANCHOR_COLOR: '#ec407a',
  ANCHOR_HIT_W: 8,
  MIN_DRAG: 3,
  OVAL_LINE_WIDTH: 3,
  HIGHLIGHT_MARGIN: 10,
  HIGHLIGHT_COLOR: '#03a9f4',
  WORKFLOW_STATUSES: [
    {status: 'Pending', color: 'blue'},
    {status: 'In Progress', color: 'green'},
    {status: 'Failed', color: 'red'},
    {status: 'Completed', color: 'black'},
    {status: 'Canceled', color: 'darkgray'},
    {status: 'Hold', color: 'cyan'},
    {status: 'Waiting', color: 'yellow'}
  ]
};

var Flow = function(canvas, options) {
  this.canvas = canvas;
  this.options = options || DEFAULT_OPTIONS;

  this.Shape = ShapeFactory(this.options);
  this.Label = LabelFactory(this.options, this.Shape);
  this.Step = StepFactory(this.options, this.Shape);
  this.Link = LinkFactory(this.options, this.Label);
  this.Subflow = SubflowFactory(this.options, this.Shape, this.Step, this.Link);
  this.Note = NoteFactory(this.options, this.Shape);
  this.Marquee = MarqueeFactory(this.options, this.Shape);
  this.Selection = SelectionFactory();
  this.Diagram = DiagramFactory(this.options, this.Shape, this.Label, this.Step, this.Link, this.Subflow, this.Note, this.Marquee, this.Selection);
};

Flow.prototype.parse = function(text, file) {
  if (text.startsWith('{')) {
    try {
        return JSON.parse(text);
    } catch (err) {
        throw new Error(`Failed to parse ${file}: ${err.message}`);
    }
  } else {
    return jsYaml.safeLoad(text, { filename: file });
  }
};

Flow.prototype.render = function(text, file, animate) {
  if (typeof text === 'string') {
    const flow = this.parse(text, file);
    if (file) {
      flow.name = file;
      const lastDot = flow.name.lastIndexOf('.');
      if (lastDot > 0) {
        flow.name = flow.name.substring(0, lastDot);
      }
    }
    const diagram = new this.Diagram(this.canvas, null, flow, null, 'http://localhost:8080/mdw', false, null, null, false);
    diagram.draw(animate);
    // if ($scope.editable) {
    //     $scope.toolbox = Toolbox.getToolbox();
    //     $scope.toolbox.init($scope.implementors, $scope.hubBase);
    // }
  }
}

export { Flow as Flow };
