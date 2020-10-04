export const DEFAULT_LIGHT = {
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
    color: '#360303',
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
    roundingRadius: 12,
    milestoneColor: '#4cafea',
    startColor: '#98fb98',
    stopColor: '#ff8c86',
    pauseColor: '#fffd87',
    minSize: 4
  },
  link: {
    colors: {
      default: '#9e9e9e',
      initiated:'blue',
      traversed: 'black'
    },
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
    textColor: '#101010',
    outlineColor: 'gray',
    roundingRadius: 2,
    fillColor: '#ffc',
    minSize: 4
  },
  grid: {
    color: 'lightgray'
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

export const DEFAULT_DARK = {
  defaultColor: '#d4d4d4',
  title: {
    color: '#d4d4d4'
  },
  step: {
    outlineColor: '#d4d4d4'
  },
  link: {
    colors: {
      default: '#9e9e9e',
      initiated:'blue',
      traversed: 'white'
    }
  },
  subflow: {
    outlineColor: '#4ba5C7'
  },
  note: {
    outlineColor: 'lightgray'
  },
  grid: {
    color: '#787878'
  }
};
