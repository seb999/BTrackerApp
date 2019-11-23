import { Injectable } from '@angular/core';
import { HelperService } from '../service/helper.service';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AlarmService {
  counter: number = 0;
  alertClosed: boolean = true;

  constructor(
    private helperService: HelperService,
    private localNotifications: LocalNotifications,
    public alertCtrl: AlertController,
  ) {

  }

  checkAlert(trackerList, trackerEUI) {
    for (let index = 0; index < trackerList.length; index++) {
      if (trackerList[index].deviceIsAlarmOn && trackerList[index].deviceEUI == trackerEUI) {
        trackerList[index].alert = "Alarm";
        this.showAlert(trackerList[index].deviceDescription);
      }
    }
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
