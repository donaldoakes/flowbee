import { Display, LinkDisplay } from "./display";

export const LINK_TYPES = {
  STRAIGHT: 'Straight',
  ELBOW: 'Elbow',
  ELBOWH: 'ElbowH',
  ELBOWV: 'ElbowV'
};

export const AUTO_ELBOW_LINK_TYPES = {
  AUTOLINK_H: 1,
  AUTOLINK_V: 2,
  AUTOLINK_HV: 3,
  AUTOLINK_VH: 4,
  AUTOLINK_HVH: 5,
  AUTOLINK_VHV: 6
};

export const LINK_LAYOUT = {
  GAP: 4,
  CR: 8,
  CORR: 3, // offset for link start points
  LABEL_CORR: 3,
  ELBOW_THRESHOLD: 0.8,
  ELBOW_VH_THRESHOLD: 60
};

export const LINK_EVENTS = {
  Finish: {color: 'gray'},
  Error: {color: '#f44336'},
  Cancel: {color: '#f44336'},
  Delay: {color: 'orange'},
  Resume: {color: 'green'}
};

export class LinkLayout {
  constructor(
    readonly display: LinkDisplay,
    readonly from: Display,
    readonly to: Display
  ) {}

  static toAttr(display: LinkDisplay): string {
    let attr = 'type=' + display.type + ',x=' + Math.round(display.x) + ',y=' + Math.round(display.y);
    attr += ',xs=';
    for (let i = 0; i < display.xs.length; i++) {
      if (i > 0) {
        attr += '&';
      }
      attr += Math.round(display.xs[i]);
    }
    attr += ',ys=';
    for (let i = 0; i < display.ys.length; i++) {
      if (i > 0) {
        attr += '&';
      }
      attr += Math.round(display.ys[i]);
    }
    return attr;
  }

  static fromAttr(displayAttr?: string): LinkDisplay {
    const display: LinkDisplay = {};
    if (displayAttr) {
      const vals = displayAttr.split(',');
      display.xs = [];
      display.ys = [];
      vals.forEach(function (val) {
        if (val.startsWith('x=')) {
          display.x = parseInt(val.substring(2));
        }
        else if (val.startsWith('y=')) {
          display.y = parseInt(val.substring(2));
        }
        else if (val.startsWith('xs=')) {
          val.substring(3).split('&').forEach(function (x) {
            display.xs.push(parseInt(x));
          });
        }
        else if (val.startsWith('ys=')) {
          val.substring(3).split('&').forEach(function (y) {
            display.ys.push(parseInt(y));
          });
        }
        else if (val.startsWith('type=')) {
          display.type = val.substring(5);
        }
      });
    }
    return display;
  }

