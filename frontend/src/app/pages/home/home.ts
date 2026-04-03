import { Component } from '@angular/core';
import { RouterOutlet, RouterLinkActive, RouterLink } from '@angular/router';
import { Contact } from '../contact/contact';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Contact],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  menuOpen = false;
}
