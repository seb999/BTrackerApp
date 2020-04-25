import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AuthService } from './auth/auth.service';
import { IUserInfo } from './auth/user-info.model';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { StorageService } from './service/storage.service';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  public userInfo: IUserInfo;
  public authenticated: boolean;
  private userToken : any;
  public appPages = [
    {
      title: 'Dashboard',
      url: '/home',
      icon: 'navigate'
    },
    {
      title: 'Register tracker',
      url: '/tracker',
      icon: 'settings'
    },
  ];

  constructor(
    private backgroundMode: BackgroundMode,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private authService: AuthService,
    private storageService: StorageService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      console.log("in platform method");
      this.authService.startUpAsync();
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      //Activate background mode
      this.backgroundMode.on('enable').subscribe((p)=>{ console.log("background activated")});
      this.backgroundMode.setDefaults({ silent: true });
      this.backgroundMode.on('activate').subscribe((p)=>{ this.backgroundMode.disableWebViewOptimizations()});
      this.backgroundMode.enable();
      
    this.getToken();
    });
  }

  signOut() {
    this.authService.signOut();
  }

  getToken() {
    this.authService.authObservable.subscribe((action) => {
      if (action.action === AuthActions.SignInSuccess || action.action === AuthActions.AutoSignInSuccess) {
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
    this.userToken = await this.authService.getValidToken();
    this.userInfo = await this.authService.getUserInfo<IUserInfo>();
    this.storageService.setItem<any>("userToken", this.userToken);
  }
}