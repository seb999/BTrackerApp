import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../auth/auth.service';
import { AuthActions } from 'ionic-appauth';
import { HelperService } from '../service/helper.service';
import { HttpService, HttpSettings } from '../service/http.service';
import { MqttService } from '../service/mqtt.service';
import { Device } from '../../class/device';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-tracker',
  templateUrl: 'tracker.page.html',
  styleUrls: ['tracker.page.scss'],
})
export class TrackerPage {
  authenticated: boolean;
  userToken: any;
  trackerList: Array<any>;
  selectedDevice: Device = { "deviceDescription": "", deviceIsAlarmOn : false };
  onTrackerAdded: any;

  constructor(private authService: AuthService,
    private helperService: HelperService,
    private httpService: HttpService,
    private mqttService: MqttService,
    public alertController: AlertController,
    public toast: ToastController,
  ) {
  }

  ngOnInit() {
    this.authService.authObservable.subscribe((action) => {
      if (action.action === AuthActions.SignInSuccess || action.action === AuthActions.AutoSignInSuccess) {
        {
          this.helperService.presentLoader();
          this.authenticated = true;
          this.continue();
        }
      } else {
        this.authenticated = false;
        this.authService.signIn();
      }
    });
  }

  public async continue(): Promise<void> {
    this.userToken = await this.authService.getValidToken();
    this.trackerList = await this.loadTrackerList();
    this.subscribeMQTTService();
    this.helperService.dismissLoader();
  }

  async loadTrackerList(): Promise<Array<any>> {
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/tracker/gettrackerlist/"),
    };
    return await this.httpService.xhr(httpSetting);
  }

  subscribeMQTTService() {
    //On new device saved in TTN do that
    this.mqttService.onAdded().subscribe(ttnDevID => {
      console.log("save to db new tracker");
      this.dbSaveTracker(ttnDevID);
      this.presentToast("saved!");
    });

    this.mqttService.onAddedFail().subscribe(error => {
      console.log(error);
      this.presentToast("Illegal ID");
    });

    //On device deleted from TTN do that
    this.mqttService.onDeleted().subscribe(() => {
      this.dbDeleteTracker(this.selectedDevice.deviceId);
      this.presentToast("deleted!")
    });

     //On device updated from TTN do that
     this.mqttService.onUpdated().subscribe(() => {
      this.dbUpdateTracker();
      this.presentToast("Updated!")
    });

    //Start to listen MQTT events
    //this.mqttService.openListener();
  }

  async ttnSaveTracker() {
    //Save to MQTT
    if (!this.selectedDevice.ttnDevID) {
      this.helperService.presentLoader();
      this.mqttService.addTracker(this.selectedDevice.deviceEUI, this.selectedDevice.deviceDescription)
    }
    else {
      this.helperService.presentLoader();
      this.mqttService.updateTracker(this.selectedDevice.deviceEUI, this.selectedDevice.deviceDescription, this.selectedDevice.ttnDevID)
    }
  }

  async ttnDeleteTracker() {
    this.helperService.presentLoader();
    const alert = await this.alertController.create({
      header: 'Warning',
      message: 'Do you really want to delete this tracker ?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('Confirm Cancel: blah');
          }
        }, {
          text: 'Okay',
          handler: () => {
            //Delete to MQTT
            this.mqttService.deleteTracker(this.selectedDevice.ttnDevID);
          }
        }
      ]
    });

    await alert.present();
  }

  async dbSaveTracker(ttnDevID: any) {
    this.selectedDevice.ttnDevID = ttnDevID;
    //Save to db
    const httpSetting: HttpSettings = {
      method: "POST",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Tracker/SaveTracker/"),
      data: this.selectedDevice,
    };
    return await this.httpService.xhr(httpSetting);
  }

  async dbDeleteTracker(ttnDevID: any) {
    //delete to db
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Tracker/DeleteTracker/" + ttnDevID)
    };
    return await this.httpService.xhr(httpSetting);
  }

  async dbUpdateTracker() {
    //Save to db
    const httpSetting: HttpSettings = {
      method: "POST",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Tracker/UpdateTracker/"),
      data: this.selectedDevice,
    };
    return await this.httpService.xhr(httpSetting);
  }

  showDevice(device) {
    this.selectedDevice = device;
  }

  clearEntry() {
    this.selectedDevice = { "deviceDescription": "", "deviceEUI": "", 'deviceIsAlarmOn': false  };
  }

  async presentToast(message) {
    const toast = await this.toast.create({
      message: "Tracker " + message,
      duration: 4000
    });
    await toast.present();
    let result = await toast.onDidDismiss();
    this.trackerList = await this.loadTrackerList();
  }
}