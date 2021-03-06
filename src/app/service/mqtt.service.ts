import { Injectable, EventEmitter } from '@angular/core';
import socketIOClient from "socket.io-client";
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  public socketIO: any;
  public socket:any;
  public eventMotionDetected: EventEmitter<string> = new EventEmitter();
  public eventAdded: EventEmitter<string> = new EventEmitter();
  public eventFail: EventEmitter<string> = new EventEmitter();
  public eventUpdated: EventEmitter<string> = new EventEmitter();
  public eventDeleted: EventEmitter<string> = new EventEmitter();
  private loraMessageEndpoint: string;

  //private loraMessageEndpoint: string = "http://127.0.0.1:4001";  //DEV
  //private loraMessageEndpoint: string = "http://dspx.eu:1884";  //PROD

  constructor(private platform: Platform,) {
    this.loraMessageEndpoint = this.onDevice() ? 'http://dspx.eu:1884' : 'http://127.0.0.1:4001';
    this.socket = socketIOClient(this.loraMessageEndpoint);
   }

   public onDevice(): boolean {
    return this.platform.is('cordova');
  }

  //Use this one if you want to put the socket.on event in the client
  openConnectionDummy() {
    return socketIOClient(this.loraMessageEndpoint);
  }

  //////////////////////////////////////////////////
  //1 - Client subscribe to those events methods////
  /////////////////////////////////////////////////
  public onMotion() {
    return this.eventMotionDetected;
  }

  public onAdded() {
    return this.eventAdded;
  }

  public onAddedFail() {
    return this.eventFail;
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
      //Fire a local event that will be catch by UI
      return this.eventMotionDetected.emit(trackerEUI);
    });

    this.socket.on("ttnAddSucceeded", (ttnDevID: any) => {
      //Fire a local event that will be catch by UI
      return this.eventAdded.emit(ttnDevID);
    })

    this.socket.on("ttnAddFail", (error: any) => {
      //Fire a local event that will be catch by UI
      return this.eventFail.emit(error);
    })

    this.socket.on("ttnUpdateSucceeded", (ttnDevID: any) => {
      //Fire a local event that will be catch by UI
      return this.eventUpdated.emit(ttnDevID);
    });

    this.socket.on("ttnDeleteSucceeded", () => {
      //Fire a local event that will be catch by UI
      return this.eventDeleted.emit();
    });
  }

  ///////////////////////////
  ////ADD, UPDATE, DELETE////
  ///////////////////////////
  public addTracker(deviceEui: any, deviceDescription: any) {
    let payload = { EUI: deviceEui, Description: deviceDescription }
    console.log("payload from app : ", payload)
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
