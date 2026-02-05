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
        "Content-Type": "application/octet-stream",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        Pragma: "no-cache",
        "Sec-Ch-Ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
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
