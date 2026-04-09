import { Component, HostListener, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PrivacyPolicyDialogService } from './service/privacy-policy-dialog';
import { filter } from 'rxjs/operators';
import { TranslatePipe } from './pipes/translate.pipe';
import { LanguageFacadeService } from './service/language-option';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App implements OnInit {
  private static readonly HOME_SECTIONS = ['home-top', 'welcome-section', 'facilities-section', 'check-availability-section', 'find-us-section'];
  private static readonly LAST_HOME_SECTION_KEY = 'lastHomeSection';

  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private privacyPolicyDialog = inject(PrivacyPolicyDialogService);
  private languageFacade = inject(LanguageFacadeService);

  readonly languageOptions = this.languageFacade.languageOptions;
  
  isScrolled = false;
  menuOpen = false;
  currentSection = 'home-top';
  isFacilitiesPage = false;
  currentYear = new Date().getFullYear();
  currentLanguage = 'en';
  mobileLanguageMenuOpen = false;
  desktopLanguageMenuOpen = false;
  private previousUrl = '';
  private hasAppliedReloadSectionRestore = false;

  // Monitoring scroll events to update the active section and navigation bar 
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
    if (!this.isFacilitiesPage) {
      this.checkActiveSection();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.lang-switcher')) {
      this.mobileLanguageMenuOpen = false;
      this.desktopLanguageMenuOpen = false;
    }
  }

  // Monitoring route changes to reset the menu and update the active section
  ngOnInit() {
    this.currentLanguage = this.languageFacade.getCurrentLanguage();
    void this.languageFacade.preloadAllLanguages();
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const nextUrl = event.urlAfterRedirects as string;
      const fromFacilities = this.previousUrl.includes('/facilities');
      const fragment = this.router.parseUrl(nextUrl).fragment;

      this.closeAllMenus();
     
      this.isFacilitiesPage = nextUrl.includes('/facilities');
      if (this.isFacilitiesPage) {
        this.currentSection = 'facilities-page'; 

        // Ensure route transitions like Discover More always start at page top.
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        this.checkActiveSection(); 

        // On hard refresh, restore by section (not raw pixel) for stable UX.
        if (!fragment && this.isPageReload() && !this.hasAppliedReloadSectionRestore) {
          this.restoreSectionAfterReload();
        }

        // When coming from /facilities, re-assert anchor after layout settles.
        if (fromFacilities && fragment) {
          this.ensureFragmentVisibility(fragment);
        }
      }

      this.previousUrl = nextUrl;
      this.cdr.detectChanges();
    });
  }

  async changeLanguage(language: string): Promise<void> {
    const activeLanguage = this.languageFacade.getCurrentLanguage();
    if (activeLanguage === language) {
      this.currentLanguage = activeLanguage;
      this.closeLanguageMenus();
      return;
    }

    // Reflect language selection immediately while translations are being applied.
    this.currentLanguage = language;
    this.closeLanguageMenus();
    this.cdr.detectChanges();

    this.currentLanguage = await this.languageFacade.setLanguage(language);
    this.cdr.detectChanges();
  }

  toggleMobileLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.desktopLanguageMenuOpen = false;
    this.mobileLanguageMenuOpen = !this.mobileLanguageMenuOpen;
  }

  async selectMobileLanguage(language: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.changeLanguage(language);
  }

  toggleDesktopLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.mobileLanguageMenuOpen = false;
    this.desktopLanguageMenuOpen = !this.desktopLanguageMenuOpen;
  }

  async selectDesktopLanguage(language: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.changeLanguage(language);
  }

  getLanguageFlag(languageCode: string): string {
    return this.languageFacade.getFlag(languageCode);
  }

  private closeLanguageMenus(): void {
    this.mobileLanguageMenuOpen = false;
    this.desktopLanguageMenuOpen = false;
  }

  private closeAllMenus(): void {
    this.menuOpen = false;
    this.closeLanguageMenus();
  }

  private ensureFragmentVisibility(fragment: string): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const firstBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    const alignToFragment = (behavior: ScrollBehavior) => {
      const target = document.getElementById(fragment);
      if (!target) return;

      target.scrollIntoView({ behavior, block: 'start' });
      this.currentSection = fragment;
      this.rememberHomeSection(fragment);
    };

    alignToFragment(firstBehavior);
    setTimeout(() => alignToFragment('auto'), 320);
    setTimeout(() => alignToFragment('auto'), 850);
  }

  // Method to set the active section when a navigation link is clicked in mobile view
  setActive(section: string) {
    this.currentSection = section;
    this.rememberHomeSection(section);
    this.closeAllMenus();
  }

  private restoreSectionAfterReload(): void {
    this.hasAppliedReloadSectionRestore = true;
    const storedSection = sessionStorage.getItem(App.LAST_HOME_SECTION_KEY);
    if (!storedSection || !App.HOME_SECTIONS.includes(storedSection)) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    const alignToStoredSection = (scrollBehavior: ScrollBehavior) => {
      const target = document.getElementById(storedSection);
      if (!target) return;

      target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      this.currentSection = storedSection;
      this.rememberHomeSection(storedSection);
    };

    setTimeout(() => alignToStoredSection(behavior), 120);
    setTimeout(() => alignToStoredSection('auto'), 520);
    setTimeout(() => alignToStoredSection('auto'), 980);
  }

  private rememberHomeSection(section: string): void {
    if (!this.isFacilitiesPage && App.HOME_SECTIONS.includes(section)) {
      sessionStorage.setItem(App.LAST_HOME_SECTION_KEY, section);
    }
  }

  private isPageReload(): boolean {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navEntry?.type) return navEntry.type === 'reload';

    // Fallback for older browsers.
    const legacyNav = (performance as any).navigation;
    return legacyNav && legacyNav.type === 1;
  }

  openPrivacyPolicy(event: Event): void {
    event.preventDefault();
    this.privacyPolicyDialog.open();
  }

  // check which section is currently in view and update the active section accordingly
  checkActiveSection() {
    const sections = App.HOME_SECTIONS;
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
      this.rememberHomeSection(current);
      this.cdr.detectChanges();
    }
  }
}