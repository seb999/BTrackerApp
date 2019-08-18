import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

import { AuthService } from '../auth/auth.service';
import { IUserInfo } from '../auth/user-info.model';
import { AuthActions, IAuthAction } from 'ionic-appauth';

import { HelperService } from '../../service/helperService';
import { StorageService } from '../../service/storageService';
import { HttpService } from '../../service/httpService';


declare var require: any;
import leaflet from 'leaflet';
import { antPath } from 'leaflet-ant-path';
import 'leaflet/dist/leaflet.css';
import { timer } from 'rxjs';
import { HttpSettings } from 'src/service/httpSetting';
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
  map: any; path: any; marker: any; markerStart: any;
  userInfo: IUserInfo;
  action: IAuthAction;
  authenticated: boolean;
  userToken: any;
  trackerList: Array<any> = [];
  trackerAlarmList: Array<any> = [];
  timer: any;
  timerSubscriber: any;
  alertClosed: boolean = true;

  constructor(private navCtrl: NavController,
    private authService: AuthService,
    private localNotifications: LocalNotifications,
    public alertCtrl: AlertController,
    private helperService: HelperService,
    private storageService: StorageService,
    private httpService: HttpService,
    private http: HttpClient,
    private backgroundMode: BackgroundMode) {

    this.backgroundMode.enable();
    this.timer = timer(2000, 15000);
  }

  ngOnInit() {
    console.log("init");
    this.authService.authObservable.subscribe((action) => {
      this.action = action;
      if (action.action === AuthActions.SignInSuccess || action.action === AuthActions.AuthSignInSuccess) {
        {
          this.authenticated = true;
          this.continue();
        }
      } else {
        this.authenticated = false;
        this.authService.signIn().catch(error => console.error(`Sign in error: ${error}`));
      }
    });
  }

  async continue(): Promise<void> {
    this.userToken = await this.authService.getValidToken();
    this.initMap();
    this.validateLocalUserId();
    this.trackerList = await this.loadTrackerList();
    this.trackerAlarmList = await this.storageService.getItem<Array<any>>("alarmStatus");
    this.initAlarm(this.trackerList, this.trackerAlarmList);
    this.alarmOnOff()
  }

  async validateLocalUserId() {
    let url = this.helperService.urlBuilder("/api/user/CheckLocalUserId/");
    await this.http.get<any>(url, { headers: { Authorization: 'Bearer ' + this.userToken.accessToken } }).subscribe(data => {
    }, err => { });
  }

  async loadTrackerList(): Promise<Array<any>> {
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Device/GetDeviceList/"),
    };
    return await this.httpService.xhr(httpSetting);
  }

  async initAlarm(trackerList, trackerAlarmList) {
    if (trackerAlarmList == null) {
      this.trackerList.forEach(tracker => { tracker.status = false; });
    }
    else {
      this.trackerList.forEach((tracker, index) => {
        tracker.status = this.trackerAlarmList[index].status;
      });
    }
  }

  alarmOnOff() {
    //if there is one alarm true then we start timer otherwise we stop it
    let isOneAlarmOn: boolean = false;
    this.trackerList.forEach((tracker, index) => {
      if (tracker.status) {
        isOneAlarmOn = true;
      }
    })

    if (isOneAlarmOn) {
      this.timerSubscriber = this.timer.subscribe(() => {
        this.checkMotion();
      });
    }
    else {
      if (this.timerSubscriber != undefined) this.timerSubscriber.unsubscribe();
    }
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
    this.trackerList.forEach(p => p.isDisplayOnMap = false);
    selectedTracker.isDisplayOnMap = true;

    //Load data from API
    //let url = this.helperService.urlBuilder("/api/Loc/AppGetGpsData/" + selectedTracker.deviceEUI + "/" + Math.round(this.cursor/5+1));
    let url = this.helperService.urlBuilder("/api/Loc/GetGpsData/" + selectedTracker.deviceId + "/10");

    this.http.get<any>(url, { headers: { Authorization: 'Bearer ' + this.userToken.accessToken } }).subscribe(data => {

      if (this.path != undefined) {
        this.path.remove();
      }

      if (this.marker != undefined) {
        this.map.removeLayer(this.marker);
      }

      if (this.markerStart != undefined) {
        this.map.removeLayer(this.markerStart);
      }

      if (data.length == 0) return;

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

      //Add pointer on start and end
      this.marker = leaflet.marker([gpsLastPostionList[gpsLastPostionList.length - 1].gpsPositionLatitude, gpsLastPostionList[gpsLastPostionList.length - 1].gpsPositionLongitude]).bindPopup("<b>" + selectedTracker.deviceDescription + "</b><br>" + gpsLastPostionList[0].gpsPositionDate).openPopup();
      this.marker.addTo(this.map);

      this.markerStart = leaflet.marker([gpsLastPostionList[0].gpsPositionLatitude, gpsLastPostionList[0].gpsPositionLongitude]).bindPopup("<b>" + selectedTracker.deviceDescription + "</b><br>" + gpsLastPostionList[0].gpsPositionDate).openPopup();
      this.markerStart.addTo(this.map);

    }, err => { });
  }

  saveAlarm(tracker) {
    tracker.alert = "";
    this.helperService.presentToast(tracker);
    this.storageService.setItem<Array<any>>("alarmStatus", this.trackerList);
    this.alarmOnOff();
  }

  async checkMotion() {
    for (let index = 0; index < this.trackerList.length; index++) {
      if (this.trackerList[index].status) {
        let isMotionDetected = await this.getMotion(this.trackerList[index].deviceEUI);
        if (isMotionDetected && this.alertClosed) {
          this.trackerList[index].alert = "Alarm";
          this.showAlert(this.trackerList[index].deviceDescription);
        }
      }
    }
  }

  async getMotion(trackerEUI): Promise<boolean> {
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
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
