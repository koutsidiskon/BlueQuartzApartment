import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Facilities } from './pages/facilities/facilities';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'facilities', component : Facilities },
  { path: '**', redirectTo: '' } 
];