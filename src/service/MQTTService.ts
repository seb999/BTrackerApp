import { Injectable } from '@angular/core';
import socketIOClient from "socket.io-client";

@Injectable({
    providedIn: 'root'
})

export class MQTTService {
    private loraMessageEndpoint: string = "http://127.0.0.1:4001";
    //private loraMessageEndpoint: string = "http://dspx.eu:1884";
    public socketIO : any;
    public client: socketIOClient;
 

    constructor() {
        console.log("initiate listener");
       // this.socketIO = this.client(this.loraMessageEndpoint);
        
    }

    openConnection(){
        this.socketIO = this.client(this.loraMessageEndpoint);
    }
}