import { Connection, Task } from "../utils/interfaces";
import TaskManager from "../utils/TaskManager";

const COMMANDS = {
  AUTH: 128,
  NEW_TASK: 129,
  CLIENT_CLOSE_TASK: 255,
  CONNECT: 1,
  DATA: 2,
};

const ERRORS = {
  BAD_UNAME_PW: 1,
  TID_EXISTS: 2,
  NO_CONNECTION_ON_TASK: 3,
  TID_NOT_FOUND: 4,
};

type TaskPromise<T> = {
  task: Task;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

export class Server {
  private state: "none" | "auth" | "ready" = "none";
  private tasks: Map<number, Task> = new Map();
  private task_initiation_promise: Map<number, TaskPromise<number>> = new Map();
  private task_command_promise: Map<number, TaskPromise<Buffer>> = new Map();

  constructor(public connection: Connection) { }

  public authenticate(uname: string, pw: string) {
    if (this.state != "none") {
      console.log("State is not on `none`");
      return;
    }
    const auth_message = Buffer.concat([
      Buffer.from([COMMANDS.AUTH]),
      Buffer.from([uname.length]),
      Buffer.from(uname),
      Buffer.from([pw.length]),
      Buffer.from(pw),
    ]);
    this.connection.write(auth_message);
    this.state = "auth";
  }

  public start() {
    this.connection.on("data", (data: Buffer) => {
      if (data.at(0) == COMMANDS.AUTH && this.state == "auth") {
        this.state = "ready";
        console.log("auth message arrived here");
      } else if (data.at(0) == COMMANDS.NEW_TASK && this.state == "ready") {
        const tid = data.readUIntBE(1, 2);
        const task_promise = this.task_initiation_promise.get(tid);
        if (!task_promise) {
          return;
        }
        this.task_initiation_promise.delete(tid);
        console.log("Setting", tid, "to tasks");
        this.tasks.set(tid, task_promise.task);
        task_promise.resolve(task_promise.task.tid);
      } else if (data.at(0) == COMMANDS.CONNECT && this.state == "ready") {
        const tid = data.readUIntBE(1, 2);
        const task_promise = this.task_command_promise.get(tid);
        if (!task_promise) {
          return;
        }
        console.log("resolving", tid, " on connection command");
        this.task_command_promise.delete(tid);
        task_promise.resolve(data.subarray(3));
      } else if (data.at(0) == COMMANDS.DATA && this.state == "ready") {
        const tid = data.readUIntBE(1, 2);
        const task = this.tasks.get(tid);
        if (!task) {
          console.log("no task for the tid");
          return;
        }
        if (task.ondata) task.ondata(data.subarray(3));
      }
    });
  }

  public initiateTask(timeout = 5000) {
    const task = TaskManager.createTaskInstance();
    const b = Buffer.allocUnsafe(3);
    const promise = new Promise<number>((resolve, reject) => {
      this.task_initiation_promise.set(task.tid, {
        task,
        resolve,
        reject,
      });
      setTimeout(() => {
        if (!this.task_initiation_promise.get(task.tid)) return;
        this.task_initiation_promise.delete(task.tid);
        TaskManager.freeTID(task.tid);
        reject("Task initiation time out reached");
      }, timeout);
    });
    b.writeUInt8(COMMANDS.NEW_TASK);
    b.writeUIntBE(task.tid, 1, 2);
    this.connection.write(b);
    return promise;
  }

  public connectTaskToDest(tid: number, destination: Buffer, timeout = 5000) {
    const task = this.tasks.get(tid);
    if (!task) throw new Error("TID does not exist");
    if (task.dest) throw new Error("Task already has a destination");
    task.dest = destination;
    console.log(`the destination requested is:`, destination);
    const promise = new Promise<Buffer>((resolve, reject) => {
      this.task_command_promise.set(task.tid, {
        task,
        resolve,
        reject,
      });
      setTimeout(() => {
        if (!this.task_command_promise.get(task.tid)) return;
        this.task_command_promise.delete(task.tid);
        reject("Task connect command time out reached");
      }, timeout);
    });
    this.connection.write(
      this.concatCmdAndTID(COMMANDS.CONNECT, task.tid, destination),
    );
    return promise;
  }
  public setListenerToTask(tid: number, type: "data" | "close", callback: any) {
    const task = this.tasks.get(tid);
    if (!task) throw new Error("TID does not exist");
    if (type == "data") {
      task.ondata = callback;
    } else if (type == "close") {
      task.onclose = callback;
    }
  }

  public closeTask(tid: number) {
    const task = this.tasks.get(tid);
    if (!task) return;
    this.tasks.delete(tid);
    TaskManager.freeTID(tid);
    this.connection.write(
      this.concatCmdAndTID(COMMANDS.CLIENT_CLOSE_TASK, tid),
    );
  }

  public writeToTask(tid: number, data: Buffer) {
    const task = this.tasks.get(tid);
    if (!task) throw new Error("TID does not exist");
    this.connection.write(this.concatCmdAndTID(COMMANDS.DATA, tid, data));
  }
  private concatCmdAndTID(cmd: number, tid: number, body?: Buffer) {
    const b = Buffer.allocUnsafe(3);
    b.writeUInt8(cmd);
    b.writeUIntBE(tid, 1, 2);
    if (!body) return b;
    return Buffer.concat([b, body]);
  }
}
