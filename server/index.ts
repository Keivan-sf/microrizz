import { WebSocketServer } from "ws";
import express from "express";
import { WSConnection } from "./connection";
import { Client } from "./Handler/handler";
import { NetworkImbalancer } from "./Utils/NetworkImbalancer";
const PORT = 9092;

export const startServer = () => {
  const app = express();
  app.get("/", (req, res) => {
    res.send("<html><h4>Work in progress...</h4></br>Coming soon</html>");
  });
  const server2 = app.listen(PORT);
  const wss = new WebSocketServer({ server: server2 });
  wss.on("connection", (ws) => {
    new Client(new WSConnection(ws));
  });

  wss.on("listening", () => {
    console.log(`wss is listening on port ${PORT}`);
  });
  const imbalaner = new NetworkImbalancer(["http://time.ir"], 5000);
  // imbalaner.start();
};

startServer();
