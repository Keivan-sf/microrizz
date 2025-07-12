import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCDataChannel,
  RTCRtpSender,
  RTCRtpTransceiver,
} from "@roamhq/wrtc";
import { Connection } from "./interfaces";

export class WRTCClient implements Connection {
  private peer: RTCPeerConnection;
  private data_channel: RTCDataChannel;
  constructor(private signallingServer: string) {
    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.data_channel = this.peer.createDataChannel("channel", {
      ordered: true,
    });
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
