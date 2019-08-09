import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AuthService } from './auth/auth.service';
import { IUserInfo } from './auth/user-info.model';
import { AuthActions, IAuthAction } from 'ionic-appauth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  public userInfo: IUserInfo;
  public authenticated: boolean;
  public appPages = [
    {
      title: 'Localisation',
      url: '/home',
      icon: 'ios-navigate'
    },
    {
      title: 'Register tracker',
      url: '/tracker',
      icon: 'ios-settings'
    },
  ];

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private authService: AuthService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.authService.startUpAsync();
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.getToken();
    });
  }

  signOut() {
    this.authService.signOut();
  }

  getToken() {
    this.authService.authObservable.subscribe((action) => {
      if (action.action === AuthActions.SignInSuccess || action.action === AuthActions.AuthSignInSuccess) {
        {
          this.authenticated = true;
          this.getUserInfo();
        }
      } else if (action.action === AuthActions.SignOutSuccess) {
        this.authenticated = false;
      }
    });
}

  public async getUserInfo(): Promise<void> {
    this.userInfo = await this.authService.getUserInfo<IUserInfo>();
  }
}
