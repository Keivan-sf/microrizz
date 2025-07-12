import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCDataChannel,
  RTCRtpSender,
  RTCRtpTransceiver,
} from "@roamhq/wrtc";
import { Connection } from "./interfaces";
import axios from "axios";
import { URL } from "url";

export class WRTCClient implements Connection {
  private peer: RTCPeerConnection;
  private data_channel: RTCDataChannel;
  private id: null | number = null;
  constructor(private signalling_endpoint: string) {
    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.data_channel = this.peer.createDataChannel("channel", {
      ordered: true,
    });
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peer.addEventListener("connectionstatechange", (event) => {
        console.log(
          "connection state changed:",
          this.peer.connectionState,
          this.peer,
        );
        if (this.peer.connectionState === "connected") {
          resolve();
        }
      });
      this.connectToSever().catch((err) => reject(err));
    });
  }

  private async connectToSever() {
    const initation_url = joinURLPaths(this.signalling_endpoint, "/initiate");
    const initiation_req = await axios.get(initation_url);
    this.id = +initiation_req.data.id;
    console.log("initiated webrtc negotiations");

    console.log("creating offer");
    const offer = await this.peer.createOffer();
    const offer_url = joinURLPaths(this.signalling_endpoint, "/offer");
    console.log("sending offer");
    const offer_req = await axios.post(offer_url, { id: this.id, offer });
    console.log("anwser:", offer_req.data);
  }

  public write(data: Buffer) {
    this.data_channel.send(data);
  }

  public on(type: "data", cb: (data: Buffer) => void): void;
  public on(type: "close", cb: () => void): void;
  public on(type: "error", cb: (error: any) => void): void;
  public on(type: "connection", cb: () => void): void;
  public on(type: any, cb: any) {
    if (type == "data") {
      this.data_channel.onmessage = (ev) => cb(ev.data);
    } else if (type == "close") {
      this.data_channel.onclose = () => cb();
    } else if (type == "error") {
      this.data_channel.onerror = (error) => cb(error);
    } else if (type == "connection") {
      this.data_channel.onopen = () => cb();
    }
  }

  public close() {
    this.peer.onicecandidate = null;
    this.peer.ontrack = null;
    this.peer.ondatachannel = null;
    this.peer.onicecandidateerror = null;
    this.peer.onnegotiationneeded = null;
    this.peer.onsignalingstatechange = null;
    this.peer.onconnectionstatechange = null;
    this.peer.onicegatheringstatechange = null;
    this.peer.oniceconnectionstatechange = null;
    this.peer.oniceconnectionstatechange = null;
    if (this.data_channel) {
      this.data_channel.onmessage = null;
      this.data_channel.onopen = null;
      this.data_channel.onclose = null;
      this.data_channel.onerror = null;
      this.data_channel.onclosing = null;
      this.data_channel.onbufferedamountlow = null;
    }
    this.peer.close();
  }
}

function joinURLPaths(basePath: string, additionalPath: string) {
  return basePath.replace(/\/$/, "") + "/" + additionalPath.replace(/^\//, "");
}
