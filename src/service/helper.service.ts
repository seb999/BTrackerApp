import { Injectable, } from '@angular/core';
import { Storage } from '@ionic/storage';
import { AlertController, Platform } from '@ionic/angular';

@Injectable()

export class HelperService {
    private isApp: boolean;
    baseUrl: string = "";

    // public result : any;
    constructor(private storage: Storage, public alertCtrl: AlertController, private platform: Platform) {
    }

    private onDevice(): boolean {
        return this.platform.is('cordova');
      }

    //Return current date method
    getCurrentDate(): string {
        let currentDate = new Date();
        console.log(new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)));
        return new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString().split('.')[0];
    }

    //Return URL from API method to access depend on running on device or runing on browser
    urlBuilder(path: string): string {
        const baseUrl = this.onDevice() ? 'http://dspx.eu/btrackerweb' : 'https://localhost:5001';
        return baseUrl + path;
    }

    resetStorage() {
        this.storage.remove("AlarmStatus");
    }

    popup(myTitle: string, mySubTitle: string) {
        let alert = this.alertCtrl.create({
            //title: myTitle,
            //subTitle: mySubTitle,
            buttons: [{
                text: 'OK', role: 'cancel',
                handler: () => {
                    // this.alertClosed = true;  
                }
            }]
        });

       // alert..present();
    }
}