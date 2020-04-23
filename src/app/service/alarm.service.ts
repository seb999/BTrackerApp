import { Injectable } from '@angular/core';
import { HelperService } from '../service/helper.service';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { AlertController } from '@ionic/angular';
import { HttpService, HttpSettings } from '../service/http.service';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AlarmService {
  private counter: number = 0;
  private alertClosed: boolean = true;
  private userToken: any;
  public trackerList: Array<any> = [];


  constructor(
    private authService: AuthService,
    private helperService: HelperService,
    private localNotifications: LocalNotifications,
    public alertCtrl: AlertController,
    private httpService: HttpService,
  ) {
    this.checkAuthentication();
  }

  checkAuthentication() {
    this.authService.authObservable.subscribe((action) => {
      if (action.action === AuthActions.SignInSuccess || action.action === AuthActions.AutoSignInSuccess) {
        {
          this.continue();
        }
      } else {
        this.authService.signIn();
      }
    });
  }

  async continue(): Promise<void> {
    this.userToken = await this.authService.getValidToken();
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
      }
    }
  }

  async showAlert(trackerDescription: string) {
    console.log("ring the bell");
    if (this.helperService.onDevice()) {
      //Push notification on device
      this.localNotifications.schedule({
        id: 1,
        text: 'PUSH : BTracker Warning!',
        sound: 'file://ressources/sounds/notification.ogg', 
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
