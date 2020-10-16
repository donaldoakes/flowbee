import { Diagram } from './diagram';
import { Step } from './step';
import { Link } from './link';
import { Subflow } from './subflow';
import { Note } from './note';
import { Label } from './label';

export type SelectObj = Diagram | Step | Link | Subflow | Note | Label;

export class Selection {

  selectObjs: SelectObj[] = [];

  constructor(readonly diagram: Diagram) {
  }

  includes(obj: SelectObj): boolean {
    for (let i = 0; i < this.selectObjs.length; i++) {
      if (this.selectObjs[i] === obj) {
        return true;
      }
    }
    return false;
  }

  isMulti(): boolean {
    return this.selectObjs.length > 1;
  }

  getSelectObj(): SelectObj {
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
      this.selectObjs.push(obj);
      if (obj.type === 'step') {
        // add any contained links
        let stepLinks;
        const step = this.diagram.getStep((obj as Step).step.id);
        if (step) {
          stepLinks = this.diagram.getLinks(obj as Step);
        }
        else {
          for (let i = 0; i < this.diagram.subflows.length; i++) {
            const subflow = this.diagram.subflows[i];
            const step = subflow.getStep((obj as Step).step.id);
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
                this.add(stepLink);
                stepLink.select();
              }
            }
            else {
              if (this.includes(stepLink.from)) {
                this.add(stepLink);
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
      if (this.selectObjs[i] !== obj) {
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
   * works for the primary (single) selection to reenable anchors
   */
  reselect() {
    if (this.getSelectObj() && !this.isMulti()) {
      const selObj = this.getSelectObj();
      const id = selObj.flowItem ? selObj.flowItem.id : null;
      if (typeof id === 'string') {
        this.setSelectObj(this.diagram.get(id));
        if (!this.getSelectObj()) {
          for (let i = 0; i < this.diagram.subflows.length; i++) {
            this.setSelectObj(this.diagram.subflows[i].get(id));
            if (this.getSelectObj()) {
              break;
            }
          }
        }
      }
      if (!this.getSelectObj()) {
        this.setSelectObj(this.diagram.label);
      }
    }
  }

  move(startX: number, startY: number, deltaX: number, deltaY: number) {
    const selection = this;

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
          const step = this.diagram.getStep((selObj as Step).step.id);
          if (step) {
            selObj.move(deltaX, deltaY);
            const links = this.diagram.getLinks(step);
            for (let j = 0; j < links.length; j++) {
              if (!this.includes(links[j])) {
                links[j].recalc(step);
              }
            }
          }
          else {
            // try subflows
            for (let j = 0; j < this.diagram.subflows.length; j++) {
              const subflow = this.diagram.subflows[j];
              const step = subflow.getStep((selObj as Step).step.id);
              if (step) {
                // only within bounds of subflow
                selObj.move(deltaX, deltaY, subflow.display);
                const links = subflow.getLinks(step);
                for (let k = 0; k < links.length; k++) {
                  if (!this.includes(links[k])) {
                    links[k].recalc(step);
                  }
                }
              }
            }
          }
        }
        else {
          // TODO: prevent subproc links in multisel from moving beyond border
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
    // TODO: diagram label loses select
  }

  /**
   * re-find the selected object after it's been moved
   */
  find(obj) {
    if (obj.workflowItem && obj.workflowItem.id) {
      let found = this.diagram.get(obj.workflowItem.id);
      if (found) return found;

      // try subflows
      for (let i = 0; i < this.diagram.subflows.length; i++) {
        const subflow = this.diagram.subflows[i];
        found = subflow.get(obj.workflowItem.id);
        if (found) return found;
      }
    }
  }
}