import { Component, OnInit } from '@angular/core';
import { AuthActions, IAuthAction } from 'ionic-appauth';
import { AuthService } from '../auth/auth.service';
import { IUserInfo } from '../auth/user-info.model';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  userInfo: IUserInfo;
  action: IAuthAction;
  authenticated: boolean;

  constructor(private authService: AuthService, private navCtrl: NavController) {
  }

  ngOnInit() {
    this.authService.authObservable.subscribe((action) => {
      this.action = action;
      if (action.action === AuthActions.SignInSuccess || action.action === AuthActions.AutoSignInSuccess) {
        this.authenticated = true;
        this.navCtrl.navigateRoot('home');
      } else if (action.action === AuthActions.SignOutSuccess) {
        this.authenticated = false;
      }
    });
  }

  signIn() {
    this.authService.signIn().catch(error => console.error(`Sign in error: ${error}`));
  }

  public async getUserInfo(): Promise<void> {
    this.userInfo = await this.authService.getUserInfo<IUserInfo>();
  }
}
