import { Duplex } from "stream";
import { Task } from "./interfaces";

export class TaskManager {
  private unused_TIDs: Set<number> = new Set();
  private used_TIDs: Set<number> = new Set();
  public tasks: Task[] = [];
  constructor() {
    this.unused_TIDs = this.generateIDSet();
  }
  createTask(): Task {
    const task: Task = {
      tid: this.getTID(),
      incoming: new Duplex(),
      outgoing: new Duplex(),
    };
    this.tasks.push(task);
    return task;
  }
  public freeTID(id: number) {
    this.used_TIDs.delete(id);
    this.unused_TIDs.add(id);
  }
  private getTID() {
    if (this.unused_TIDs.size < 1) throw new Error("out of tids");
    const val = this.unused_TIDs.values().next().value;
    this.unused_TIDs.delete(val);
    this.used_TIDs.add(val);
    return val;
  }
  private generateIDSet(): Set<number> {
    const set: Set<number> = new Set();
    for (let i = 1; i < 65534; i++) {
      set.add(i);
    }
    return set;
  }
}
