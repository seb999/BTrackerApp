export interface Device {
    deviceId? : number;
    deviceEUI? : string;
    deviceDescription? : string;
    userId? : string;
    deviceIsAlarmOn : boolean;
    deviceTel? : string;
    dateAdded? : Date;
    ttnDevID? : string;
}