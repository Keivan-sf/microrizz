import { WebSocket } from "ws";

const client = new WebSocket("ws://localhost:9092");
client.on("open", () => {
  // const b = Buffer.from([0x01, 0x02, 0x65]);
  const uname = Buffer.from("admin");
  const pw = Buffer.from("adminpw");
  const b = Buffer.concat([
    Buffer.from([128]),
    Buffer.from([uname.length]),
    uname,
    Buffer.from([pw.length]),
    pw,
  ]);
  console.log("sending ", b);
  // const b = Buffer.from([128]);
  client.send(b);
  client.send(b);
});

client.on("message", (data: Buffer) => {
  console.log(data);
});
