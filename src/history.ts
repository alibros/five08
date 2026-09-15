import {clone,type Project} from './model';

/**
 * Undo history with a memory budget.
 *
 * Counting entries is the wrong unit: a project carrying a 1.5 MB embedded PNG
 * costs a thousand times more per step than a blank panel, and a hundred of
 * them will exhaust a tab. This keeps a byte budget instead and drops the
 * oldest states until the budget is met, so deep history is available on small
 * projects and shallow history on heavy ones.
 */
export const DEFAULT_BUDGET=24*1024*1024;
export const MAX_ENTRIES=200;
/** Always keep this many steps, however heavy the project. */
export const MIN_ENTRIES=5;

export type Snapshot={project:Project;bytes:number};

/** Cheap proxy for retained size: the JSON length, which embedded images dominate. */
export const weigh=(p:Project)=>JSON.stringify(p).length*2;

export class History {
  private entries:Snapshot[]=[];
  private at=-1;
  constructor(initial:Project,readonly budget=DEFAULT_BUDGET){this.reset(initial);}

  reset(project:Project){
    this.entries=[{project:clone(project),bytes:weigh(project)}];
    this.at=0;
  }

  /** Records a new state, discarding anything that was undone past this point. */
  push(project:Project){
    this.entries=this.entries.slice(0,this.at+1);
    this.entries.push({project:clone(project),bytes:weigh(project)});
    this.at=this.entries.length-1;
    this.trim();
  }

  private trim(){
    while(this.entries.length>MAX_ENTRIES&&this.entries.length>MIN_ENTRIES){this.entries.shift();this.at--;}
    while(this.entries.length>MIN_ENTRIES&&this.bytes>this.budget){this.entries.shift();this.at--;}
    if(this.at<0)this.at=0;
  }

  undo(){return this.canUndo?clone(this.entries[--this.at].project):null;}
  redo(){return this.canRedo?clone(this.entries[++this.at].project):null;}

  get canUndo(){return this.at>0;}
  get canRedo(){return this.at<this.entries.length-1;}
  get depth(){return this.entries.length;}
  get index(){return this.at;}
  get bytes(){return this.entries.reduce((total,e)=>total+e.bytes,0);}
}
