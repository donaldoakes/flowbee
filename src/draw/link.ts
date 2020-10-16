import { Diagram } from './diagram';
import { Label } from './label';
import { Link as LinkItem } from '../model/link';
import { Step } from './step';
import { FlowItem } from '../model/item';
import { Display, LinkDisplay } from './display';

export class Link {

  static GAP = 4;
  static CR = 8;
  static CORR = 3; // offset for link start points
  static LABEL_CORR = 3;

  static EVENTS = {
    START: {color: 'green'},
    RESUME: {color: 'green'},
    DELAY: {color: 'orange'},
    HOLD: {color: 'orange'},
    ERROR: {color: '#f44336'},
    ABORT: {color: '#f44336'},
    CORRECT: {color: 'purple'},
    FINISH: {color: 'gray'}
  };

  static LINK_TYPES = {
    STRAIGHT: 'Straight',
    ELBOW: 'Elbow',
    ELBOWH: 'ElbowH',
    ELBOWV: 'ElbowV'
  };

  static AUTO_ELBOW_LINK_TYPES = {
    AUTOLINK_H: 1,
    AUTOLINK_V: 2,
    AUTOLINK_HV: 3,
    AUTOLINK_VH: 4,
    AUTOLINK_HVH: 5,
    AUTOLINK_VHV: 6
  };

  static ELBOW_THRESHOLD = 0.8;
  static ELBOW_VH_THRESHOLD = 60;

  flowItem: FlowItem;
  label?: Label;
  display: LinkDisplay;
  dpRatio = 1;
  instances = null;

  constructor(readonly diagram: Diagram, readonly link: LinkItem, public from: Step, public to: Step) {
    this.flowItem = { ...link, type: 'link' };
    if (window.devicePixelRatio) {
      this.dpRatio = window.devicePixelRatio;
    }
  }

  get type(): string { return this.flowItem.type; }
  get id(): string { return this.flowItem.id; }

  draw(animationTimeSlice?: number) {
    const color = this.getColor();

    this.diagram.context.strokeStyle = color;
    this.diagram.context.fillStyle = color;

    this.drawConnector(null, null, animationTimeSlice);

    if (this.label) {
      if (this.diagram.instance && (!this.instances || this.instances.length === 0)) {
        this.label.draw(this.diagram.options.link.colors.default);
      }
      else {
        this.label.draw();
      }
    }

    this.diagram.context.strokeStyle = this.diagram.options.defaultColor;
    this.diagram.context.fillStyle = this.diagram.options.defaultColor;
  }

  /**
   * sets display/label and returns an object with w and h for required size
   */
  prepareDisplay(): Display {
    const maxDisplay = { w: 0, h: 0 };
    this.display = this.getDisplay();
    // label TODO determine effect on maxDisplay
    let labelText = this.link.event === 'FINISH' ? '' : this.link.event + ':';
    labelText += this.link.result ? this.link.result : '';
    if (labelText.length > 0) {
      this.label = new Label(this, labelText, { x: this.display.x, y: this.display.y + Link.LABEL_CORR }, this.diagram.options.defaultFont);
      this.label.prepareDisplay();
    }
    return maxDisplay;
  }