  calcLink(points?: number) {
    const type = this.display.type;
    let xs = this.display.xs;
    let ys = this.display.ys;
    const x1 = this.from.x;
    const y1 = this.from.y;
    const w1 = this.from.w;
    const h1 = this.from.h;
    const x2 = this.to.x;
    const y2 = this.to.y;
    const w2 = this.to.w;
    const h2 = this.to.h;
    const n = points ? points : xs.length < 2 ? 2 : xs.length;
    let i: number;

    if (type === LINK_TYPES.STRAIGHT) {
      xs = this.display.xs = [];
      ys = this.display.ys = [];
      for (i = 0; i < n; i++) {
        xs.push(0);
        ys.push(0);
      }

      if (Math.abs(x1 - x2) >= Math.abs(y1 - y2)) {
        // more of a horizontal link
        xs[0] = x1 <= x2 ? x1 + w1 : x1;
        ys[0] = y1 + h1 / 2;
        xs[n - 1] = x1 <= x2 ? x2 : x2 + w2;
        ys[n - 1] = y2 + h2 / 2;
        for (i = 1; i < n - 1; i++) {
          if (i % 2 !== 0) {
            ys[i] = ys[i - 1];
            xs[i] = ((xs[n - 1] - xs[0]) * ((i + 1) / 2)) / (n / 2) + xs[0];
          } else {
            xs[i] = xs[i - 1];
            ys[i] =
              ((ys[n - 1] - ys[0]) * ((i + 1) / 2)) / ((n - 1) / 2) + ys[0];
          }
        }
      } else {
        // more of a vertical link
        xs[0] = x1 + w1 / 2;
        ys[0] = y1 <= y2 ? y1 + h1 : y1;
        xs[n - 1] = x2 + w2 / 2;
        ys[n - 1] = y1 <= y2 ? y2 : y2 + h2;
        for (i = 1; i < n - 1; i++) {
          if (i % 2 !== 0) {
            xs[i] = xs[i - 1];
            ys[i] = ((ys[n - 1] - ys[0]) * ((i + 1) / 2)) / (n / 2) + ys[0];
          } else {
            ys[i] = ys[i - 1];
            xs[i] = ((xs[n - 1] - xs[0]) * (i / 2)) / ((n - 1) / 2) + xs[0];
          }
        }
      }
    } else if (n === 2) {
      // auto ELBOW, ELBOWH, ELBOWV
      xs = this.display.xs = [0, 0];
      ys = this.display.ys = [0, 0];
      this.calcAutoElbow();
    } else {
      // ELBOW, ELBOWH, ELBOWV with middle control points
      const horizontalFirst =
        type === LINK_TYPES.ELBOWH ||
        (type === LINK_TYPES.ELBOW &&
          Math.abs(x1 - x2) >= Math.abs(y1 - y2));
      const evenN = n % 2 === 0;
      const horizontalLast =
        (horizontalFirst && evenN) || (!horizontalFirst && !evenN);
      xs = this.display.xs = [];
      ys = this.display.ys = [];
      for (i = 0; i < n; i++) {
        xs.push(0);
        ys.push(0);
      }
      if (horizontalFirst) {
        xs[0] = x1 <= x2 ? x1 + w1 : x1;
        ys[0] = y1 + h1 / 2;
      } else {
        xs[0] = x1 + w1 / 2;
        ys[0] = y1 <= y2 ? y1 + h1 : y1;
      }
      if (horizontalLast) {
        xs[n - 1] = x2 <= x1 ? x2 + w2 : x2;
        ys[n - 1] = y2 + h2 / 2;
      } else {
        xs[n - 1] = x2 + w2 / 2;
        ys[n - 1] = y2 <= y1 ? y2 + h2 : y2;
      }
      if (horizontalFirst) {
        for (i = 1; i < n - 1; i++) {
          if (i % 2 !== 0) {
            ys[i] = ys[i - 1];
            xs[i] =
              (xs[n - 1] - xs[0]) * Math.round((i + 1) / 2 / (n / 2)) + xs[0];
          } else {
            xs[i] = xs[i - 1];
            ys[i] =
              (ys[n - 1] - ys[0]) * Math.round((i + 1) / 2 / ((n - 1) / 2)) +
              ys[0];
          }
        }
      } else {
        for (i = 1; i < n - 1; i++) {
          if (i % 2 !== 0) {
            xs[i] = xs[i - 1];
            ys[i] =
              (ys[n - 1] - ys[0]) * Math.round((i + 1) / 2 / (n / 2)) + ys[0];
          } else {
            ys[i] = ys[i - 1];
            xs[i] =
              (xs[n - 1] - xs[0]) * Math.round(i / 2 / ((n - 1) / 2)) + xs[0];
          }
        }
      }
    }
  }

