import { Injectable, EventEmitter } from '@angular/core';
import socketIOClient from "socket.io-client";
import { Platform } from '@ionic/angular';
import { AlarmService } from '../service/alarm.service';

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
  public alarmTrackerEUI: any;

  constructor(private platform: Platform, 
    private alarmService: AlarmService,) {
    this.loraMessageEndpoint = this.onDevice() ? 'http://dspx.eu:1884' : 'http://127.0.0.1:4001';
    this.openListener();
   }

   public onDevice(): boolean {
    return this.platform.is('cordova');
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
    const socket = socketIOClient(this.loraMessageEndpoint);

    socket.on("ttnMotionDetected", (trackerEUI: any) => {
      //Fire a local event that will be catch by UI
      this.alarmService.checkAlert(trackerEUI);
      this.alarmTrackerEUI = trackerEUI;
      return this.eventMotionDetected.emit(trackerEUI);
    });

    socket.on("ttnAddSucceeded", (ttnDevID: any) => {
      //Fire a local event that will be catch by UI
      return this.eventAdded.emit(ttnDevID);
    })

    socket.on("ttnAddFail", (error: any) => {
      //Fire a local event that will be catch by UI
      return this.eventFail.emit(error);
    })

    socket.on("ttnUpdateSucceeded", (ttnDevID: any) => {
      //Fire a local event that will be catch by UI
      return this.eventUpdated.emit(ttnDevID);
    });

    socket.on("ttnDeleteSucceeded", () => {
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
