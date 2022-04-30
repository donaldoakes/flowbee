import { Diagram } from './diagram';
import { Label } from './label';
import { Link as LinkElement, LinkStatus } from '../model/link';
import { Step } from './step';
import { FlowElement } from '../model/element';
import { Display, LinkDisplay } from './display';
import { Edit } from './edit';
import { LINK_LAYOUT, LINK_TYPES, AUTO_ELBOW_LINK_TYPES, LINK_EVENTS, LinkLayout } from './layout';

export class Link {

  flowElement: FlowElement;
  label?: Label;
  display: LinkDisplay;
  dpRatio = 1;

  status?: LinkStatus;
  instances?; // SelectObj interface

  /**
   * @param count duplicate, overlapping links (1 = no dups)
   */
  count = 1;

  constructor(readonly diagram: Diagram, readonly link: LinkElement, public from: Step, public to: Step) {
    this.flowElement = { ...link, type: 'link' };
    if (window.devicePixelRatio) {
      this.dpRatio = window.devicePixelRatio;
    }
  }

  get type(): string { return this.flowElement.type; }
  get id(): string { return this.flowElement.id; }

  draw(animationTimeSlice?: number) {
    const color = this.getColor();

    this.diagram.context.strokeStyle = color;
    this.diagram.context.fillStyle = color;

    this.drawConnector(null, null, animationTimeSlice);

    if (this.label) {
      if (this.diagram.instance && !this.status) {
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
    let labelText = this.link.event === 'Finish' || !this.link.event ? '' : this.link.event + ':';
    labelText += this.link.result ? this.link.result : '';
    if (labelText.length > 0) {
      this.label = new Label(this, labelText, { x: this.display.x, y: this.display.y + LINK_LAYOUT.LABEL_CORR }, this.diagram.options.defaultFont);
      this.label.prepareDisplay();
    }
    return maxDisplay;
  }

  getDisplay(): LinkDisplay {
    return LinkLayout.fromAttr(this.link.attributes?.display);
  }

  setDisplay(display: LinkDisplay) {
    if (!this.link.attributes) {
      this.link.attributes = {};
    }
    this.link.attributes.display = LinkLayout.toAttr(display);
  }

  /**
   * only for the label
   */
  setDisplayAttr(x: number, y: number, _w: number, _h: number) {
    this.setDisplay({ x, y, type: this.display.type, xs: this.display.xs, ys: this.display.ys });
  }

  getColor(): string {
    const event = this.link.event || 'Finish';
    let color = LINK_EVENTS[event].color;
    if (this.diagram.instance) {
      if (this.status) {
        if (this.status === 'Initiated') {
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
      context.lineWidth = this.count * this.diagram.options.link.lineWidth;
    }

    if (!type || type.startsWith('Elbow')) {
      if (xs.length === 2) {
        hit = this.drawAutoElbowConnector(context, hitX, hitY, animationTimeSlice);
      }
      else {
        // TODO: make use of LINK_LAYOUT.CORR
        context.beginPath();
        let horizontal = ys[0] === ys[1] && (xs[0] !== xs[1] || xs[1] === xs[2]);
        context.moveTo(xs[0], ys[0]);
        for (let i = 1; i < xs.length; i++) {
          if (horizontal) {
            context.lineTo(xs[i] > xs[i - 1] ? xs[i] - LINK_LAYOUT.CR : xs[i] + LINK_LAYOUT.CR, ys[i]);
            if (i < xs.length - 1) {
              context.quadraticCurveTo(xs[i], ys[i], xs[i], ys[i + 1] > ys[i] ? ys[i] + LINK_LAYOUT.CR : ys[i] - LINK_LAYOUT.CR);
            }
          }
          else {
            context.lineTo(xs[i], ys[i] > ys[i - 1] ? ys[i] - LINK_LAYOUT.CR : ys[i] + LINK_LAYOUT.CR);
            if (i < xs.length - 1) {
              context.quadraticCurveTo(xs[i], ys[i], xs[i + 1] > xs[i] ? xs[i] + LINK_LAYOUT.CR : xs[i] - LINK_LAYOUT.CR, ys[i]);
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
    else if (type === LINK_TYPES.STRAIGHT) {
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
        this.diagram.animateLine(segments, this.getColor(), this.count * linkThis.diagram.options.link.lineWidth, animationTimeSlice);
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
          this.diagram.drawLine(segments, this.getColor(), this.count * this.diagram.options.link.lineWidth);
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
    const xcorr = xs[0] < xs[1] ? LINK_LAYOUT.CORR : -LINK_LAYOUT.CORR;
    const ycorr = ys[0] < ys[1] ? LINK_LAYOUT.CORR : -LINK_LAYOUT.CORR;
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
      case AUTO_ELBOW_LINK_TYPES.AUTOLINK_H:
        if (animationTimeSlice) {
          segments.push({
            from: { x: xs[0] - xcorr, y: ys[0] },
            to: { x: xs[1], y: ys[1] },
            lineEnd: drawArrow
          });
          this.diagram.animateLine(segments, this.getColor(), this.count * options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0] - xcorr, ys[0]);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case AUTO_ELBOW_LINK_TYPES.AUTOLINK_V:
        if (animationTimeSlice) {
          segments.push({
            from: { x: xs[0], y: ys[0] - ycorr },
            to: { x: xs[1], y: ys[1] },
            lineEnd: drawArrow
          });
          this.diagram.animateLine(segments, this.getColor(), this.count * options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0], ys[0] - ycorr);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case AUTO_ELBOW_LINK_TYPES.AUTOLINK_HVH:
        t = (xs[0] + xs[1]) / 2;
        if (animationTimeSlice) {
          let from = { x: xs[0] - xcorr, y: ys[0] };
          let to = { x: t > xs[0] ? t - LINK_LAYOUT.CR : t + LINK_LAYOUT.CR, y: ys[0] };
          let curveTo = { x: t, y: ys[1] > ys[0] ? ys[0] + LINK_LAYOUT.CR : ys[0] - LINK_LAYOUT.CR };
          let curve = { cpx: t, cpy: ys[0], x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: t, y: ys[1] > ys[0] ? ys[1] - LINK_LAYOUT.CR : ys[1] + LINK_LAYOUT.CR };
          curveTo = { x: xs[1] > t ? t + LINK_LAYOUT.CR : t - LINK_LAYOUT.CR, y: ys[1] };
          curve = { cpx: t, cpy: ys[1], x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1], y: ys[1] };
          segments.push({ from: from, to: to, lineEnd: drawArrow });
          this.diagram.animateLine(segments, this.getColor(), this.count * options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0] - xcorr, ys[0]);
          context.lineTo(t > xs[0] ? t - LINK_LAYOUT.CR : t + LINK_LAYOUT.CR, ys[0]);
          context.quadraticCurveTo(t, ys[0], t, ys[1] > ys[0] ? ys[0] + LINK_LAYOUT.CR : ys[0] - LINK_LAYOUT.CR);
          context.lineTo(t, ys[1] > ys[0] ? ys[1] - LINK_LAYOUT.CR : ys[1] + LINK_LAYOUT.CR);
          context.quadraticCurveTo(t, ys[1], xs[1] > t ? t + LINK_LAYOUT.CR : t - LINK_LAYOUT.CR, ys[1]);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case AUTO_ELBOW_LINK_TYPES.AUTOLINK_VHV:
        t = (ys[0] + ys[1]) / 2;
        if (animationTimeSlice) {
          let from = { x: xs[0], y: ys[0] - ycorr };
          let to = { x: xs[0], y: t > ys[0] ? t - LINK_LAYOUT.CR : t + LINK_LAYOUT.CR };
          let curveTo = { x: xs[1] > xs[0] ? xs[0] + LINK_LAYOUT.CR : xs[0] - LINK_LAYOUT.CR, y: t };
          let curve = { cpx: xs[0], cpy: t, x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1] > xs[0] ? xs[1] - LINK_LAYOUT.CR : xs[1] + LINK_LAYOUT.CR, y: t };
          curveTo = { x: xs[1], y: ys[1] > t ? t + LINK_LAYOUT.CR : t - LINK_LAYOUT.CR };
          curve = { cpx: xs[1], cpy: t, x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1], y: ys[1] };
          segments.push({ from: from, to: to, lineEnd: drawArrow });
          this.diagram.animateLine(segments, this.getColor(), this.count * options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0], ys[0] - ycorr);
          context.lineTo(xs[0], t > ys[0] ? t - LINK_LAYOUT.CR : t + LINK_LAYOUT.CR);
          context.quadraticCurveTo(xs[0], t, xs[1] > xs[0] ? xs[0] + LINK_LAYOUT.CR : xs[0] - LINK_LAYOUT.CR, t);
          context.lineTo(xs[1] > xs[0] ? xs[1] - LINK_LAYOUT.CR : xs[1] + LINK_LAYOUT.CR, t);
          context.quadraticCurveTo(xs[1], t, xs[1], ys[1] > t ? t + LINK_LAYOUT.CR : t - LINK_LAYOUT.CR);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case AUTO_ELBOW_LINK_TYPES.AUTOLINK_HV:
        if (animationTimeSlice) {
          let from = { x: xs[0] - xcorr, y: ys[0] };
          let to = { x: xs[1] > xs[0] ? xs[1] - LINK_LAYOUT.CR : xs[1] + LINK_LAYOUT.CR, y: ys[0] };
          const curveTo = { x: xs[1], y: ys[1] > ys[0] ? ys[0] + LINK_LAYOUT.CR : ys[0] - LINK_LAYOUT.CR };
          const curve = { cpx: xs[1], cpy: ys[0], x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1], y: ys[1] };
          segments.push({ from: from, to: to, lineEnd: drawArrow });
          this.diagram.animateLine(segments, this.getColor(), this.count * options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0] - xcorr, ys[0]);
          context.lineTo(xs[1] > xs[0] ? xs[1] - LINK_LAYOUT.CR : xs[1] + LINK_LAYOUT.CR, ys[0]);
          context.quadraticCurveTo(xs[1], ys[0], xs[1], ys[1] > ys[0] ? ys[0] + LINK_LAYOUT.CR : ys[0] - LINK_LAYOUT.CR);
          context.lineTo(xs[1], ys[1]);
        }
        break;
      case AUTO_ELBOW_LINK_TYPES.AUTOLINK_VH:
        if (animationTimeSlice) {
          let from = { x: xs[0], y: ys[0] - ycorr };
          let to = { x: xs[0], y: ys[1] > ys[0] ? ys[1] - LINK_LAYOUT.CR : ys[1] + LINK_LAYOUT.CR };
          const curveTo = { x: xs[1] > xs[0] ? xs[0] + LINK_LAYOUT.CR : xs[0] - LINK_LAYOUT.CR, y: ys[1] };
          const curve = { cpx: xs[0], cpy: ys[1], x: curveTo.x, y: curveTo.y };
          segments.push({ from: from, to: to, lineEnd: curve });
          from = curveTo;
          to = { x: xs[1], y: ys[1] };
          segments.push({ from: from, to: to, lineEnd: drawArrow });
          this.diagram.animateLine(segments, this.getColor(), this.count * options.link.lineWidth, animationTimeSlice);
        }
        else {
          context.moveTo(xs[0], ys[0] - ycorr);
          context.lineTo(xs[0], ys[1] > ys[0] ? ys[1] - LINK_LAYOUT.CR : ys[1] + LINK_LAYOUT.CR);
          context.quadraticCurveTo(xs[0], ys[1], xs[1] > xs[0] ? xs[0] + LINK_LAYOUT.CR : xs[0] - LINK_LAYOUT.CR, ys[1]);
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
    let p = 12;
    let gap = LINK_LAYOUT.GAP;
    if (this.count > 1) {
      const f = 1 + (this.count - 1) * .5;
      p = p * f;
      gap = gap * f;
    }

    let slope;
    let x, y;
    if (type === LINK_TYPES.STRAIGHT) {
      const p2 = xs.length - 1;
      const p1 = p2 - 1;
      x = xs[p2];
      y = ys[p2];
      slope = new LinkLayout(this.display, this.from.display, this.to.display).getSlope(xs[p1], ys[p1], xs[p2], ys[p2]);
    }
    else if (xs.length === 2) {
      // auto ELBOW/ELBOWH/ELBOWV type
      switch (this.getAutoElbowLinkType()) {
        case AUTO_ELBOW_LINK_TYPES.AUTOLINK_V:
        case AUTO_ELBOW_LINK_TYPES.AUTOLINK_VHV:
        case AUTO_ELBOW_LINK_TYPES.AUTOLINK_HV:
          x = xs[1];
          y = ys[1] > ys[0] ? ys[1] + gap : ys[1] - gap;
          slope = ys[1] > ys[0] ? Math.PI / 2 : Math.PI * 1.5;
          break;
        case AUTO_ELBOW_LINK_TYPES.AUTOLINK_H:
        case AUTO_ELBOW_LINK_TYPES.AUTOLINK_HVH:
        case AUTO_ELBOW_LINK_TYPES.AUTOLINK_VH:
          x = xs[1] > xs[0] ? xs[1] + gap : xs[1] - gap;
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
        y = ys[k] > ys[k - 1] ? ys[k] + gap / 2 : ys[k] - gap / 2;
        slope = ys[k] > ys[k - 1] ? Math.PI / 2 : Math.PI * 1.5;
      }
      else {
        x = xs[k] > xs[k - 1] ? xs[k] + gap : xs[k] - gap;
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

    if (type === LINK_TYPES.ELBOWH) {
      if (xs[0] === xs[1]) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_V;
      }
      else if (ys[0] === ys[1]) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_H;
      }
      else if (Math.abs(this.to.display.x - this.from.display.x) >LINK_LAYOUT.ELBOW_VH_THRESHOLD) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_HVH;
      }
      else {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_HV;
      }
    }
    else if (type === LINK_TYPES.ELBOWV) {
      if (xs[0] === xs[1]) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_V;
      }
      else if (ys[0] === ys[1]) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_H;
      }
      else if (Math.abs(this.to.display.y - this.from.display.y) >LINK_LAYOUT.ELBOW_VH_THRESHOLD) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_VHV;
      }
      else {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_VH;
      }
    }
    else {
      if (xs[0] === xs[1]) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_V;
      }
      else if (ys[0] === ys[1]) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_H;
      }
      else if (Math.abs(this.to.display.x - this.from.display.x) < Math.abs(this.to.display.y - this.from.display.y) * LINK_LAYOUT.ELBOW_THRESHOLD) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_VHV;
      }
      else if (Math.abs(this.to.display.y - this.from.display.y) < Math.abs(this.to.display.x - this.from.display.x) * LINK_LAYOUT.ELBOW_THRESHOLD) {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_HVH;
      }
      else {
        return AUTO_ELBOW_LINK_TYPES.AUTOLINK_HV;
      }
    }
  }

  recalc(step: Step) {
    const linkLayout = new LinkLayout(this.display, this.from.display, this.to.display);
    linkLayout.recalc(step.display, step === this.from);
    this.setDisplay(this.display);
  }

  calc(points?: number) {
    const linkLayout = new LinkLayout(this.display, this.from.display, this.to.display);
    linkLayout.calcLink(points);
    linkLayout.calcLabel();
    this.setDisplay(this.display);
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

  /**
   * True means other completely overlaps this
   */
  isDup(other: Link): boolean {
    if (other.id === this.id) return false; // it's me

    if (other.from.id !== this.from.id || other.to.id !== this.to.id) return false;

    if (!other.display) other.prepareDisplay();

    if (other.display.type !== this.display.type) return false;

    if (other.display.xs?.length) {
      if (this.display.xs?.length !== other.display.xs.length) return false;
      for (let i = 0; i < other.display.xs.length; i++) {
        if (other.display.xs[i] !== this.display.xs[i]) return false;
      }
    } else if (this.display.xs?.length) {
      return false;
    }
    if (other.display.ys) {
      if (this.display.ys?.length !== other.display.ys.length) return false;
      for (let i = 0; i < other.display.ys.length; i++) {
        if (other.display.ys[i] !== this.display.ys[i]) return false;
      }
    } else if (this.display.ys?.length) {
      return false;
    }

    return true;
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
      const linkLayout = new LinkLayout(this.display, this.from.display, this.to.display);
      if (linkLayout.isAnchorHorizontal(anchor)) {
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

  edit(onchange: (text: string) => void) {
    const edit = new Edit(this.diagram);
    const text = this.label?.text || '';
    const display = this.label?.display || { x: this.display.x + 2, y: this.display.y + LINK_LAYOUT.LABEL_CORR };
    display.y -= 1;
    edit.render(text, display, text => {
      if (text) this.link.result = text;
      else delete this.link.result;
      onchange(this.link.result);
    });
  }

  static create(diagram: Diagram, idNum: number, from: Step, to: Step) {
    const linkElement = Link.linkElement(idNum, to.step.id);
    const link = new Link(diagram, linkElement, from, to);
    if (!from.step.links) {
      from.step.links = [];
    }
    from.step.links.push(linkElement);
    link.display = { type: LINK_TYPES.ELBOW, x: 0, y: 0, xs: [0, 0], ys: [0, 0] };
    link.calc();
    link.count = diagram.countLinks(link);
    return link;
  }

  static copy(diagram: Diagram, linkElement: LinkElement, dx: number, dy: number, from: Step, to: Step): Link {
    const display = LinkLayout.fromAttr(linkElement.attributes?.display);
    if (typeof display.x === 'number') display.x += dx;
    if (typeof display.y === 'number') display.y += dy;
    display.xs = display.xs.map(x => x + dx);
    display.ys = display.ys.map(y => y + dy);

    const link = new Link(diagram, {
      id: 'l' + diagram.genId(diagram.allLinks()),
      type: 'link',
      to: to.id,
      ...(linkElement.event) && { event: linkElement.event },
      ...(linkElement.result) && { result: linkElement.result },
      attributes: { ...linkElement.attributes,  display: LinkLayout.toAttr(display) }
    }, from, to);
    link.display = display;
    return link;
  }

  static linkElement(idNum: number, toId: string): LinkElement {
    return {
      id: 'l' + idNum,
      type: 'link',
      to: toId
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
