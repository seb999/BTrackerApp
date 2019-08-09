import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { HelperService } from '../../service/helper.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tracker',
  templateUrl: 'tracker.page.html',
  styleUrls: ['tracker.page.scss'],
})
export class TrackerPage {
  authenticated: boolean;
  userToken: any;
  trackerList:Array<any>;

  constructor(private authService: AuthService,
    private helperService: HelperService,
    private http: HttpClient, ) {
  }

  ngOnInit() {
    this.authService.authObservable.subscribe((action) => {
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
    this.loadDeviceList();
  }

  loadDeviceList() {
    let url = this.helperService.urlBuilder("/api/Device/GetDeviceList/");

    this.http.get<any>(url, { headers: { Authorization: 'Bearer ' + this.userToken.accessToken } }).subscribe(data => {
      console.log(data);
      this.trackerList = data;
      // data.forEach(element => {
      //   var deviceStatus = this.deviceAlarmList.filter(p=>p.deviceEUI == element.deviceEUI).map(p=>p.deviceStatus)[0];
      //   deviceStatus = deviceStatus == undefined ? false : deviceStatus;
      //   this.deviceList.push({"deviceDisplay" : false, 
      //   "deviceDescription" : element.deviceDescription , 
      //   "deviceEUI" : element.deviceEUI, 
      //   "deviceStatus" : deviceStatus})
      // });

      // //select default one
      // this.selectedDevice = this.deviceList[0];
      // //this.showLastPosition(null, this.selectedDevice);

      // //start timer
      // if(this.subscription == undefined) this.startTimer();

    }, err => { });
  }
}
