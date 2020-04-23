import { Requestor, StorageBackend } from '@openid/appauth';
import { Platform } from '@ionic/angular';
import { Injectable, NgZone } from '@angular/core';
import { IonicAuth, Browser} from 'ionic-appauth';
import { environment } from '../../environments/environment';



@Injectable({
  providedIn: 'root'
})
export class AuthService extends IonicAuth {

  constructor(requestor: Requestor,
              storage: StorageBackend,
              browser: Browser,
              private platform: Platform,
              private ngZone: NgZone) {
    super(browser, storage, requestor);

    this.addConfig();
  }

  public async startUpAsync() {
    if (this.platform.is('cordova')) {
      (<any>window).handleOpenURL = (callbackUrl) => {
        this.ngZone.run(() => {
          this.handleCallback(callbackUrl);
        });
      };
    }

    super.startUpAsync();
  }

  private onDevice(): boolean {
    return this.platform.is('cordova');
  }

  private async addConfig() {
    const scopes = 'openid profile' + (this.onDevice() ? ' offline_access' : '');
    const redirectUri = this.onDevice() ? 'com.okta.dev-792490:/callback' : window.location.origin + '/implicit/callback';
    const logoutRedirectUri = this.onDevice() ? 'com.okta.dev-792490:/logout' : window.location.origin + '/implicit/logout';
    const clientId = '0oa12yhn3rRP4hwD8357';
    const issuer = 'https://dev-792490.okta.com/oauth2/default';
    const authConfig: any = {
      identity_client: clientId,
      identity_server: issuer,
      redirect_url: redirectUri,
      end_session_redirect_url: logoutRedirectUri,
      scopes,
      usePkce: true,
    };

    this.authConfig = {...authConfig};
  }

  private handleCallback(callbackUrl: string): void {
    if ((callbackUrl).indexOf(this.authConfig.redirect_url) === 0) {
      this.AuthorizationCallBack(callbackUrl).catch((error: string) => {
        console.error(`Authorization callback failed! ${error}`);
      });
    }

    if ((callbackUrl).indexOf(this.authConfig.end_session_redirect_url) === 0) {
      this.EndSessionCallBack().catch((error: string) => {
        console.error(`End session callback failed! ${error}`);
      });
    }
  }
}
