import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { AuthService } from '../auth/auth.service';
import { IUserInfo } from '../auth/user-info.model';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { HelperService } from '../../service/helper.service';
import { HttpClient } from '@angular/common/http';
import { ToastController, Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';

declare var require: any;
import leaflet from 'leaflet';
import { antPath } from 'leaflet-ant-path';
import 'leaflet/dist/leaflet.css';
import { timer } from 'rxjs';
delete leaflet.Icon.Default.prototype._getIconUrl;
leaflet.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
}); //There is a bug for marker icon and webpack so the workarround is this


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  @ViewChild('map', { static: true }) mapContainer: ElementRef;
  map: any;
  path: any;
  marker: any;
  markerStart: any;
  userInfo: IUserInfo;
  action: IAuthAction;
  authenticated: boolean;
  userToken: any;
  trackerList: Array<any> = [];
  trackerAlarmList: Array<any> = [];
  timerSubscription: any;
  timerInterval: any;
  alertClosed: boolean = true;

  constructor(private navCtrl: NavController,
    private authService: AuthService,
    private platform: Platform,
    private localNotifications: LocalNotifications,
    public alertCtrl: AlertController,
    private helperService: HelperService,
    private http: HttpClient,
    public toastController: ToastController,
    private storage: Storage) {
  }

  private onDevice(): boolean {
    return this.platform.is('cordova');
  }

  ngOnInit() {
    this.authService.authObservable.subscribe((action) => {
      this.action = action;
      if (action.action === AuthActions.SignInSuccess || action.action === AuthActions.AuthSignInSuccess) {
        {
          this.authenticated = true;
          this.getUserTokenAndLoadData();
        }
      } else {
        this.authenticated = false;
        this.authService.signIn().catch(error => console.error(`Sign in error: ${error}`));
      }
    });
  }

  public async getUserTokenAndLoadData(): Promise<void> {
    this.userToken = await this.authService.getValidToken();
    this.validateLocalUserId();
    this.initMap();
    this.loadDeviceList();
  }

  validateLocalUserId() {
    let url = this.helperService.urlBuilder("/api/user/CheckLocalUserId/");
    this.http.get<any>(url, { headers: { Authorization: 'Bearer ' + this.userToken.accessToken } }).subscribe(data => {
    }, err => { });
  }

  loadDeviceList() {
    //We load the Alarm status in the storage
    this.storage.get('alarmStatus').then((result) => {
      //We save it in a variable
      if (result != null) this.trackerAlarmList = result;

      //We load the list of Device
      let url = this.helperService.urlBuilder("/api/Device/GetDeviceList/");
      this.http.get<any>(url, { headers: { Authorization: 'Bearer ' + this.userToken.accessToken } }).subscribe(data => {

        data.forEach(element => {
          var status = this.trackerAlarmList.filter(p => p.deviceEUI == element.deviceEUI).map(p => p.deviceStatus)[0];
          status = status == undefined ? false : status;

          this.trackerList.push({
            "id": element.deviceId,
            "isDisplayOnMap": false,
            "description": element.deviceDescription,
            "EUI": element.deviceEUI,
            "status": status
          })

        });

        //start timer
        if (this.timerSubscription == undefined) this.startTimer();

      });
    })
  };

  initMap() {
    //Remove the map if we reload the page otherwise it crash the APP
    if (this.map) {
      this.map.remove();
    }

    this.map = leaflet.map("map").setView([51.505, -0.09], 13);
    leaflet.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attributions: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18
    }).addTo(this.map);
  }

  async showLastPosition(event, selectedTracker) {
    this.trackerList.forEach(p => p.deviceDisplay = false);
    selectedTracker.deviceDisplay = true;
    console.log(selectedTracker);
    //Load data from API
    //let url = this.helperService.urlBuilder("/api/Loc/AppGetGpsData/" + selectedTracker.deviceEUI + "/" + Math.round(this.cursor/5+1));
    let url = this.helperService.urlBuilder("/api/Loc/GetGpsData/" + selectedTracker.deviceId + "/10");

    this.http.get<any>(url, { headers: { Authorization: 'Bearer ' + this.userToken.accessToken } }).subscribe(data => {
      if (data.length == 0) return;

      //remvove a path is already displayed on map
      if (this.path != undefined) {
        this.path.remove();
      }

      if (this.marker != undefined) {
        this.map.removeLayer(this.marker);
      }

      if (this.markerStart != undefined) {
        this.map.removeLayer(this.markerStart);
      }

      let gpsLastPostionList = data;
      let latlngs = [];
      gpsLastPostionList.forEach(element => {
        latlngs.push([element.gpsPositionLatitude, element.gpsPositionLongitude])
      });

      // Add path on the map
      this.path = antPath(latlngs, { color: "#0000FF", dashArray: [10, 20], pulseColor: "#FFFFFF", delay: 400, paused: false, reverse: true, weight: 5 });
      this.path.addTo(this.map);

      // zoom the map to the polyline
      this.map.fitBounds(this.path.getBounds());

      //Add pointer on start end end
      this.marker = leaflet.marker([gpsLastPostionList[gpsLastPostionList.length - 1].gpsPositionLatitude, gpsLastPostionList[gpsLastPostionList.length - 1].gpsPositionLongitude]).bindPopup("<b>" + selectedTracker.deviceDescription + "</b><br>" + gpsLastPostionList[0].gpsPositionDate).openPopup();
      this.marker.addTo(this.map);

      this.markerStart = leaflet.marker([gpsLastPostionList[0].gpsPositionLatitude, gpsLastPostionList[0].gpsPositionLongitude]).bindPopup("<b>" + selectedTracker.deviceDescription + "</b><br>" + gpsLastPostionList[0].gpsPositionDate).openPopup();
      this.markerStart.addTo(this.map);

    }, err => { });
  }

  saveAlarm(tracker) {
    this.presentToast(tracker);
    this.storage.set("alarmStatus", this.trackerList);
  }

  startTimer() {
    this.timerInterval = timer(300, 10000);
    this.timerSubscription = this.timerInterval.subscribe(() => {
      this.checkMotion();
    });
  }

  checkMotion() {
    console.log("top");
    this.showAlert("device1");
    // this.trackerList.forEach(tracker => {
    //   if (tracker.deviceStatus) {

    //     let url = this.helperService.urlBuilder("/api/loc/getMotion/" + element.deviceEUI + "/" + this.helperService.getCurrentDate());

    //     this.http.get(url).subscribe(data => {
    //       //as it is asynchrone if user stop alarm
    //       if (element.deviceStatus) {
    //         if (data == true && this.alertClosed) {
    //           //for debugging(Push notification only available on device)
    //           this.showAlert('BTracker Alert!', 'Something is happening!');
    //           this.pushNotification();
    //         }
    //       }
    //     });
    //   }
    // });
  }

  async showAlert(trackerDescription: string) {
    if (this.onDevice()) {
      //Push notification on device
      this.localNotifications.schedule({
        id: 1,
        text: 'BTracker Warning!',
        sound: 'file://sound.mp3',
        data: { secret: 999 }
      });
      // this.localNotifications.isPresent(1);
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

  async presentToast(tracker) {
    var status = tracker.deviceStatus ? "On" : "Off";
    const toast = await this.toastController.create({
      message: tracker.deviceDescription + ' Alarm ' + status,
      duration: 2000
    });
    toast.present();
  }
}
