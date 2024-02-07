import { WebSocket } from "ws";

const client = new WebSocket("ws://localhost:9092");
client.on("open", () => {
  // const b = Buffer.from([0x01, 0x02, 0x65]);
  // const b = Buffer.from([128, 4, 1, 2, 3, 7, 4, 1, 2, 3, 9]);
  const b = Buffer.from([128]);
  client.send(b);
});
