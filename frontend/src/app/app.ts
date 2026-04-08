import { Component, HostListener, inject, OnInit,ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PrivacyPolicyDialogService } from './service/privacy-policy-dialog';
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
  private privacyPolicyDialog = inject(PrivacyPolicyDialogService);
  
  isScrolled = false;
  menuOpen = false;
  currentSection = 'home-top';
  isFacilitiesPage = false;
  currentYear = new Date().getFullYear();
  private previousUrl = '';

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
      const nextUrl = event.urlAfterRedirects as string;
      const fromFacilities = this.previousUrl.includes('/facilities');
      const fragment = this.router.parseUrl(nextUrl).fragment;

      this.menuOpen = false; 
     
      this.isFacilitiesPage = nextUrl.includes('/facilities');
      if (this.isFacilitiesPage) {
        this.currentSection = 'facilities-page'; 

        // Ensure route transitions like Discover More always start at page top.
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        this.checkActiveSection(); 

        // When coming from /facilities, re-assert anchor after layout settles.
        if (fromFacilities && fragment) {
          this.ensureFragmentVisibility(fragment);
        }
      }

      this.previousUrl = nextUrl;
      this.cdr.detectChanges();
    });
  }

  private ensureFragmentVisibility(fragment: string): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const firstBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    const alignToFragment = (behavior: ScrollBehavior) => {
      const target = document.getElementById(fragment);
      if (!target) return;

      target.scrollIntoView({ behavior, block: 'start' });
      this.currentSection = fragment;
    };

    alignToFragment(firstBehavior);
    setTimeout(() => alignToFragment('auto'), 320);
    setTimeout(() => alignToFragment('auto'), 850);
  }

  // Method to set the active section when a navigation link is clicked in mobile view
  setActive(section: string) {
    this.currentSection = section;
    this.menuOpen = false; 
  }

  openPrivacyPolicy(event: Event): void {
    event.preventDefault();
    this.privacyPolicyDialog.open();
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