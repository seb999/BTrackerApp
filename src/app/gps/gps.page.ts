import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { HttpClient } from '@angular/common/http';
import { HttpService, HttpSettings } from '../service/http.service';
import { HelperService } from '../service/helper.service';

@Component({
  selector: 'app-gps',
  templateUrl: './gps.page.html',
  styleUrls: ['./gps.page.scss'],
})
export class GpsPage implements OnInit {
  action: IAuthAction;
  authenticated: boolean;
  gpsList: Array<any> = [];
  userToken: any;

  constructor( private navCtrl: NavController,
    private helperService: HelperService,
    private route :ActivatedRoute,
    private authService: AuthService,
    private httpService: HttpService,
    private http: HttpClient) { 

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
        this.authService.signIn();
      }
    });
  }

  async continue(): Promise<void> {
    this.userToken = await this.authService.getValidToken();
    this.gpsList = await this.loadGpsList();
    console.log(this.gpsList);
  }

  async loadGpsList(): Promise<Array<any>> {
    let deviceId = this.route.snapshot.paramMap.get('deviceId');
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Loc/GetGpsData/" + deviceId + "/100"),
    };
    return await this.httpService.xhr(httpSetting);
  }

  async deleteGps(event, gpsData) {
    const httpSetting: HttpSettings = {
      method: "GET",
      headers: { Authorization: 'Bearer ' + this.userToken.accessToken },
      url: this.helperService.urlBuilder("/api/Loc/DeleteData/" + gpsData.gpsPositionId),
    };
    return await this.httpService.xhr(httpSetting);
    //this.loadGpsList();
  }

  
}
