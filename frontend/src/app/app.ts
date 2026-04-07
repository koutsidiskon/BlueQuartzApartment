import { Component, HostListener, inject, OnInit,ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, ActivatedRoute, Router, NavigationEnd } from '@angular/router'; // Πρόσθεσε το Router
import { CommonModule, AsyncPipe } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  
  isScrolled = false;
  menuOpen = false;
  currentSection = 'home-top';
  isFacilitiesPage = false;
  currentYear = new Date().getFullYear();

  // Monitoring scroll events to update the active section and navigation bar 
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
    if (!this.isFacilitiesPage) {
      this.checkActiveSection();
    }
  }

  // Monitoring route changes to reset the menu and update the active section
  ngOnInit() {
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {

      this.menuOpen = false; 
     

      this.isFacilitiesPage = event.urlAfterRedirects.includes('/facilities');
      if (this.isFacilitiesPage) {
        this.currentSection = 'facilities-page'; 
      } else {
        this.checkActiveSection(); 
      }
      this.cdr.detectChanges();
    });
  }

  // Method to set the active section when a navigation link is clicked in mobile view
  setActive(section: string) {
    this.currentSection = section;
    this.menuOpen = false; 
  }

  // check which section is currently in view and update the active section accordingly
  checkActiveSection() {
    const sections = ['home-top', 'welcome-section', 'facilities-section', 'check-availability-section', 'find-us-section'];
    const navHeight = 100;
    let current = 'home-top';

    for (const sectionId of sections) {
      const element = document.getElementById(sectionId);
      if (element) {
        const rect = element.getBoundingClientRect();
        
        
        if (rect.top <= navHeight + 150) {
          current = sectionId;
        }
      }
    }

    if (current === 'welcome-section') current = 'home-top';

    if (this.currentSection !== current) {
      this.currentSection = current;
      this.cdr.detectChanges();
    }
  }
}