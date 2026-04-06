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

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
    if (!this.isFacilitiesPage) {
      this.checkActiveSection();
    }
  }

  ngOnInit() {
    // Παρακολουθούμε τις αλλαγές στο URL
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {

      this.menuOpen = false; // Κλείνει το mobile menu σε κάθε αλλαγή σελίδας
      // Ελέγχουμε αν το URL περιέχει τη λέξη 'facilities'
      this.isFacilitiesPage = event.urlAfterRedirects.includes('/facilities');
      
      if (this.isFacilitiesPage) {
        this.currentSection = 'facilities-page'; // Θέτουμε ένα ειδικό state
      } else {
        this.checkActiveSection(); // Αν είμαστε στο home, τρέχουμε τον κανονικό έλεγχο
      }
      this.cdr.detectChanges();
    });
  }

  setActive(section: string) {
    this.currentSection = section;
    this.menuOpen = false; // Κλείνει το mobile menu αν είναι ανοιχτό
  }

  checkActiveSection() {
    const sections = ['home-top', 'welcome-section', 'facilities-section', 'check-availability-section', 'find-us-section'];
    const navHeight = 100;
    let current = 'home-top';

    for (const sectionId of sections) {
      const element = document.getElementById(sectionId);
      if (element) {
        const rect = element.getBoundingClientRect();
        
        // Αν η κορυφή του section είναι κοντά στο navigation bar (με ανοχή 150px)
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