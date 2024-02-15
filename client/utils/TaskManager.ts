import { Duplex } from "stream";
import { Task } from "./interfaces";

let unused_TIDs: Set<number> = new Set();
let used_TIDs: Set<number> = new Set();
const tasks: Task[] = [];
unused_TIDs = generateIDSet();

export function createTask(): Task {
  const task: Task = {
    tid: getTID(),
    incoming: new Duplex(),
    outgoing: new Duplex(),
  };
  tasks.push(task);
  return task;
}

export function freeTID(id: number) {
  used_TIDs.delete(id);
  unused_TIDs.add(id);
}

function getTID() {
  if (unused_TIDs.size < 1) throw new Error("out of tids");
  const val = unused_TIDs.values().next().value;
  unused_TIDs.delete(val);
  used_TIDs.add(val);
  return val;
}

function generateIDSet(): Set<number> {
  const set: Set<number> = new Set();
  for (let i = 1; i < 65534; i++) {
    set.add(i);
  }
  return set;
}