  getDisplay(): LinkDisplay {
    const display: LinkDisplay = {};
    const displayAttr = this.link.attributes.display;
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

  setDisplay(display: LinkDisplay) {
    if (!this.link.attributes) {
      this.link.attributes = {};
    }
    this.link.attributes.display = this.getAttr(display);
  }

  getAttr(display: LinkDisplay): string {
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

  /**
   * only for the label
   */
  setDisplayAttr(x: number, y: number, _w: number, _h: number) {
    this.setDisplay({ x, y, type: this.display.type, xs: this.display.xs, ys: this.display.ys });
  }

  getColor(): string {
    let color = Link.EVENTS[this.link.event].color;
    if (this.diagram.instance) {
      if (this.instances && this.instances.length > 0) {
        const latest = this.instances[0];
        if (latest.statusCode === 1) {
          color = this.diagram.options.link.colors.initiated;
        }
        else {
          color = this.diagram.options.link.colors.traversed;
        }
      }
      else {
        color = this.diagram.options.link.colors.default;
      }
    }
    return color;
  }

  /**
   * if hitX and hitY are passed, checks for hover instead of stroking
   */
  drawConnector(hitX: number, hitY: number, animationTimeSlice?: number): boolean {
    const context = this.diagram.context;
    const type = this.display.type;
    const xs = this.display.xs;
    const ys = this.display.ys;

    let hit = false;

    const color = this.getColor();
    context.strokeStyle = color;
    context.fillStyle = color;

    if (hitX) {
      context.lineWidth = this.diagram.options.link.hitWidth;
      context.strokeStyle = 'rgba(0, 0, 0, 0)'; // transparent
    }
    else {
      context.lineWidth = this.diagram.options.link.lineWidth;
    }

    if (!type || type.startsWith('Elbow')) {
      if (xs.length === 2) {
        hit = this.drawAutoElbowConnector(context, hitX, hitY, animationTimeSlice);
      }
      else {
        // TODO: make use of Link.CORR
        context.beginPath();
        let horizontal = ys[0] === ys[1] && (xs[0] !== xs[1] || xs[1] === xs[2]);
        context.moveTo(xs[0], ys[0]);
        for (let i = 1; i < xs.length; i++) {
          if (horizontal) {
            context.lineTo(xs[i] > xs[i - 1] ? xs[i] - Link.CR : xs[i] + Link.CR, ys[i]);
            if (i < xs.length - 1) {
              context.quadraticCurveTo(xs[i], ys[i], xs[i], ys[i + 1] > ys[i] ? ys[i] + Link.CR : ys[i] - Link.CR);
            }
          }
          else {
            context.lineTo(xs[i], ys[i] > ys[i - 1] ? ys[i] - Link.CR : ys[i] + Link.CR);
            if (i < xs.length - 1) {
              context.quadraticCurveTo(xs[i], ys[i], xs[i + 1] > xs[i] ? xs[i] + Link.CR : xs[i] - Link.CR, ys[i]);
            }
          }
          horizontal = !horizontal;
        }
        if (hitX) {
          hit = context.isPointInStroke && (this.dpRatio === 1 ? context.isPointInStroke(hitX, hitY) : context.isPointInStroke(hitX * this.dpRatio, hitY * this.dpRatio));
        }
        else {
          context.stroke();
        }
      }
    }
    else if (type === Link.LINK_TYPES.STRAIGHT) {
      const segments: LineSegment[] = [];
      xs.forEach(function (_x, i) {
        if (i < xs.length - 1) {
          segments.push({
            from: { x: xs[i], y: ys[i] },
            to: { x: xs[i + 1], y: ys[i + 1] }
          });
        }
      });
      if (animationTimeSlice) {
        const linkThis = this;
        segments[xs.length - 2].lineEnd = function (context: CanvasRenderingContext2D) {
          context.strokeStyle = linkThis.getColor();
          linkThis.drawConnectorArrow.call(linkThis, context);
          context.strokeStyle = linkThis.diagram.options.defaultColor;
        };
        this.diagram.animateLine(segments, this.getColor(), linkThis.diagram.options.link.lineWidth, animationTimeSlice);
      }
      else {
        if (hitX) {
          const dpRatio = this.dpRatio;
          segments.forEach(function (seg) {
            context.beginPath();
            context.moveTo(seg.from.x, seg.from.y);
            context.lineTo(seg.to.x, seg.to.y);
            if (context.isPointInStroke && (dpRatio === 1 ? context.isPointInStroke(hitX, hitY) : context.isPointInStroke(hitX * dpRatio, hitY * dpRatio))) {
              hit = true;
            }
          });
        }
        else {
          this.diagram.drawLine(segments, this.getColor(), this.diagram.options.link.lineWidth);
        }
      }
    }

    if (!hit && !animationTimeSlice) {
      hit = this.drawConnectorArrow(context, hitX, hitY);
    }

    context.lineWidth = this.diagram.options.defaultLineWidth;
    context.strokeStyle = this.diagram.options.defaultColor;
    context.fillStyle = this.diagram.options.defaultColor;

    return hit;
  }

  drawAutoElbowConnector(context: CanvasRenderingContext2D, hitX: number, hitY: number, animationTimeSlice?: number): boolean {
    const xs = this.display.xs;
    const ys = this.display.ys;
    let t;
    const xcorr = xs[0] < xs[1] ? Link.CORR : -Link.CORR;
    const ycorr = ys[0] < ys[1] ? Link.CORR : -Link.CORR;
    let drawArrow = null;
    const segments = [];
    const options = this.diagram.options;
    if (animationTimeSlice) {
      const linkThis = this;
      drawArrow = function (context: CanvasRenderingContext2D) {
        context.strokeStyle = linkThis.getColor();
        linkThis.drawConnectorArrow.call(linkThis, context);
        context.strokeStyle = options.defaultColor;
      };
    }
    context.beginPath();
    switch (this.getAutoElbowLinkType()) {
      case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_H:
        if (animationTimeSlice) {
          segments.push({
            from: { x: xs[0] - xcorr, y: ys[0] },
            to: { x: xs[1], y: ys[1] },
            lineEnd: drawArrow
          });
          this.diagram.animateLine(segments, this.getColor(), options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0] - xcorr, ys[0]);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_V:
        if (animationTimeSlice) {
          segments.push({
            from: { x: xs[0], y: ys[0] - ycorr },
            to: { x: xs[1], y: ys[1] },
            lineEnd: drawArrow
          });
          this.diagram.animateLine(segments, this.getColor(), options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0], ys[0] - ycorr);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_HVH:
        t = (xs[0] + xs[1]) / 2;
        if (animationTimeSlice) {
          let from = { x: xs[0] - xcorr, y: ys[0] };
          let to = { x: t > xs[0] ? t - Link.CR : t + Link.CR, y: ys[0] };
          let curveTo = { x: t, y: ys[1] > ys[0] ? ys[0] + Link.CR : ys[0] - Link.CR };
          let curve = { cpx: t, cpy: ys[0], x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: t, y: ys[1] > ys[0] ? ys[1] - Link.CR : ys[1] + Link.CR };
          curveTo = { x: xs[1] > t ? t + Link.CR : t - Link.CR, y: ys[1] };
          curve = { cpx: t, cpy: ys[1], x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1], y: ys[1] };
          segments.push({ from: from, to: to, lineEnd: drawArrow });
          this.diagram.animateLine(segments, this.getColor(), options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0] - xcorr, ys[0]);
          context.lineTo(t > xs[0] ? t - Link.CR : t + Link.CR, ys[0]);
          context.quadraticCurveTo(t, ys[0], t, ys[1] > ys[0] ? ys[0] + Link.CR : ys[0] - Link.CR);
          context.lineTo(t, ys[1] > ys[0] ? ys[1] - Link.CR : ys[1] + Link.CR);
          context.quadraticCurveTo(t, ys[1], xs[1] > t ? t + Link.CR : t - Link.CR, ys[1]);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_VHV:
        t = (ys[0] + ys[1]) / 2;
        if (animationTimeSlice) {
          let from = { x: xs[0], y: ys[0] - ycorr };
          let to = { x: xs[0], y: t > ys[0] ? t - Link.CR : t + Link.CR };
          let curveTo = { x: xs[1] > xs[0] ? xs[0] + Link.CR : xs[0] - Link.CR, y: t };
          let curve = { cpx: xs[0], cpy: t, x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1] > xs[0] ? xs[1] - Link.CR : xs[1] + Link.CR, y: t };
          curveTo = { x: xs[1], y: ys[1] > t ? t + Link.CR : t - Link.CR };
          curve = { cpx: xs[1], cpy: t, x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1], y: ys[1] };
          segments.push({ from: from, to: to, lineEnd: drawArrow });
          this.diagram.animateLine(segments, this.getColor(), options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0], ys[0] - ycorr);
          context.lineTo(xs[0], t > ys[0] ? t - Link.CR : t + Link.CR);
          context.quadraticCurveTo(xs[0], t, xs[1] > xs[0] ? xs[0] + Link.CR : xs[0] - Link.CR, t);
          context.lineTo(xs[1] > xs[0] ? xs[1] - Link.CR : xs[1] + Link.CR, t);
          context.quadraticCurveTo(xs[1], t, xs[1], ys[1] > t ? t + Link.CR : t - Link.CR);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_HV:
        if (animationTimeSlice) {
          let from = { x: xs[0] - xcorr, y: ys[0] };
          let to = { x: xs[1] > xs[0] ? xs[1] - Link.CR : xs[1] + Link.CR, y: ys[0] };
          const curveTo = { x: xs[1], y: ys[1] > ys[0] ? ys[0] + Link.CR : ys[0] - Link.CR };
          const curve = { cpx: xs[1], cpy: ys[0], x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1], y: ys[1] };
          segments.push({ from: from, to: to, lineEnd: drawArrow });
          this.diagram.animateLine(segments, this.getColor(), options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0] - xcorr, ys[0]);
          context.lineTo(xs[1] > xs[0] ? xs[1] - Link.CR : xs[1] + Link.CR, ys[0]);
          context.quadraticCurveTo(xs[1], ys[0], xs[1], ys[1] > ys[0] ? ys[0] + Link.CR : ys[0] - Link.CR);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_VH:
        if (animationTimeSlice) {
          let from = { x: xs[0], y: ys[0] - ycorr };
          let to = { x: xs[0], y: ys[1] > ys[0] ? ys[1] - Link.CR : ys[1] + Link.CR };
          const curveTo = { x: xs[1] > xs[0] ? xs[0] + Link.CR : xs[0] - Link.CR, y: ys[1] };
          const curve = { cpx: xs[0], cpy: ys[1], x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1], y: ys[1] };
          segments.push({ from: from, to: to, lineEnd: drawArrow });
          this.diagram.animateLine(segments, this.getColor(), options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0], ys[0] - ycorr);
          context.lineTo(xs[0], ys[1] > ys[0] ? ys[1] - Link.CR : ys[1] + Link.CR);
          context.quadraticCurveTo(xs[0], ys[1], xs[1] > xs[0] ? xs[0] + Link.CR : xs[0] - Link.CR, ys[1]);
          context.lineTo(xs[1], ys[1]);
        }
        break;
    }

    if (hitX) {
      if (context.isPointInStroke && (this.dpRatio === 1 ? context.isPointInStroke(hitX, hitY) : context.isPointInStroke(hitX * this.dpRatio, hitY * this.dpRatio))) {
        return true;
      }
    }
    else {
      context.stroke();
    }
    return false;
  }

  drawConnectorArrow(context: CanvasRenderingContext2D, hitX: number, hitY: number) {
    const type = this.display.type;
    const xs = this.display.xs;
    const ys = this.display.ys;
    const p = 12;
    let slope;
    let x, y;
    if (type === Link.LINK_TYPES.STRAIGHT) {
      const p2 = xs.length - 1;
      const p1 = p2 - 1;
      x = xs[p2];
      y = ys[p2];
      slope = this.getSlope(xs[p1], ys[p1], xs[p2], ys[p2]);
    }
    else if (xs.length === 2) {
      // auto ELBOW/ELBOWH/ELBOWV type
      switch (this.getAutoElbowLinkType()) {
        case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_V:
        case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_VHV:
        case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_HV:
          x = xs[1];
          y = ys[1] > ys[0] ? ys[1] + Link.GAP : ys[1] - Link.GAP;
          slope = ys[1] > ys[0] ? Math.PI / 2 : Math.PI * 1.5;
          break;
        case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_H:
        case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_HVH:
        case Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_VH:
          x = xs[1] > xs[0] ? xs[1] + Link.GAP : xs[1] - Link.GAP;
          y = ys[1];
          slope = xs[1] > xs[0] ? 0 : Math.PI;
          break;
      }
    }
    else {
      // ELBOW/ELBOWH/ELBOWV, control points > 2
      const k = xs.length - 1;
      if (xs[k] === xs[k - 1] && (ys[k] !== ys[k - 1] || ys[k - 1] === ys[k - 2])) {
        // verticle arrow
        x = xs[k];
        y = ys[k] > ys[k - 1] ? ys[k] + Link.GAP : ys[k] - Link.GAP;
        slope = ys[k] > ys[k - 1] ? Math.PI / 2 : Math.PI * 1.5;
      }
      else {
        x = xs[k] > xs[k - 1] ? xs[k] + Link.GAP : xs[k] - Link.GAP;
        y = ys[k];
        slope = xs[k] > xs[k - 1] ? 0 : Math.PI;
      }
    }
    // convert point and slope to polygon
    const dl = slope - 2.7052; // 25 degrees
    const dr = slope + 2.7052; // 25 degrees

    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(Math.round(Math.cos(dl) * p + x), Math.round(Math.sin(dl) * p + y));
    context.lineTo(Math.round(Math.cos(dr) * p + x), Math.round(Math.sin(dr) * p + y));
    context.lineTo(x, y);
    if (hitX) {
      return (context.isPointInStroke && (this.dpRatio === 1 ? context.isPointInStroke(hitX, hitY) : context.isPointInStroke(hitX * this.dpRatio, hitY * this.dpRatio)));
    }
    else {
      context.fill();
    }
  }

  getAutoElbowLinkType(): number {
    const type = this.display.type;
    const xs = this.display.xs;
    const ys = this.display.ys;

    if (type === Link.LINK_TYPES.ELBOWH) {
      if (xs[0] === xs[1]) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_V;
      }
      else if (ys[0] === ys[1]) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_H;
      }
      else if (Math.abs(this.to.display.x - this.from.display.x) > Link.ELBOW_VH_THRESHOLD) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_HVH;
      }
      else {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_HV;
      }
    }
    else if (type === Link.LINK_TYPES.ELBOWV) {
      if (xs[0] === xs[1]) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_V;
      }
      else if (ys[0] === ys[1]) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_H;
      }
      else if (Math.abs(this.to.display.y - this.from.display.y) > Link.ELBOW_VH_THRESHOLD) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_VHV;
      }
      else {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_VH;
      }
    }
    else {
      if (xs[0] === xs[1]) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_V;
      }
      else if (ys[0] === ys[1]) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_H;
      }
      else if (Math.abs(this.to.display.x - this.from.display.x) < Math.abs(this.to.display.y - this.from.display.y) * Link.ELBOW_THRESHOLD) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_VHV;
      }
      else if (Math.abs(this.to.display.y - this.from.display.y) < Math.abs(this.to.display.x - this.from.display.x) * Link.ELBOW_THRESHOLD) {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_HVH;
      }
      else {
        return Link.AUTO_ELBOW_LINK_TYPES.AUTOLINK_HV;
      }
    }
  }

  recalc(step: Step) {
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

    if (type === Link.LINK_TYPES.STRAIGHT) {
      if (n === 2) {
        this.calc();
      }
      else {
        if (step === this.from) {
          if (xs[1] > step.display.x + step.display.w + Link.GAP) {
            xs[0] = step.display.x + step.display.w + Link.GAP;
          }
          else if (xs[1] < step.display.x - Link.GAP) {
            xs[0] = step.display.x - Link.GAP;
          }
          if (ys[1] > step.display.y + step.display.h + Link.GAP) {
            ys[0] = step.display.y + step.display.h + Link.GAP;
          }
          else if (ys[1] < step.display.y - Link.GAP) {
            ys[0] = step.display.y - Link.GAP;
          }
        }
        else {
          k = n - 1;
          if (xs[k - 1] > step.display.x + step.display.w + Link.GAP) {
            xs[k] = step.display.x + step.display.w + Link.GAP;
          }
          else if (xs[k - 1] < step.display.x - Link.GAP) {
            xs[k] = step.display.x - Link.GAP;
          }
          if (ys[k - 1] > step.display.y + step.display.h + Link.GAP) {
            ys[k] = step.display.y + step.display.h + Link.GAP;
          }
          else if (ys[k - 1] < step.display.y - Link.GAP) {
            ys[k] = step.display.y - Link.GAP;
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
      const horizontalFirst = (Math.abs(this.from.display.x - this.to.display.x) >= Math.abs(this.from.display.y - this.to.display.y));
      if (type === Link.LINK_TYPES.ELBOW && wasHorizontal !== horizontalFirst) {
        this.calc();
      }
      else if (step === this.from) {
        if (xs[1] > step.display.x + step.display.w) {
          xs[0] = step.display.x + step.display.w + Link.GAP;
        }
        else if (xs[1] < step.display.x) {
          xs[0] = step.display.x - Link.GAP;
        }
        else {
          xs[0] = xs[1];
        }

        if (ys[1] > step.display.y + step.display.h) {
          ys[0] = step.display.y + step.display.h + Link.GAP;
        }
        else if (ys[1] < step.display.y) {
          ys[0] = step.display.y - Link.GAP;
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
        if (xs[k - 1] > step.display.x + step.display.w) {
          xs[k] = step.display.x + step.display.w + Link.GAP;
        }
        else if (xs[k - 1] < step.display.x) {
          xs[k] = step.display.x - Link.GAP;
        }
        else {
          xs[k] = xs[k - 1];
        }

        if (ys[k - 1] > step.display.y + step.display.h) {
          ys[k] = step.display.y + step.display.h + Link.GAP;
        }
        else if (ys[k - 1] < step.display.y) {
          ys[k] = step.display.y - Link.GAP;
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

    this.setDisplay(this.display);
  }

  calc(points?: number) {
    const type = this.display.type;
    let xs = this.display.xs;
    let ys = this.display.ys;
    const x1 = this.from.display.x;
    const y1 = this.from.display.y;
    const w1 = this.from.display.w;
    const h1 = this.from.display.h;
    const x2 = this.to.display.x;
    const y2 = this.to.display.y;
    const w2 = this.to.display.w;
    const h2 = this.to.display.h;

    const n = points ? points : (xs.length < 2 ? 2 : xs.length);
    let i: number;

    if (type === Link.LINK_TYPES.STRAIGHT) {
      xs = this.display.xs = [];
      ys = this.display.ys = [];
      for (i = 0; i < n; i++) {
        xs.push(0);
        ys.push(0);
      }

      if (Math.abs(x1 - x2) >= Math.abs(y1 - y2)) {
        // more of a horizontal link
        xs[0] = (x1 <= x2) ? (x1 + w1) : x1;
        ys[0] = y1 + h1 / 2;
        xs[n - 1] = (x1 <= x2) ? x2 : (x2 + w2);
        ys[n - 1] = y2 + h2 / 2;
        for (i = 1; i < n - 1; i++) {
          if (i % 2 !== 0) {
            ys[i] = ys[i - 1];
            xs[i] = (xs[n - 1] - xs[0]) * ((i + 1) / 2) / (n / 2) + xs[0];
          }
          else {
            xs[i] = xs[i - 1];
            ys[i] = (ys[n - 1] - ys[0]) * ((i + 1) / 2) / ((n - 1) / 2) + ys[0];
          }
        }
      }
      else {
        // more of a vertical link
        xs[0] = x1 + w1 / 2;
        ys[0] = (y1 <= y2) ? (y1 + h1) : y1;
        xs[n - 1] = x2 + w2 / 2;
        ys[n - 1] = (y1 <= y2) ? y2 : (y2 + h2);
        for (i = 1; i < n - 1; i++) {
          if (i % 2 !== 0) {
            xs[i] = xs[i - 1];
            ys[i] = (ys[n - 1] - ys[0]) * ((i + 1) / 2) / (n / 2) + ys[0];
          }
          else {
            ys[i] = ys[i - 1];
            xs[i] = (xs[n - 1] - xs[0]) * (i / 2) / ((n - 1) / 2) + xs[0];
          }
        }
      }
    }
    else if (n === 2) {
      // auto ELBOW, ELBOWH, ELBOWV
      xs = this.display.xs = [0, 0];
      ys = this.display.ys = [0, 0];
      this.calcAutoElbow();
    }
    else {
      // ELBOW, ELBOWH, ELBOWV with middle control points
      const horizontalFirst = type === Link.LINK_TYPES.ELBOWH || (type === Link.LINK_TYPES.ELBOW && Math.abs(x1 - x2) >= Math.abs(y1 - y2));
      const evenN = n % 2 === 0;
      const horizontalLast = (horizontalFirst && evenN) || (!horizontalFirst && !evenN);
      xs = this.display.xs = [];
      ys = this.display.ys = [];
      for (i = 0; i < n; i++) {
        xs.push(0);
        ys.push(0);
      }
      if (horizontalFirst) {
        xs[0] = (x1 <= x2) ? (x1 + w1) : x1;
        ys[0] = y1 + h1 / 2;
      }
      else {
        xs[0] = x1 + w1 / 2;
        ys[0] = (y1 <= y2) ? (y1 + h1) : y1;
      }
      if (horizontalLast) {
        xs[n - 1] = (x2 <= x1) ? (x2 + w2) : x2;
        ys[n - 1] = y2 + h2 / 2;
      }
      else {
        xs[n - 1] = x2 + w2 / 2;
        ys[n - 1] = (y2 <= y1) ? (y2 + h2) : y2;
      }
      if (horizontalFirst) {
        for (i = 1; i < n - 1; i++) {
          if (i % 2 !== 0) {
            ys[i] = ys[i - 1];
            xs[i] = (xs[n - 1] - xs[0]) * Math.round(((i + 1) / 2) / (n / 2)) + xs[0];
          }
          else {
            xs[i] = xs[i - 1];
            ys[i] = (ys[n - 1] - ys[0]) * Math.round(((i + 1) / 2) / ((n - 1) / 2)) + ys[0];
          }
        }
      }
      else {
        for (i = 1; i < n - 1; i++) {
          if (i % 2 !== 0) {
            xs[i] = xs[i - 1];
            ys[i] = (ys[n - 1] - ys[0]) * Math.round(((i + 1) / 2) / (n / 2)) + ys[0];
          }
          else {
            ys[i] = ys[i - 1];
            xs[i] = (xs[n - 1] - xs[0]) * Math.round((i / 2) / ((n - 1) / 2)) + xs[0];
          }
        }
      }
    }
    this.calcLabel();
    this.setDisplay(this.display);
  }

  isAnchorHorizontal(anchor): boolean {
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

  calcLabel() {
    const type = this.display.type;
    const xs = this.display.xs;
    const ys = this.display.ys;

    const x1 = this.from.display.x;
    const x2 = this.to.display.x;

    const n = xs.length;

    if (type === Link.LINK_TYPES.STRAIGHT) {
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

  calcAutoElbow() {
    const type = this.display.type;
    const xs = this.display.xs;
    const ys = this.display.ys;

    if (this.to.display.x + this.to.display.w >= this.from.display.x && this.to.display.x <= this.from.display.x + this.from.display.w) {
      // V
      xs[0] = xs[1] = (Math.max(this.from.display.x, this.to.display.x) + Math.min(this.from.display.x + this.from.display.w, this.to.display.x + this.to.display.w)) / 2;
      if (this.to.display.y > this.from.display.y) {
        ys[0] = this.from.display.y + this.from.display.h + Link.GAP;
        ys[1] = this.to.display.y - Link.GAP;
      }
      else {
        ys[0] = this.from.display.y - Link.GAP;
        ys[1] = this.to.display.y + this.to.display.h + Link.GAP;
      }
    }
    else if (this.to.display.y + this.to.display.h >= this.from.display.y && this.to.display.y <= this.from.display.y + this.from.display.h) {
      // H
      ys[0] = ys[1] = (Math.max(this.from.display.y, this.to.display.y) + Math.min(this.from.display.y + this.from.display.h, this.to.display.y + this.to.display.h)) / 2;
      if (this.to.display.x > this.from.display.x) {
        xs[0] = this.from.display.x + this.from.display.w + Link.GAP;
        xs[1] = this.to.display.x - Link.GAP;
      }
      else {
        xs[0] = this.from.display.x - Link.GAP;
        xs[1] = this.to.display.x + this.to.display.w + Link.GAP;
      }
    }
    else if ((type === Link.LINK_TYPES.ELBOW && Math.abs(this.to.display.x - this.from.display.x) < Math.abs(this.to.display.y - this.from.display.y) * Link.ELBOW_THRESHOLD) ||
      (type === Link.LINK_TYPES.ELBOWV && Math.abs(this.to.display.y - this.from.display.y) > Link.ELBOW_VH_THRESHOLD)) {
      // VHV
      xs[0] = this.from.display.x + this.from.display.w / 2;
      xs[1] = this.to.display.x + this.to.display.w / 2;
      if (this.to.display.y > this.from.display.y) {
        ys[0] = this.from.display.y + this.from.display.h + Link.GAP;
        ys[1] = this.to.display.y - Link.GAP;
      }
      else {
        ys[0] = this.from.display.y - Link.GAP;
        ys[1] = this.to.display.y + this.to.display.h + Link.GAP;
      }
    }
    else if ((type === Link.LINK_TYPES.ELBOW && Math.abs(this.to.display.y - this.from.display.y) < Math.abs(this.to.display.x - this.from.display.x) * Link.ELBOW_THRESHOLD) ||
      (type === Link.LINK_TYPES.ELBOWH && Math.abs(this.to.display.x - this.from.display.x) > Link.ELBOW_VH_THRESHOLD)) {
      // HVH
      ys[0] = this.from.display.y + this.from.display.h / 2;
      ys[1] = this.to.display.y + this.to.display.h / 2;
      if (this.to.display.x > this.from.display.x) {
        xs[0] = this.from.display.x + this.from.display.w + Link.GAP;
        xs[1] = this.to.display.x - Link.GAP;
      }
      else {
        xs[0] = this.from.display.x - Link.GAP;
        xs[1] = this.to.display.x + this.to.display.w + Link.GAP;
      }
    }
    else if (type === Link.LINK_TYPES.ELBOWV) {
      // VH
      if (this.to.display.y > this.from.display.y) {
        ys[0] = this.from.display.y + this.from.display.h + Link.GAP;
      }
      else {
        ys[0] = this.from.display.y - Link.GAP;
      }
      xs[0] = this.from.display.x + this.from.display.w / 2;
      ys[1] = this.to.display.y + this.to.display.h / 2;
      if (this.to.display.x > this.from.display.x) {
        xs[1] = this.to.display.x - Link.GAP;
      }
      else {
        xs[1] = this.to.display.x + this.to.display.w + Link.GAP;
      }
    }
    else {
      // HV
      if (this.to.display.x > this.from.display.x) {
        xs[0] = this.from.display.x + this.from.display.w + Link.GAP;
      }
      else {
        xs[0] = this.from.display.x - Link.GAP;
      }
      ys[0] = this.from.display.y + this.from.display.h / 2;
      xs[1] = this.to.display.x + this.to.display.w / 2;
      if (this.to.display.y > this.from.display.y) {
        ys[1] = this.to.display.y - Link.GAP;
      }
      else {
        ys[1] = this.to.display.y + this.to.display.h + Link.GAP;
      }
    }
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

  select() {
    const context = this.diagram.context;
    context.fillStyle = this.diagram.options.anchor.color;
    for (let i = 0; i < this.display.xs.length; i++) {
      const x = this.display.xs[i];
      const y = this.display.ys[i];
      context.fillRect(
        x - this.diagram.options.anchor.width,
        y - this.diagram.options.anchor.width,
        this.diagram.options.anchor.width * 2,
        this.diagram.options.anchor.width * 2
      );
    }
    if (this.label) {
      this.label.select();
    }
    context.fillStyle = this.diagram.options.defaultColor;
  }

  isHover(x: number, y: number): boolean {
    return (this.label && this.label.isHover(x, y)) || this.drawConnector(x, y);
  }

  getAnchor(x: number, y: number): number {
    for (let i = 0; i < this.display.xs.length; i++) {
      const cx = this.display.xs[i];
      const cy = this.display.ys[i];
      if (Math.abs(cx - x) <= this.diagram.options.anchor.hitWidth && Math.abs(cy - y) <= this.diagram.options.anchor.hitWidth) {
        return i;
      }
    }
    return -1;
  }

  move(deltaX: number, deltaY: number) {
    const display = {
      type: this.display.type,
      x: this.display.x + deltaX,
      y: this.display.y + deltaY,
      xs: [],
      ys: []
    };
    if (this.display.xs) {
      this.display.xs.forEach(function (x) {
        display.xs.push(x + deltaX);
      });
    }
    if (this.display.ys) {
      this.display.ys.forEach(function (y) {
        display.ys.push(y + deltaY);
      });
    }
    this.setDisplay(display);
  }

  moveAnchor(anchor: number, deltaX: number, deltaY: number) {
    const display = {
      type: this.display.type,
      x: this.display.x,
      y: this.display.y,
      xs: [],
      ys: []
    };
    for (let i = 0; i < this.display.xs.length; i++) {
      if (i === anchor) {
        display.xs.push(this.display.xs[i] + deltaX);
        display.ys.push(this.display.ys[i] + deltaY);
      }
      else {
        display.xs.push(this.display.xs[i]);
        display.ys.push(this.display.ys[i]);
      }
    }

    if (display.type.startsWith('Elbow') && display.xs.length !== 2) {
      if (this.isAnchorHorizontal(anchor)) {
        if (anchor > 0) {
          display.ys[anchor - 1] = this.display.ys[anchor] + deltaY;
        }
        if (anchor < display.xs.length - 1) {
          display.xs[anchor + 1] = this.display.xs[anchor] + deltaX;
        }
      }
      else {
        if (anchor > 0) {
          display.xs[anchor - 1] = this.display.xs[anchor] + deltaX;
        }
        if (anchor < display.xs.length - 1) {
          display.ys[anchor + 1] = this.display.ys[anchor] + deltaY;
        }
      }
    }

    // TODO: update arrows
    this.setDisplay(display);
  }

  setFrom(fromStep: Step) {
    const newLinks = [];
    for (let i = 0; i < this.from.step.links.length; i++) {
      const fromTrans = this.from.step.links[i];
      if (this.link.id === fromTrans.id) {
        if (!fromStep.step.links) {
          fromStep.step.links = [];
        }
        fromStep.step.links.push(fromTrans);
      }
      else {
        newLinks.push(fromTrans);
      }
    }
    this.from.step.links = newLinks;
    this.from = fromStep;
  }

  setTo(toStep: Step) {
    for (let i = 0; i < this.from.step.links.length; i++) {
      const fromTrans = this.from.step.links[i];
      if (this.link.id === fromTrans.id) {
        fromTrans.to = toStep.step.id;
        break;
      }
    }
    this.to = toStep;
  }

  moveLabel(deltaX: number, deltaY: number) {
    this.setDisplay({
      type: this.display.type,
      x: this.display.x + deltaX,
      y: this.display.y + deltaY,
      xs: this.display.xs,
      ys: this.display.ys
    });
  }

  resize(_x: number, _y: number, deltaX: number, deltaY: number) {
    // not applicable
  }

  static create(diagram: Diagram, idNum: number, from: Step, to: Step) {
    const linkItem = Link.linkItem(idNum, to.step.id);
    const link = new Link(diagram, linkItem, from, to);
    if (!from.step.links) {
      from.step.links = [];
    }
    from.step.links.push(linkItem);
    link.display = { type: Link.LINK_TYPES.ELBOW, x: 0, y: 0, xs: [0, 0], ys: [0, 0] };
    link.calc();
    return link;
  }

  static linkItem(idNum: number, toId: string): LinkItem {
    return {
      id: 'L' + idNum,
      event: 'FINISH',
      to: toId,
      type: 'link'
    };
  }
}

export type LineSegment = {
  from: { x: number, y: number },
  to: { x: number, y: number },
  lineEnd?: {
    x: number,
    y: number,
    cpx: number,
    cpy: number
  } | ((context: CanvasRenderingContext2D) => void)
}
