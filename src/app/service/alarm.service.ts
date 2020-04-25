import { Injectable } from '@angular/core';
import { HelperService } from '../service/helper.service';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { AlertController } from '@ionic/angular';
import { HttpService, HttpSettings } from '../service/http.service';
import { AuthService } from '../auth/auth.service';
import { StorageService } from '../service/storage.service';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AlarmService {
  private alertClosed: boolean = true;
  private userToken: any;
  public trackerList: Array<any> = [];

  constructor(
    private platform: Platform,
    private backgroundMode: BackgroundMode,
    private authService: AuthService,
    private helperService: HelperService,
    private localNotifications: LocalNotifications,
    public alertCtrl: AlertController,
    private httpService: HttpService,
    private storageService: StorageService
  ) {
    this.continue();
  }

  async continue(): Promise<void> {
    //Get token from local storage
    this.userToken = this.storageService.getItem<any>("userToken");
    this.trackerList = await this.loadTrackerList();
  }

  async loadTrackerList(): Promise<Array<any>> {
    this.userToken = await this.authService.getValidToken();

    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Tracker/GetTrackerList/").toLowerCase(),
    };
    return await this.httpService.xhr(httpSetting);
  }

  checkAlert(trackerEUI) {
    for (let index = 0; index < this.trackerList.length; index++) {
      if (this.trackerList[index].deviceIsAlarmOn && this.trackerList[index].deviceEUI == trackerEUI) {
        this.showAlert(this.trackerList[index].deviceDescription);
        this.trackerList[index].alert = "Alarm";
      }
    }
  }

  async showAlert(trackerDescription: string) {
    if (this.helperService.onDevice()) {
      //Push notification on device
      this.localNotifications.schedule({
        id: 1,
        text: 'PUSH : BTracker Warning!',
        sound: 'file://ressources/sounds/notification.ogg',
        data: { secret: 999 }
      });
    }

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