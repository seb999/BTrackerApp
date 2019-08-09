import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../auth/auth.service';
import { IUserInfo } from '../auth/user-info.model';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { HelperService } from '../../service/helper.service';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { Storage } from '@ionic/storage';

import leaflet from 'leaflet';
import { antPath } from 'leaflet-ant-path';
import 'leaflet/dist/leaflet.css';
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
  @ViewChild('map',{static: true}) mapContainer: ElementRef;
  map: any;
  path : any;
  marker : any;
  markerStart : any;

  userInfo: IUserInfo;
  action: IAuthAction;
  authenticated: boolean;
  userToken: any;
  trackerList: Array<any> = [];
  trackerAlarmList: Array<any> = [];

  constructor(private navCtrl: NavController,
    private authService: AuthService,
    private helperService: HelperService,
    private http: HttpClient,
    public toastController: ToastController,
    private storage: Storage) {
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
    this.getDeviceStatus();
  }

  getDeviceStatus() {
    this.storage.get('alarmStatus').then((result) => {
      if (result != null) this.trackerAlarmList = result;
      this.initMap();
      this.loadDeviceList();
      
    });
  }

  loadDeviceList() {
    let url = this.helperService.urlBuilder("/api/Device/GetDeviceList/");
    this.http.get<any>(url, { headers: { Authorization: 'Bearer ' + this.userToken.accessToken } }).subscribe(data => {
      data.forEach(element => {
        var deviceStatus = this.trackerAlarmList.filter(p => p.deviceEUI == element.deviceEUI).map(p => p.deviceStatus)[0];
        deviceStatus = deviceStatus == undefined ? false : deviceStatus;
        
        this.trackerList.push({
          "deviceId": element.deviceId,
          "deviceDisplay": false,
          "deviceDescription": element.deviceDescription,
          "deviceEUI": element.deviceEUI,
          "deviceStatus": deviceStatus
        })
      });

      //select default one
      //this.selectedDevice = this.deviceList[0];
      //this.showLastPosition(null, this.selectedDevice);
    }, err => { });
  }

  initMap() {
    //Remove the map if we reload the page otherwise it crash the APP
    if(this.map) {
      this.map.remove();
    }

    this.map = leaflet.map("map").setView([51.505, -0.09], 13);
    leaflet.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attributions: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18
    }).addTo(this.map);
  }

  async showLastPosition(event, selectedTracker){
    this.trackerList.forEach(p=>p.deviceDisplay = false);
    selectedTracker.deviceDisplay = true;
   console.log(selectedTracker);
    //Load data from API
    //let url = this.helperService.urlBuilder("/api/Loc/AppGetGpsData/" + selectedTracker.deviceEUI + "/" + Math.round(this.cursor/5+1));
    let url = this.helperService.urlBuilder("/api/Loc/GetGpsData/" + selectedTracker.deviceId + "/10");

    this.http.get<any>(url, { headers: { Authorization: 'Bearer ' + this.userToken.accessToken } }).subscribe(data => {
      if(data.length==0) return;

       //remvove a path is already displayed on map
       if(this.path != undefined){
        this.path.remove();
      }

      if(this.marker != undefined){
        this.map.removeLayer(this.marker);
      }

      if(this.markerStart != undefined){
        this.map.removeLayer(this.markerStart);
      }

      let gpsLastPostionList = data;
      let latlngs = [];
      gpsLastPostionList.forEach(element => {
        latlngs.push([element.gpsPositionLatitude, element.gpsPositionLongitude])
      });
    
      // Add path on the map
      this.path = antPath(latlngs, {color:"#0000FF", dashArray:[10,20], pulseColor:"#FFFFFF", delay:400, paused:false, reverse:true, weight:5},);
      this.path.addTo(this.map);

      // zoom the map to the polyline
      this.map.fitBounds(this.path.getBounds());

      //Add pointer on start end end
      this.marker = leaflet.marker([gpsLastPostionList[gpsLastPostionList.length-1].gpsPositionLatitude, gpsLastPostionList[gpsLastPostionList.length-1].gpsPositionLongitude]).bindPopup("<b>" + selectedTracker.deviceDescription + "</b><br>" + gpsLastPostionList[0].gpsPositionDate).openPopup();
      this.marker.addTo(this.map);

      this.markerStart = leaflet.marker([gpsLastPostionList[0].gpsPositionLatitude, gpsLastPostionList[0].gpsPositionLongitude]).bindPopup("<b>" + selectedTracker.deviceDescription + "</b><br>" + gpsLastPostionList[0].gpsPositionDate).openPopup();
      this.markerStart.addTo(this.map);
     
    }, err => { });
  }


  saveAlarm(tracker){
    this.presentToast(tracker);
    this.storage.set("alarmStatus", this.trackerList);
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
