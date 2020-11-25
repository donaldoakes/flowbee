import { Diagram } from './diagram';
import { Step } from './step';
import { Link } from './link';
import { Subflow } from './subflow';
import { Note } from './note';
import { Label } from './label';
import { Shape } from './shape';

export type SelectObj = Diagram | Step | Link | Subflow | Note | Label;

export class Selection {

  selectObjs: SelectObj[] = [];

  constructor(readonly diagram: Diagram) {
  }

  includes(obj: SelectObj): boolean {
    for (let i = 0; i < this.selectObjs.length; i++) {
      if (this.selectObjs[i].id === obj.id) {
        return true;
      }
    }
    return false;
  }

  isMulti(): boolean {
    return this.selectObjs.length > 1;
  }

  getSelectObj(): SelectObj | null {
    if (this.selectObjs.length === 0) {
      return null;
    }
    else {
      return this.selectObjs[0];
    }
  }

  setSelectObj(obj: SelectObj) {
    this.selectObjs = obj ? [obj] : [];
  }

  add(obj: SelectObj) {
    if (!this.includes(obj)) {
      this.selectObjs.unshift(obj); // add first so becomes selection
      if (obj.type === 'step') {
        // add any contained links
        let stepLinks: Link[];
        const step = this.diagram.getStep((obj as Step).step.id);
        if (step) {
          stepLinks = this.diagram.getLinks(obj as Step);
        }
        else {
          for (let i = 0; i < this.diagram.subflows.length; i++) {
            const subflow = this.diagram.subflows[i];
            stepLinks = subflow.getLinks(obj as Step);
            if (stepLinks) {
              break;
            }
          }
        }

        if (stepLinks) {
          for (let i = 0; i < stepLinks.length; i++) {
            const stepLink = stepLinks[i];
            if (stepLink.from === obj) {
              if (this.includes(stepLink.to)) {
                this.selectObjs.push(stepLink);
                stepLink.select();
              }
            }
            else {
              if (this.includes(stepLink.from)) {
                this.selectObjs.push(stepLink);
                stepLink.select();
              }
            }
          }
        }
      }
    }
  }

  remove(obj: SelectObj) {
    const newSel = [];
    for (let i = 0; i < this.selectObjs.length; i++) {
      if (this.selectObjs[i].id !== obj.id) {
        newSel.push(this.selectObjs[i]);
      }
    }
    this.selectObjs = newSel;
  }

  doDelete() {
    for (let i = 0; i < this.selectObjs.length; i++) {
      const selObj = this.selectObjs[i];
      if (selObj.type === 'step') {
        this.diagram.deleteStep(selObj as Step);
      }
      else if (selObj.type === 'link') {
        this.diagram.deleteLink(selObj as Link);
      }
      else if (selObj.type === 'subflow') {
        this.diagram.deleteSubflow(selObj as Subflow);
      }
      else if (selObj.type === 'note') {
        this.diagram.deleteNote(selObj as Note);
      }
    }
  }

  /**
   * find selected object(s) by id and set as selection
   * (does not actually render anchors)
   */
  reselect() {
    const selObjs = this.selectObjs;
    this.selectObjs = [];
    for (const selObj of selObjs) {
      let obj = this.diagram.get(selObj.flowElement.id);
      if (!obj) {
        for (let i = 0; i < this.diagram.subflows.length; i++) {
          obj = this.diagram.subflows[i].get(selObj.flowElement.id);
          if (obj) {
            break;
          }
        }
      }
      if (obj) {
        this.selectObjs.push(obj);
      }
    }
  }

  /**
   * renders anchors on selected obj(s)
   */
  select() {
    for (const selObj of this.selectObjs) {
      selObj.select();
    }
  }

  unselect() {
    this.selectObjs = [];
  }

  move(startX: number, startY: number, deltaX: number, deltaY: number) {

    if (!this.isMulti() && this.getSelectObj().type === 'link') {
      // move link label
      const link = this.getSelectObj() as Link;
      if (link.label && link.label.isHover(startX, startY)) {
        link.moveLabel(deltaX, deltaY);
      }
    }
    else {
      for (let i = 0; i < this.selectObjs.length; i++) {
        const selObj = this.selectObjs[i];
        if (selObj.type === 'step') {
          const step = this.diagram.getStep(selObj.id);
          if (step) {
            selObj.move(deltaX, deltaY);
            const links = this.diagram.getLinks(step);
            for (let j = 0; j < links.length; j++) {
              if (!this.includes(links[j])) {
                links[j].recalc(step);
              }
            }
          } else {
            // try subflows
            for (let j = 0; j < this.diagram.subflows.length; j++) {
              const subflow = this.diagram.subflows[j];
              const step = subflow.getStep((selObj as Step).step.id);
              if (step) {
                // only within bounds of subflow
                selObj.move(deltaX, deltaY, subflow.display);
                const links = subflow.getLinks(step);
                for (const link of links) {
                  link.recalc(step);
                }
                break;
              }
            }
          }
        } else if (selObj.type === 'link') {
          const link = this.diagram.getLink(selObj.id);
          if (link) {
            selObj.move(deltaX, deltaY);
          }
        } else {
          selObj.move(deltaX, deltaY);
        }
      }
    }

    this.diagram.draw();

    for (let i = 0; i < this.selectObjs.length; i++) {
      const selObj = this.selectObjs[i];
      const reselObj = this.find(selObj);
      if (reselObj) {
        reselObj.select();
      }
    }
  }

  snap(resize: boolean = false) {
    for (const selObj of this.selectObjs) {
      this.diagram.snap(selObj as Shape, resize);
    }
  }

  /**
   * re-find the selected object after it's been moved
   */
  find(obj: SelectObj) {
    if (obj.flowElement && obj.flowElement.id) {
      let found = this.diagram.get(obj.flowElement.id);
      if (found) return found;

      // try subflows
      for (let i = 0; i < this.diagram.subflows.length; i++) {
        const subflow = this.diagram.subflows[i];
        found = subflow.get(obj.flowElement.id);
        if (found) return found;
      }
    }
  }

  toString(): string {
    return JSON.stringify(this.selectObjs.map(obj => {
      return { [obj.type]: obj.id };
    }));
  }
}
