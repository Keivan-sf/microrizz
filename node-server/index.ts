import { WebSocketServer } from "ws";
import express, { Router } from "express";
import { WSConnection } from "./connection";
import { Client } from "./Handler/handler";
import { NetworkImbalancer } from "./Utils/NetworkImbalancer";
import { config } from "dotenv";
import { WRTCClient } from "./Lib/WRTC";
config();
const PORT = process.env.PORT ?? 3000;
const TIME_OUT = 15000;

function routeWRTC(router: Router) {
  let id_counter = 0;
  const wrtcClients: WRTCClient[] = [];
  router.get("/initiate", (req, res) => {
    const id = ++id_counter;
    wrtcClients.push(new WRTCClient(id));
    res.send({ id });
  });
  router.post("/offer", async (req, res) => {
    const client = wrtcClients.find((w) => w.id == req.body.id);
    if (!client) {
      res.statusCode = 400;
      res.send({ msg: `no client found with id ${req.body.id}` });
      return;
    }
    console.log("offer:", req.body);
    const answer = await client.getAnswer(req.body.offer);
    res.send({ id: req.body.id, answer });
  });
  router.get("/ice-candidate", (req, res) => {});
  router.post("/ice-candidate", (req, res) => {
    const client = wrtcClients.find((w) => w.id == req.body.id);
    if (!client) {
      res.statusCode = 400;
      res.send({ msg: `no client found with id ${req.body.id}` });
      return;
    }
    client.addCandidate(req.body.candidate);
    res.send(200);
  });
}

export const startServer = () => {
  const app = express();
  app.use(express.json());
  app.get("/", (req, res) => {
    res.send("<html><h4>Work in progress...</h4></br>Coming soon</html>");
  });
  const wrtc_router = express.Router();
  routeWRTC(wrtc_router);
  app.use("/webrtc", wrtc_router);
  const server2 = app.listen(PORT);
  const wss = new WebSocketServer({ server: server2 });
  wss.on("connection", (ws) => {
    new Client(new WSConnection(ws), TIME_OUT);
  });

  wss.on("listening", () => {
    console.log(`wss is listening on port ${PORT}`);
  });
  const imbalaner = new NetworkImbalancer(["http://time.ir"], 5000);
  // imbalaner.start();
};

startServer();
