import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { AuthService } from '../auth/auth.service';
import { IUserInfo } from '../auth/user-info.model';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { HelperService } from '../service/helper.service';
import { StorageService } from '../service/storage.service';
import { HttpClient } from '@angular/common/http';
import { HttpService, HttpSettings } from '../service/http.service';

//import socketIOClient from "socket.io-client";
import { MqttService } from '../service/mqtt.service';

declare var require: any;
import leaflet from 'leaflet';
import { antPath } from 'leaflet-ant-path';
import 'leaflet/dist/leaflet.css';
import { AlarmService } from '../service/alarm.service';
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
  onMotionDelegate: any;

  constructor(private navCtrl: NavController,
    private authService: AuthService,
    private helperService: HelperService,
    //private storageService: StorageService,
    private httpService: HttpService,
    private http: HttpClient,
    private backgroundMode: BackgroundMode,
    private checkAlarmService: AlarmService,
    private mqttService: MqttService
  ) {

    //this.backgroundMode.enable();
  }

  ngOnInit() {
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

  ngOnDestroy() {
    this.onMotionDelegate.unsubscribe();
    //Maybe you can call disconnect method from MQTT here ?
  }

  async continue(): Promise<void> {
    this.userToken = await this.authService.getValidToken();
    this.initMap();
    this.initLoraListener();
    this.validateLocalUserId();
    this.trackerList = await this.loadTrackerList();
  }

  async validateLocalUserId() {
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/user/CheckUserId/"),
    };
    return await this.httpService.xhr(httpSetting);
  }

  async loadTrackerList(): Promise<Array<any>> {
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Device/GetDeviceList/"),
    };
    return await this.httpService.xhr(httpSetting);
  }

  initLoraListener() {
    //All done in mqttService injected in constructor
    //1 - Subsribe to onMotion event
    this.onMotionDelegate = this.mqttService.onMotion().subscribe(TracketEUI => this.checkAlarm(TracketEUI));
    //2 - Start to listen MQTT events
    this.mqttService.openListener();
  }

  checkAlarm(trackerEUI: string) {
    this.checkAlarmService.checkAlert(this.trackerList, trackerEUI);
  }

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

  async navGpsPage(event, selectedTracker) {
    this.navCtrl.navigateForward('/gps/' + selectedTracker.deviceId);
  }

  //Update alarm stracker
  saveAlarm(tracker) {
    tracker.alert = "";
    this.helperService.presentToast(tracker);

    //Call backend and update alarm status
    const httpSetting: HttpSettings = {
      method: "POST",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Device/UpdateDevice/"),
      data: tracker,
    };
    return this.httpService.xhr(httpSetting);
  }
}
