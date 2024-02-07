import { WebSocket } from "ws";

const client = new WebSocket("ws://localhost:9092");
client.on("open", () => {
  const b = Buffer.from([0x01, 0x02, 0x65]);
  client.send(b);
});
