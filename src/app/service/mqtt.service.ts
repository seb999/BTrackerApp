import { Injectable } from '@angular/core';
import socketIOClient from "socket.io-client";

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  private loraMessageEndpoint: string = "http://127.0.0.1:4001";
  //private loraMessageEndpoint: string = "http://dspx.eu:1884";
  public socketIO: any;

  constructor() { }

  openConnection() {
    return socketIOClient(this.loraMessageEndpoint);
  }
}