  calcAutoElbow() {
    const type = this.display.type;
    const xs = this.display.xs;
    const ys = this.display.ys;

    if (
      this.to.x + this.to.w >= this.from.x &&
      this.to.x <= this.from.x + this.from.w
    ) {
      // V
      xs[0] = xs[1] =
        (Math.max(this.from.x, this.to.x) +
          Math.min(this.from.x + this.from.w, this.to.x + this.to.w)) /
        2;
      if (this.to.y > this.from.y) {
        ys[0] = this.from.y + this.from.h + LINK_LAYOUT.GAP;
        ys[1] = this.to.y - LINK_LAYOUT.GAP;
      } else {
        ys[0] = this.from.y - LINK_LAYOUT.GAP;
        ys[1] = this.to.y + this.to.h + LINK_LAYOUT.GAP;
      }
    } else if (
      this.to.y + this.to.h >= this.from.y &&
      this.to.y <= this.from.y + this.from.h
    ) {
      // H
      ys[0] = ys[1] =
        (Math.max(this.from.y, this.to.y) +
          Math.min(this.from.y + this.from.h, this.to.y + this.to.h)) /
        2;
      if (this.to.x > this.from.x) {
        xs[0] = this.from.x + this.from.w + LINK_LAYOUT.GAP;
        xs[1] = this.to.x - LINK_LAYOUT.GAP;
      } else {
        xs[0] = this.from.x - LINK_LAYOUT.GAP;
        xs[1] = this.to.x + this.to.w + LINK_LAYOUT.GAP;
      }
    } else if (
      (type === LINK_TYPES.ELBOW &&
        Math.abs(this.to.x - this.from.x) <
          Math.abs(this.to.y - this.from.y) * LINK_LAYOUT.ELBOW_THRESHOLD) ||
      (type === LINK_TYPES.ELBOWV &&
        Math.abs(this.to.y - this.from.y) > LINK_LAYOUT.ELBOW_VH_THRESHOLD)
    ) {
      // VHV
      xs[0] = this.from.x + this.from.w / 2;
      xs[1] = this.to.x + this.to.w / 2;
      if (this.to.y > this.from.y) {
        ys[0] = this.from.y + this.from.h + LINK_LAYOUT.GAP;
        ys[1] = this.to.y - LINK_LAYOUT.GAP;
      } else {
        ys[0] = this.from.y - LINK_LAYOUT.GAP;
        ys[1] = this.to.y + this.to.h + LINK_LAYOUT.GAP;
      }
    } else if (
      (type === LINK_TYPES.ELBOW &&
        Math.abs(this.to.y - this.from.y) <
          Math.abs(this.to.x - this.from.x) * LINK_LAYOUT.ELBOW_THRESHOLD) ||
      (type === LINK_TYPES.ELBOWH &&
        Math.abs(this.to.x - this.from.x) > LINK_LAYOUT.ELBOW_VH_THRESHOLD)
    ) {
      // HVH
      ys[0] = this.from.y + this.from.h / 2;
      ys[1] = this.to.y + this.to.h / 2;
      if (this.to.x > this.from.x) {
        xs[0] = this.from.x + this.from.w + LINK_LAYOUT.GAP;
        xs[1] = this.to.x - LINK_LAYOUT.GAP;
      } else {
        xs[0] = this.from.x - LINK_LAYOUT.GAP;
        xs[1] = this.to.x + this.to.w + LINK_LAYOUT.GAP;
      }
    } else if (type === LINK_TYPES.ELBOWV) {
      // VH
      if (this.to.y > this.from.y) {
        ys[0] = this.from.y + this.from.h + LINK_LAYOUT.GAP;
      } else {
        ys[0] = this.from.y - LINK_LAYOUT.GAP;
      }
      xs[0] = this.from.x + this.from.w / 2;
      ys[1] = this.to.y + this.to.h / 2;
      if (this.to.x > this.from.x) {
        xs[1] = this.to.x - LINK_LAYOUT.GAP;
      } else {
        xs[1] = this.to.x + this.to.w + LINK_LAYOUT.GAP;
      }
    } else {
      // HV
      if (this.to.x > this.from.x) {
        xs[0] = this.from.x + this.from.w + LINK_LAYOUT.GAP;
      } else {
        xs[0] = this.from.x - LINK_LAYOUT.GAP;
      }
      ys[0] = this.from.y + this.from.h / 2;
      xs[1] = this.to.x + this.to.w / 2;
      if (this.to.y > this.from.y) {
        ys[1] = this.to.y - LINK_LAYOUT.GAP;
      } else {
        ys[1] = this.to.y + this.to.h + LINK_LAYOUT.GAP;
      }
    }
  }

