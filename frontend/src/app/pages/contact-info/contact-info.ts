import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-contact-info',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './contact-info.html',
  styleUrl: './contact-info.scss'
})
export class ContactInfo {
}
