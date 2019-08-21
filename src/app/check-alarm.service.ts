import { Injectable } from '@angular/core';
import { HttpSettings } from 'src/service/httpSetting';
import { HttpService } from 'src/service/httpService';
import { HelperService } from '../service/helperService';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class CheckAlarmService {
  timer3 : any;
  counter : number =0;
  alertClosed: boolean = true;

  constructor(
    private httpService: HttpService,
    private helperService: HelperService,
    private localNotifications: LocalNotifications,
    public alertCtrl: AlertController,
  ) { }

  startTimer(trackerList){
    if(this.timer3==undefined){
    this.timer3 = setInterval(() => {
      this.checkMotion(trackerList);
     this.counter++;
     },10000);
    }
  }

  stopTimer(){
    clearInterval(this.timer3);
    this.timer3=undefined;
  }

  async checkMotion(trackerList) {
    for (let index = 0; index < trackerList.length; index++) {
      if (trackerList[index].status) {
        let isMotionDetected = await this.getMotion(trackerList[index].deviceEUI);
        if (isMotionDetected && this.alertClosed) {
          trackerList[index].alert = "Alarm";
          this.showAlert(trackerList[index].deviceDescription);
        }
      }
    }
  }

  async getMotion(trackerEUI): Promise<boolean> {
    const httpSetting: HttpSettings = {
      method: "GET",
      //headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/loc/getMotion/" + trackerEUI + "/" + this.helperService.getCurrentDate()),
    };
    return await this.httpService.xhr(httpSetting);
  }

  async showAlert(trackerDescription: string) {
    if (this.helperService.onDevice()) {
      //Push notification on device
      this.localNotifications.schedule({
        id: 1,
        text: 'PUSH : BTracker Warning!',
        sound: 'file://sound.mp3',
        data: { secret: 999 }
      });
    }
    else {
      //alert popup on browser
      if (!this.alertClosed) return;
      this.alertClosed = false;
      const alert = await this.alertCtrl.create({
        header: 'BTracker Warning!',
        subHeader: 'Motion detected on tracker: ',
        message: trackerDescription,
        buttons: [{
          text: 'OK', role: 'cancel',
          handler: () => {
            this.alertClosed = true;
          }
        }]
      });
      await alert.present();
    }
  }
}
