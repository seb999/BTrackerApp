import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavController} from '@ionic/angular';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { AuthService } from '../auth/auth.service';
import { IUserInfo } from '../auth/user-info.model';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { HelperService } from '../service/helper.service';
import { StorageService } from '../service/storage.service';
import { HttpClient } from '@angular/common/http';
import { HttpService, HttpSettings } from '../service/http.service';
import { Geolocation } from '@ionic-native/geolocation/ngx'
import { MqttService } from '../service/mqtt.service';
import { gpsPosition } from '../../class/gpsPosition';

declare var require: any;
import { Map, tileLayer, marker } from 'leaflet';
import { antPath } from 'leaflet-ant-path';
import 'leaflet/dist/leaflet.css';

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
  loading: any;

  constructor(private navCtrl: NavController,
    private authService: AuthService,
    private helperService: HelperService,
    //private storageService: StorageService,
    private httpService: HttpService,
    private http: HttpClient,
    private backgroundMode: BackgroundMode,
    private mqttService: MqttService,
    private geoLocation: Geolocation,
  ) {

    //this.backgroundMode.enable();
  }

  ngOnInit() {
    this.helperService.presentLoader();
    this.authService.authObservable.subscribe((action) => {
      this.action = action;
      if (action.action === AuthActions.SignInSuccess || action.action === AuthActions.AutoSignInSuccess) {
        {
          console.log("authenticated");
          this.authenticated = true;
          this.continue();
        }
      } else {
        this.authenticated = false;
        this.authService.signIn();
      }
    });
  }

 

  async continue(): Promise<void> {
    this.userToken = await this.authService.getValidToken();
    this.initMap();
    this.subscribeMQTTService();
    this.validateLocalUserId();
    this.trackerList = await this.loadTrackerList();
    this.displayAlarm(this.mqttService.alarmTrackerEUI); //we read from mqtt if an alarm as been fired and we come after to the page
    this.helperService.dismissLoader();
  }

  async validateLocalUserId() {
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/user/CheckUserId/").toLowerCase(),
    };
    return await this.httpService.xhr(httpSetting);
  }

  async loadTrackerList(): Promise<Array<any>> {
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Tracker/GetTrackerList/").toLowerCase(),
    };
    return await this.httpService.xhr(httpSetting);
  }

  subscribeMQTTService() {
    //All done in mqttService injected in constructor
    //1 - Subsribe to onMotion event
    this.mqttService.onMotion().subscribe(TracketEUI => this.displayAlarm(TracketEUI));
    //2 - Start to listen MQTT events
    //this.mqttService.openListener();
  }

  displayAlarm(trackerEUI: string) {
    console.log(this.trackerList);
    if (trackerEUI == undefined) return;
    for (let index = 0; index < this.trackerList.length; index++) {
      if (this.trackerList[index].deviceIsAlarmOn && this.trackerList[index].deviceEUI == trackerEUI) {
        this.trackerList[index].alert = "Alarm";
      }
    }
  }

  async getCurrentPosition(): Promise<gpsPosition> {
    var resp = await this.geoLocation.getCurrentPosition();
    const position: gpsPosition = { "latitude": resp.coords.latitude, "longitude": resp.coords.longitude };
    return position;
  }

   initMap() {
    //Remove the map if we reload the page otherwise it crash the APP
    if (this.map) {
      this.map.remove();
    }

    //Get user current position and center map here
    this.getCurrentPosition().then((gpsPosition) => {
      this.map = new Map("map").setView([gpsPosition.latitude, gpsPosition.longitude], 13);
      this.markerStart = marker([gpsPosition.latitude, gpsPosition.longitude]).bindPopup("<b>" + "Current position" + "</b>").openPopup();
      this.markerStart.addTo(this.map);
    }).catch(() => {
      this.map = new Map("map").setView([51.505, -0.09], 13);
      this.markerStart = marker([51.505, -0.09]).bindPopup("<b>" + "Current position" + "</b><br>No GSP signal").openPopup();
      this.markerStart.addTo(this.map);
    }).finally(() => {
      tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18
      }).addTo(this.map);
    })
   
  }

  async showLastPosition(event, selectedTracker) {
    this.trackerList.forEach(p => p.isDisplayOnMap = false);
    selectedTracker.isDisplayOnMap = true;

    //Load data from API
    //let url = this.helperService.urlBuilder("/api/Loc/AppGetGpsData/" + selectedTracker.deviceEUI + "/" + Math.round(this.cursor/5+1));
    let url = this.helperService.urlBuilder("/api/Gps/GetGpsData/" + selectedTracker.deviceId + "/10").toLowerCase();

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
      this.marker = marker([gpsLastPostionList[gpsLastPostionList.length - 1].gpsPositionLatitude, gpsLastPostionList[gpsLastPostionList.length - 1].gpsPositionLongitude]).bindPopup("<b>" + selectedTracker.deviceDescription + "</b><br>" + gpsLastPostionList[0].gpsPositionDate).openPopup();
      this.marker.addTo(this.map);

      this.markerStart = marker([gpsLastPostionList[0].gpsPositionLatitude, gpsLastPostionList[0].gpsPositionLongitude]).bindPopup("<b>" + selectedTracker.deviceDescription + "</b><br>" + gpsLastPostionList[0].gpsPositionDate).openPopup();
      this.markerStart.addTo(this.map);

    }, err => { });
  }

  async navGpsPage(event, selectedTracker) {
    this.navCtrl.navigateForward(('/gps/' + selectedTracker.deviceId).toLowerCase());
  }

  //Update alarm stracker
  saveAlarm(tracker) {
    console.log(tracker);
    tracker.alert = "";
    this.mqttService.alarmTrackerEUI = "";
    this.helperService.presentToast(tracker);

    //Call backend and update alarm status
    const httpSetting: HttpSettings = {
      method: "POST",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Tracker/UpdateTracker/").toLowerCase(),
      data: tracker,
    };
    return this.httpService.xhr(httpSetting);
  }
}
