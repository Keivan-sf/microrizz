import { EventEmitter, Readable } from "stream";
import { Connection } from "./interfaces";
import axios from "axios";

export class HTTPConnection implements Connection {
  write_buffer: Array<Buffer> = [];
  readable_stream: Readable;
  no_longer_empty_resovle?: (value: unknown) => void;
  private emitter: EventEmitter = new EventEmitter();

  constructor(public readonly end_point: string) {
    const instance = this;
    this.readable_stream = new Readable({
      async read() {
        if (instance.write_buffer.length < 1) {
          await new Promise((resolve, reject) => {
            instance.no_longer_empty_resovle = resolve;
          });
        }
        this.push(instance.write_buffer.shift());
      },
    });
    this.startRequest();
  }

  private async startRequest() {
    console.log("will be sending to ", this.end_point);
    const response = await axios.post(this.end_point, this.readable_stream, {
      responseType: "stream",
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
    });
    response.data.on("data", (data: Buffer) => {
      console.log("getting data from server:", data);
      this.emitter.emit("data", data);
    });
  }

  write(data: Buffer): void {
    if (this.no_longer_empty_resovle) {
      this.no_longer_empty_resovle(true);
      this.no_longer_empty_resovle = undefined;
    }
    console.log("trying to write shit:", data);
    this.write_buffer.push(data);
  }

  on(type: string, cb: any): void {
    this.emitter.on(type, cb);
  }

  close(): void {}
}
