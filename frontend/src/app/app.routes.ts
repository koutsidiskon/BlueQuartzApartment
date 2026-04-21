import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Facilities } from './pages/facilities/facilities';
import { AdminLogin } from './pages/admin-login/admin-login';
import { AdminPanel } from './pages/admin-panel/admin-panel';
import { adminAuthGuard } from './guards/admin-auth.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'facilities', component : Facilities },
  { path: 'admin', pathMatch: 'full', redirectTo: 'admin/login' },
  { path: 'admin/login', component: AdminLogin },
  { path: 'admin/panel', component: AdminPanel, canActivate: [adminAuthGuard] },
  { path: '**', redirectTo: '' } 
];