  calcLabel() {
    const type = this.display.type;
    const xs = this.display.xs;
    const ys = this.display.ys;

    const x1 = this.from.x;
    const x2 = this.to.x;

    const n = xs.length;

    if (type === LINK_TYPES.STRAIGHT) {
      this.display.x = (xs[0] + xs[n - 1]) / 2;
      this.display.y = (ys[0] + ys[n - 1]) / 2;
    }
    else if (n === 2) {
      // auto ELBOW, ELBOWH, ELBOWV
      this.display.x = (xs[0] + xs[n - 1]) / 2;
      this.display.y = (ys[0] + ys[n - 1]) / 2;
    }
    else {
      // ELBOW, ELBOWH, ELBOWV with middle control points
      const horizontalFirst = ys[0] === ys[1];
      if (n <= 3) {
        if (horizontalFirst) {
          this.display.x = (x1 + x2) / 2 - 40;
          this.display.y = ys[0] - 4;
        }
        else {
          this.display.x = xs[0] + 2;
          this.display.y = (ys[0] + ys[1]) / 2;
        }
      }
      else {
        if (horizontalFirst) {
          this.display.x = (x1 <= x2) ? (xs[(n - 1) / 2] + 2) : (xs[(n - 1) / 2 + 1] + 2);
          this.display.y = ys[n / 2] - 4;
        }
        else {
          this.display.x = (x1 <= x2) ? xs[n / 2 - 1] : xs[n / 2];
          this.display.y = ys[n / 2 - 1] - 4;
        }
      }
    }
  }

