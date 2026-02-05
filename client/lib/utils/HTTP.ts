import { EventEmitter, Readable } from "stream";
import { Connection } from "./interfaces";
import FormData from "form-data";
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
    const form = new FormData();

    // Add file from readable stream
    form.append("file", this.readable_stream, {
      filename: "filename.ext",
      contentType: "application/octet-stream",
    });
    console.log("headers:", form.getHeaders());

    const response = await axios.get(this.end_point, {
      responseType: "stream",
      headers: {
        "Content-Type": "application/octet-stream",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
    });
    response.data.on("data", (data: Buffer) => {
      console.log("getting data from server:", data);
      this.emitter.emit("data", data);
    });

    axios.post(this.end_point, form, {
      responseType: "stream",
      headers: {
        "Content-Type": "application/octet-stream",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
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
