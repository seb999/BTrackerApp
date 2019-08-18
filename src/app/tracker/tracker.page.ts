import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { HelperService } from '../../service/helperService';
import { HttpSettings } from 'src/service/httpSetting';
import { HttpService } from 'src/service/httpService';

@Component({
  selector: 'app-tracker',
  templateUrl: 'tracker.page.html',
  styleUrls: ['tracker.page.scss'],
})
export class TrackerPage {
  authenticated: boolean;
  userToken: any;
  trackerList:Array<any>;
  selectedDevice : any = {"deviceDescription" : ""};

  constructor(private authService: AuthService,
    private helperService: HelperService,
    private httpService: HttpService, ) {
  }

  ngOnInit() {
    this.authService.authObservable.subscribe((action) => {
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

  public async continue(): Promise<void> {
    this.userToken = await this.authService.getValidToken();
    this.trackerList = await this.loadTrackerList();
  }

  showDevice(device){
    this.selectedDevice = device;
  }

  async loadTrackerList(): Promise<Array<any>> {
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Device/GetDeviceList/"),
    };
    return await this.httpService.xhr(httpSetting);
  }

  addMode(){
    this.selectedDevice = {"deviceDescription" : "", "deviceEUI" : ""};
  }

  async saveTracker(){
    this.selectedDevice = {"deviceDescription" : "", "deviceEUI" : ""};

    const httpSetting: HttpSettings = {
      method: "POST",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Device/SaveDevice/"),
      data: this.selectedDevice,
    };
    return await this.httpService.xhr(httpSetting);


  }

  cancelEditMode(){
    this.selectedDevice = {"deviceDescription" : "", "deviceEUI" : ""};
  }
}
