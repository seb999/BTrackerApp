import { Injectable, EventEmitter } from '@angular/core';
import socketIOClient from "socket.io-client";

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  public socketIO: any;
  public socket:any;
  public eventMotionDetected: EventEmitter<string> = new EventEmitter();
  public eventAdded: EventEmitter<string> = new EventEmitter();
  public eventUpdated: EventEmitter<string> = new EventEmitter();
  public eventDeleted: EventEmitter<string> = new EventEmitter();

  private loraMessageEndpoint: string = "http://127.0.0.1:4001";  //DEV
  //private loraMessageEndpoint: string = "http://dspx.eu:1884";  //PROD

  constructor() {
    this.socket = socketIOClient(this.loraMessageEndpoint);
   }

  //Use this one if you want to put the socket.on event in the client
  openConnectionDummy() {
    return socketIOClient(this.loraMessageEndpoint);
  }

  ///////////////////////////////////////////
  //1 - Client subscribe to those methods////
  ///////////////////////////////////////////
  public onMotion() {
    return this.eventMotionDetected;
  }

  public onAdded() {
    return this.eventAdded;
  }

  public onUpdated() {
    return this.eventUpdated;
  }

  public onDeleted() {
    return this.eventDeleted;
  }

  //////////////////////////////////////////////////////////////////////
  //2 - Client call once this method to start listening mqtt messages///
  /////////////////////////////////////////////////////////////////////
  public openListener() {
   // const socket = socketIOClient(this.loraMessageEndpoint);

    this.socket.on("ttnMotionDetected", (trackerEUI: any) => {
      return this.eventMotionDetected.emit(trackerEUI);
    });

    this.socket.on("ttnAddSucceeded", (ttnDevID: string) => {
      return this.eventAdded.emit(ttnDevID);
    })

    this.socket.on("ttnUpdateSucceeded", (ttnDevID: any) => {
      return this.eventUpdated.emit(ttnDevID);
    });

    this.socket.on("ttnDeleteSucceeded", (ttnDevID: any) => {
      return this.eventDeleted.emit(ttnDevID);
    });

  }

  ///////////////////////////
  ////ADD, UPDATE, DELETE////
  ///////////////////////////
  public addTracker(deviceEui: any, deviceDescription: any) {
    let payload = { EUI: deviceEui, Description: deviceDescription }
    this.socket.emit("ttnAddDevice", payload);
  }

  public updateTracker(deviceEui: any, deviceDescription: any, ttnDevID: any) {
    let payload = { EUI: deviceEui, Description: deviceDescription, devID: ttnDevID }
    this.socket.emit("ttnUpdateDevice", payload);
  }

  public deleteTracker(ttnDevID: any) {
    this.socket.emit("ttnDeleteDevice", ttnDevID);
  }
}
