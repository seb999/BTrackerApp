import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // { path: '', loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)},
  { path: '', loadChildren: './login/login.module#LoginPageModule' },
  { path: 'login', loadChildren: './login/login.module#LoginPageModule' },
  { path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)},
  { path: 'tracker', loadChildren: () => import('./tracker/tracker.module').then(m => m.TrackerPageModule)},
  { path: 'implicit/callback', loadChildren: './auth/implicit/auth-callback/auth-callback.module#AuthCallbackPageModule' },
  { path: 'implicit/logout', loadChildren: './auth/implicit/end-session/end-session.module#EndSessionPageModule' },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
