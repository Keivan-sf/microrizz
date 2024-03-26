import axios from "axios";
import { sleep } from "./sleep";
/**
 * This class aims to imbalance the download/upload
 * traffic of the proxy so it wouldn't be easily detected.
 * Currently it only sends requests to one/multiple
 * endpoints and receives the response in a user specified
 * interval
 */
export class NetworkImbalancer {
  constructor(
    public targets: string[],
    public interval: number,
  ) { }
  public async start() {
    let i = 0;
    while (true) {
      if (i > this.targets.length - 1) {
        i = 0;
      }
      axios.get(this.targets[i]).catch((err) => {
        console.log("axios err", err);
      });
      i++;
      await sleep(this.interval);
    }
  }
}
