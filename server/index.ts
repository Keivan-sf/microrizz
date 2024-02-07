import { WebSocketServer } from "ws";
import express from "express";
import { WSConnection } from "./connection";
import { Client } from "./Handler/handler";

export const startServer = () => {
  const app = express();
  const server2 = app.listen(9092);
  const wss = new WebSocketServer({ server: server2 });
  wss.on("connection", (ws) => {
    new Client(new WSConnection(ws));
  });

  wss.on("listening", () => {
    console.log("wss is listening on port 9092");
  });
};

startServer();