  recalc(stepDisplay: Display, isFrom: boolean) {
    const type = this.display.type;
    const xs = this.display.xs;
    const ys = this.display.ys;
    const x = this.display.x;
    const y = this.display.y;

    const n = xs.length;
    let k;
    // remember relative label position
    let labelSlope = this.getSlope(xs[0], ys[0], x, y) - this.getSlope(xs[0], ys[0], xs[n - 1], ys[n - 1]);
    let labelDist = this.getDist(xs[0], ys[0], xs[n - 1], ys[n - 1]);
    if (labelDist < 5.0) {
      labelDist = 0.5;
    }
    else {
      labelDist = this.getDist(xs[0], ys[0], x, y) / labelDist;
    }

    if (type === LINK_TYPES.STRAIGHT) {
      if (n === 2) {
        this.calcLink();
      }
      else {
        if (isFrom) {
          if (xs[1] > stepDisplay.x + stepDisplay.w + LINK_LAYOUT.GAP) {
            xs[0] = stepDisplay.x + stepDisplay.w + LINK_LAYOUT.GAP;
          }
          else if (xs[1] < stepDisplay.x - LINK_LAYOUT.GAP) {
            xs[0] = stepDisplay.x - LINK_LAYOUT.GAP;
          }
          if (ys[1] > stepDisplay.y + stepDisplay.h + LINK_LAYOUT.GAP) {
            ys[0] = stepDisplay.y + stepDisplay.h + LINK_LAYOUT.GAP;
          }
          else if (ys[1] < stepDisplay.y - LINK_LAYOUT.GAP) {
            ys[0] = stepDisplay.y - LINK_LAYOUT.GAP;
          }
        }
        else {
          k = n - 1;
          if (xs[k - 1] > stepDisplay.x + stepDisplay.w + LINK_LAYOUT.GAP) {
            xs[k] = stepDisplay.x + stepDisplay.w + LINK_LAYOUT.GAP;
          }
          else if (xs[k - 1] < stepDisplay.x - LINK_LAYOUT.GAP) {
            xs[k] = stepDisplay.x - LINK_LAYOUT.GAP;
          }
          if (ys[k - 1] > stepDisplay.y + stepDisplay.h + LINK_LAYOUT.GAP) {
            ys[k] = stepDisplay.y + stepDisplay.h + LINK_LAYOUT.GAP;
          }
          else if (ys[k - 1] < stepDisplay.y - LINK_LAYOUT.GAP) {
            ys[k] = stepDisplay.y - LINK_LAYOUT.GAP;
          }
        }
      }
    }
    else if (n === 2) {
      // automatic ELBOW, ELBOWH, ELBOWV
      this.calcAutoElbow();
    }
    else {
      // controlled ELBOW, ELBOWH, ELBOWV
      const wasHorizontal = !this.isAnchorHorizontal(0);
      const horizontalFirst = (Math.abs(this.from.x - this.to.x) >= Math.abs(this.from.y - this.to.y));
      if (type === LINK_TYPES.ELBOW && wasHorizontal !== horizontalFirst) {
        this.calcLink();
      }
      else if (isFrom) {
        if (xs[1] > stepDisplay.x + stepDisplay.w) {
          xs[0] = stepDisplay.x + stepDisplay.w + LINK_LAYOUT.GAP;
        }
        else if (xs[1] < stepDisplay.x) {
          xs[0] = stepDisplay.x - LINK_LAYOUT.GAP;
        }
        else {
          xs[0] = xs[1];
        }

        if (ys[1] > stepDisplay.y + stepDisplay.h) {
          ys[0] = stepDisplay.y + stepDisplay.h + LINK_LAYOUT.GAP;
        }
        else if (ys[1] < stepDisplay.y) {
          ys[0] = stepDisplay.y - LINK_LAYOUT.GAP;
        }
        else {
          ys[0] = ys[1];
        }

        if (wasHorizontal) {
          ys[1] = ys[0];
        }
        else{
          xs[1] = xs[0];
        }
      }
      else {
        k = n - 1;
        if (xs[k - 1] > stepDisplay.x + stepDisplay.w) {
          xs[k] = stepDisplay.x + stepDisplay.w + LINK_LAYOUT.GAP;
        }
        else if (xs[k - 1] < stepDisplay.x) {
          xs[k] = stepDisplay.x - LINK_LAYOUT.GAP;
        }
        else {
          xs[k] = xs[k - 1];
        }

        if (ys[k - 1] > stepDisplay.y + stepDisplay.h) {
          ys[k] = stepDisplay.y + stepDisplay.h + LINK_LAYOUT.GAP;
        }
        else if (ys[k - 1] < stepDisplay.y) {
          ys[k] = stepDisplay.y - LINK_LAYOUT.GAP;
        }
        else {
          ys[k] = ys[k - 1];
        }

        if ((wasHorizontal && n % 2 === 0) || (!wasHorizontal && n % 2 !== 0)) {
          ys[k - 1] = ys[k];
        }
        else {
          xs[k - 1] = xs[k];
        }
      }
    }

    // label position
    labelSlope = this.getSlope(xs[0], ys[0], xs[n - 1], ys[n - 1]) + labelSlope;
    labelDist = this.getDist(xs[0], ys[0], xs[n - 1], ys[n - 1]) * labelDist;
    this.display.x = Math.round(xs[0] + Math.cos(labelSlope) * labelDist);
    this.display.y = Math.round(ys[0] + Math.sin(labelSlope) * labelDist);
  }

  /**
   * in polar degrees
   */
   getSlope(x1: number, y1: number, x2: number, y2: number): number {
    let slope: number;
    if (x1 === x2) {
      slope = (y1 < y2) ? Math.PI / 2 : -Math.PI / 2;
    }
    else {
      slope = Math.atan((y2 - y1) / (x2 - x1));
    }
    if (x1 > x2) {
      if (slope > 0) {
        slope -= Math.PI;
      }
      else {
        slope += Math.PI;
      }
    }
    return slope;
  }

  getDist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
  }

  isAnchorHorizontal(anchor: number): boolean {
    const p = anchor - 1;
    const n = anchor + 1;
    if (p >= 0 && this.display.xs[p] !== this.display.xs[anchor] && this.display.ys[p] === this.display.ys[anchor]) {
      return true;
    }
    else if (n < this.display.xs.length && this.display.xs[n] === this.display.xs[anchor] && this.display.ys[n] !== this.display.ys[anchor]) {
      return true;
    }
    else {
      return false;
    }
  }
}
