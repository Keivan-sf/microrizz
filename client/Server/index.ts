import { Connection, Task } from "../utils/interfaces";
import TaskManager from "../utils/TaskManager";

const COMMANDS = {
  AUTH: 128,
  NEW_TASK: 129,
  // less than 128 commands are task specific
  CONNECT: 1,
  DATA: 2,
  UDP_ASSOCIATE: 3,
  UDP_DATA: 4,
  SERVER_CLOSE_TASK: 126,
  CLIENT_CLOSE_TASK: 127,
};

const ERRORS = {
  BAD_UNAME_PW: 1,
  TID_EXISTS: 2,
  NO_CONNECTION_ON_TASK: 3,
  TID_NOT_FOUND: 4,
  NO_UDPSOCKET_ON_TASK: 5,
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
  private task_connect_promise: Map<number, TaskPromise<Buffer>> = new Map();
  private task_udp_promise: Map<number, TaskPromise<void>> = new Map();

  constructor(public connection: Connection) {}

  public authenticate(uname: string, pw: string) {
    if (this.state != "none") {
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
      } else if (data.at(0) == COMMANDS.NEW_TASK && this.state == "ready") {
        const tid = data.readUIntBE(1, 2);
        const task_promise = this.task_initiation_promise.get(tid);
        if (!task_promise) {
          return;
        }
        this.task_initiation_promise.delete(tid);
        this.tasks.set(tid, task_promise.task);
        task_promise.resolve(task_promise.task.tid);
      } else if (data.at(0) == COMMANDS.CONNECT && this.state == "ready") {
        const tid = data.readUIntBE(1, 2);
        const task_promise = this.task_connect_promise.get(tid);
        if (!task_promise) {
          return;
        }
        this.task_connect_promise.delete(tid);
        task_promise.resolve(data.subarray(3));
      } else if (
        data.at(0) == COMMANDS.UDP_ASSOCIATE &&
        this.state == "ready"
      ) {
        const tid = data.readUIntBE(1, 2);
        const task_promise = this.task_udp_promise.get(tid);
        if (!task_promise) {
          return;
        }
        this.task_udp_promise.delete(tid);
        task_promise.resolve();
      } else if (data.at(0) == COMMANDS.DATA && this.state == "ready") {
        const tid = data.readUIntBE(1, 2);
        const task = this.tasks.get(tid);
        if (!task) {
          return;
        }
        if (task.ondata) task.ondata(data.subarray(3));
      } else if (data.at(0) == COMMANDS.UDP_DATA && this.state == "ready") {
        const tid = data.readUIntBE(1, 2);
        const task = this.tasks.get(tid);
        if (!task) return;
        if (task.onUdpData) task.onUdpData(data.subarray(3));
      } else if (data.at(0) == COMMANDS.SERVER_CLOSE_TASK) {
        const tid = data.readUIntBE(1, 2);
        this.closeTask(tid, false);
      }
    });
  }

  public initiateTask(timeout = 10000) {
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
        reject("Task initiation time out reached for " + task.tid);
      }, timeout);
    });
    b.writeUInt8(COMMANDS.NEW_TASK);
    b.writeUIntBE(task.tid, 1, 2);
    this.connection.write(b);
    return promise;
  }

  public createUDPAssociationForTask(tid: number, timeout = 10000) {
    const task = this.tasks.get(tid);
    if (!task) throw new Error("TID does not exist");
    if (task.inuse) throw new Error("Task already in use");
    task.inuse = true;
    const promise = new Promise<void>((resolve, reject) => {
      this.task_udp_promise.set(task.tid, {
        task,
        resolve,
        reject,
      });
      setTimeout(() => {
        if (!this.task_udp_promise.get(task.tid)) return;
        this.task_udp_promise.delete(task.tid);
        reject("Task udp associate command time out reached");
      }, timeout);
    });
    this.connection.write(
      this.concatCmdAndTID(COMMANDS.UDP_ASSOCIATE, task.tid),
    );
    return promise;
  }

  public connectTaskToDest(tid: number, destination: Buffer, timeout = 10000) {
    const task = this.tasks.get(tid);
    if (!task) throw new Error("TID does not exist");
    if (task.inuse) throw new Error("Task already in use");
    task.dest = destination;
    task.inuse = true;
    const promise = new Promise<Buffer>((resolve, reject) => {
      this.task_connect_promise.set(task.tid, {
        task,
        resolve,
        reject,
      });
      setTimeout(() => {
        if (!this.task_connect_promise.get(task.tid)) return;
        this.task_connect_promise.delete(task.tid);
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

  public closeTask(tid: number, sendCloseCommandToServer = true) {
    console.log("closing", tid);
    const task = this.tasks.get(tid);
    if (!task) return;
    this.tasks.delete(tid);
    TaskManager.freeTID(tid);
    if (sendCloseCommandToServer) {
      this.connection.write(
        this.concatCmdAndTID(COMMANDS.CLIENT_CLOSE_TASK, tid),
      );
    }
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
