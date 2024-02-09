import { WebSocket } from "ws";

const client = new WebSocket("ws://localhost:9092");
function auth() {
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
  client.send(b);
}

function newTask() {
  const b = Buffer.allocUnsafe(3);
  b.writeUInt8(129);
  b.writeUIntBE(270, 1, 2);
  console.log(b);
  console.log(b.readUIntBE(1, 2));
  client.send(b);
}

client.on("open", () => {
  // auth();
  newTask();
  newTask();
});

client.on("message", (data: Buffer) => {
  console.log(data);
});
