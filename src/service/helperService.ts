import { Injectable, } from '@angular/core';
import { Storage } from '@ionic/storage';
import { ToastController, Platform } from '@ionic/angular';

@Injectable()

export class HelperService {
    baseUrl: string = "";

    // public result : any;
    constructor(private storage: Storage, public toast: ToastController, private platform: Platform) {
    }

    public onDevice(): boolean {
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
      // const baseUrl = this.onDevice() ? 'http://dspx.eu' : 'http://localhost:5222';
       const baseUrl = this.onDevice() ? 'http://dspx.eu' : 'http://dspx.eu';
        return baseUrl + path;
    }

    async presentToast(tracker) {
        var status = tracker.status ? "On" : "Off";
        const toast = await this.toast.create({
          message: "Tracker: " + tracker.deviceDescription + ' Alarm ' + status,
          duration: 2000
        });
        toast.present();
      }
}