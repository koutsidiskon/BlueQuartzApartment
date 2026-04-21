import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, DoCheck, ElementRef, HostListener, NgZone, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import flatpickr from 'flatpickr';
import { Bulgarian } from 'flatpickr/dist/l10n/bg.js';
import { Greek } from 'flatpickr/dist/l10n/gr.js';
import { Romanian } from 'flatpickr/dist/l10n/ro.js';
import { Serbian } from 'flatpickr/dist/l10n/sr.js';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AdminAuthService } from '../../service/admin-auth';
import { I18nService } from '../../service/i18n';
import { LanguageFacadeService } from '../../service/language-option';
import { AvailabilityCalendarService } from '../../service/availability-calendar';
import { InquiryListItem, InquiryService } from '../../service/inquiry';

const GREEK_LOCALE_NO_TONOS = {
  ...Greek,
  months: {
    shorthand: ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'],
    longhand: [
      'Ιανουαριος',
      'Φεβρουαριος',
      'Μαρτιος',
      'Απριλιος',
      'Μαιος',
      'Ιουνιος',
      'Ιουλιος',
      'Αυγουστος',
      'Σεπτεμβριος',
      'Οκτωβριος',
      'Νοεμβριος',
      'Δεκεμβριος'
    ]
  }
};

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss'
})
export class AdminPanel implements AfterViewInit, DoCheck {
  @ViewChild('adminInlineCalendar') adminInlineCalendar!: ElementRef;
  @ViewChild('adminRangeFromInput') adminRangeFromInput!: ElementRef<HTMLInputElement>;
  @ViewChild('adminRangeToInput') adminRangeToInput!: ElementRef<HTMLInputElement>;

  activeTab: 'calendar' | 'inquiries' = 'calendar';
  menuOpen = false;
  currentLanguage = 'en';
  desktopLanguageMenuOpen = false;
  isLoggingOut = false;
  isCalendarLoading = false;
  isCalendarSaving = false;
  isInquiriesLoading = false;
  selectedDates: string[] = [];
  calendarMessage = '';
  calendarError = '';
  inquiriesError = '';
  error = '';
  inquiries: InquiryListItem[] = [];
  inquiryPage = 1;
  inquiryTotalPages = 1;
  inquiryTotalItems = 0;
  readonly inquiryPageSize = 10;
  readonly languageOptions;
  private inlineFp: any;
  private rangeFromFp: any;
  private rangeToFp: any;
  private blockedDateSet = new Set<string>();
  private selectedStartDate: Date | null = null;
  private selectedEndDate: Date | null = null;
  private isSyncingToCalendar = false;
  private inquiryPageCache = new Map<number, InquiryListItem[]>();
  private inquiryTotalItemsCache = 0;
  private inquiryTotalPagesCache = 1;
  private inquiryRequestToken = 0;
  private lastRenderedLanguage = '';

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private i18n: I18nService,
    private languageFacade: LanguageFacadeService,
    private availabilityCalendar: AvailabilityCalendarService,
    private inquiryService: InquiryService
  ) {
    this.currentLanguage = this.languageFacade.getCurrentLanguage();
    this.languageOptions = this.languageFacade.languageOptions;
  }

  ngAfterViewInit(): void {
    this.initCalendar();
    this.initRangeInputs();
    this.loadBlockedDates();
    this.loadInquiries(1);
    this.lastRenderedLanguage = this.i18n.getLanguage();
    this.updateCalendarLocale();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('.admin-nav')) {
      this.menuOpen = false;
    }

    if (!target?.closest('.lang-switcher')) {
      this.desktopLanguageMenuOpen = false;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900 && this.menuOpen) {
      this.menuOpen = false;
    }
  }

  ngDoCheck(): void {
    const currentLanguage = this.i18n.getLanguage();
    if (currentLanguage === this.lastRenderedLanguage) return;

    this.lastRenderedLanguage = currentLanguage;
    this.updateCalendarLocale();
  }

  switchTab(tab: 'calendar' | 'inquiries'): void {
    this.activeTab = tab;
    this.menuOpen = false;
    this.desktopLanguageMenuOpen = false;

    if (tab === 'inquiries') {
      this.loadInquiries(this.inquiryPage, true);
      return;
    }

    setTimeout(() => {
      if (!this.inlineFp) {
        this.rebuildCalendar();
      } else {
        this.inlineFp.redraw();
      }
    }, 50);
  }

  get panelTitle(): string {
    if (this.activeTab === 'inquiries') {
      return this.i18n.t('adminPanel.inquiriesTitle', undefined, 'Booking Inquiries');
    }

    return this.i18n.t('adminPanel.calendarTitle', undefined, 'Calendar Availability');
  }

  blockSelectedDates(): void {
    this.updateSelectionState(true);
  }

  unblockSelectedDates(): void {
    this.updateSelectionState(false);
  }

  canReserveSelection(): boolean {
    return !!this.selectedDates.length && !this.isCalendarSaving && !this.isCalendarLoading;
  }

  canReleaseSelection(): boolean {
    return !!this.selectedDates.length && !this.isCalendarSaving && !this.isCalendarLoading;
  }

  goToInquiryPage(page: number): void {
    if (page < 1 || page > this.inquiryTotalPages) return;

    this.loadInquiries(page, true);
  }

  hasInquiryPreviousPage(): boolean {
    return this.inquiryPage > 1;
  }

  hasInquiryNextPage(): boolean {
    return this.inquiryPage < this.inquiryTotalPages;
  }

  toggleDesktopLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.desktopLanguageMenuOpen = !this.desktopLanguageMenuOpen;
  }

  async selectDesktopLanguage(languageCode: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    this.currentLanguage = await this.languageFacade.setLanguage(languageCode);
    this.menuOpen = false;
    this.desktopLanguageMenuOpen = false;
  }

  getLanguageFlag(languageCode: string): string {
    return this.languageFacade.getFlag(languageCode);
  }

  private initCalendar(): void {
    if (!this.adminInlineCalendar?.nativeElement) return;

    const locale = this.getFlatpickrLocaleByLanguage(this.i18n.getLanguage());
    this.inlineFp = flatpickr(this.adminInlineCalendar.nativeElement, {
      inline: true,
      minDate: 'today',
      showMonths: 1,
      mode: 'range',
      dateFormat: 'Y-m-d',
      locale,
      monthSelectorType: 'static',
      shorthandCurrentMonth: false,
      disableMobile: true,
      onChange: (selectedDates: Date[]) => this.ngZone.run(() => this.handleCalendarChange(selectedDates)),
      onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
        const dayDate = (dayElem as any).dateObj as Date | undefined;
        if (!dayDate) return;

        if (this.isBlockedDate(dayDate)) {
          dayElem.classList.add('booked-day');
        }
      }
    });
  }

  private initRangeInputs(): void {
    if (!this.adminRangeFromInput?.nativeElement || !this.adminRangeToInput?.nativeElement) return;

    const locale = this.getFlatpickrLocaleByLanguage(this.i18n.getLanguage());
    const commonOptions = {
      dateFormat: 'Y-m-d',
      minDate: 'today',
      locale,
      disableMobile: true,
      allowInput: false
    } as const;

    this.rangeFromFp = flatpickr(this.adminRangeFromInput.nativeElement, {
      ...commonOptions,
      onChange: (selectedDates: Date[]) => {
        this.ngZone.run(() => this.handleFromInputChange(selectedDates[0] ?? null));
      }
    });

    this.rangeToFp = flatpickr(this.adminRangeToInput.nativeElement, {
      ...commonOptions,
      onChange: (selectedDates: Date[]) => {
        this.ngZone.run(() => this.handleToInputChange(selectedDates[0] ?? null));
      }
    });
  }

  private rebuildCalendar(): void {
    if (!this.adminInlineCalendar?.nativeElement) return;

    if (this.inlineFp) {
      this.inlineFp.destroy();
      this.inlineFp = null;
    }

    requestAnimationFrame(() => {
      this.initCalendar();
    });
  }

  private loadInquiries(page: number, useCacheFirst = false): void {
    const hasCachedPage = this.inquiryPageCache.has(page);

    if (useCacheFirst && hasCachedPage) {
      this.inquiries = this.inquiryPageCache.get(page) || [];
      this.inquiryPage = page;
      this.inquiryTotalItems = this.inquiryTotalItemsCache;
      this.inquiryTotalPages = this.inquiryTotalPagesCache;
      this.inquiriesError = '';
      this.prefetchInquiryPage(page + 1);
      this.prefetchInquiryPage(page - 1);
      return;
    }

    this.isInquiriesLoading = true;
    this.inquiriesError = '';
    const requestToken = ++this.inquiryRequestToken;

    this.inquiryService.getInquiries(page, this.inquiryPageSize).pipe(
      finalize(() => {
        if (requestToken === this.inquiryRequestToken) {
          this.isInquiriesLoading = false;
        }
      })
    ).subscribe({
      next: (response) => {
        if (requestToken !== this.inquiryRequestToken) {
          return;
        }

        if (!response?.success) {
          this.inquiriesError = this.i18n.t('adminPanel.inquiries.loadError', undefined, 'Could not load inquiries.');
          return;
        }

        const rows = Array.isArray(response.data) ? response.data : [];
        const pagination = response.pagination;
        const totalPages = Math.max(1, Number(pagination?.totalPages || 1));
        const totalItems = Math.max(0, Number(pagination?.totalItems || 0));
        const currentPage = Math.min(Math.max(1, Number(pagination?.page || page)), totalPages);

        this.inquiryPageCache.set(currentPage, rows);
        this.inquiryTotalItemsCache = totalItems;
        this.inquiryTotalPagesCache = totalPages;

        this.inquiries = rows;
        this.inquiryPage = currentPage;
        this.inquiryTotalPages = totalPages;
        this.inquiryTotalItems = totalItems;

        this.prefetchInquiryPage(currentPage + 1);
        this.prefetchInquiryPage(currentPage - 1);
      },
      error: () => {
        if (requestToken !== this.inquiryRequestToken) {
          return;
        }

        this.inquiriesError = this.i18n.t('adminPanel.inquiries.loadError', undefined, 'Could not load inquiries.');
      }
    });
  }

  private prefetchInquiryPage(page: number): void {
    if (page < 1) return;
    if (this.inquiryTotalPagesCache && page > this.inquiryTotalPagesCache) return;
    if (this.inquiryPageCache.has(page)) return;

    this.inquiryService.getInquiries(page, this.inquiryPageSize).subscribe({
      next: (response) => {
        if (!response?.success) return;

        const rows = Array.isArray(response.data) ? response.data : [];
        const totalPages = Math.max(1, Number(response.pagination?.totalPages || this.inquiryTotalPagesCache || 1));
        const totalItems = Math.max(0, Number(response.pagination?.totalItems || this.inquiryTotalItemsCache || 0));
        const currentPage = Math.min(Math.max(1, Number(response.pagination?.page || page)), totalPages);

        this.inquiryPageCache.set(currentPage, rows);
        this.inquiryTotalPagesCache = totalPages;
        this.inquiryTotalItemsCache = totalItems;
      },
      error: () => {}
    });
  }

  private loadBlockedDates(): void {
    this.isCalendarLoading = true;
    this.calendarError = '';

    this.availabilityCalendar.getBlockedDates().pipe(
      finalize(() => {
        this.isCalendarLoading = false;
      })
    ).subscribe({
      next: (response) => {
        this.applyBlockedDates(response?.data || []);
      },
      error: () => {
        this.calendarError = this.i18n.t('adminPanel.calendar.loadError', undefined, 'Could not load reserved dates.');
      }
    });
  }

  private updateSelectionState(blocked: boolean): void {
    if (!this.selectedDates.length || this.isCalendarSaving) {
      return;
    }

    this.isCalendarSaving = true;
    this.calendarError = '';
    this.calendarMessage = '';

    this.availabilityCalendar.updateBlockedDates(this.selectedDates, blocked).pipe(
      finalize(() => {
        this.isCalendarSaving = false;
      })
    ).subscribe({
      next: (response) => {
        const updatedDates = response?.data || [];
        this.applyBlockedDates(updatedDates);
        this.clearSelection();

        this.calendarMessage = blocked
          ? this.i18n.t('adminPanel.calendar.blockSuccess', undefined, 'Selected dates were reserved.')
          : this.i18n.t('adminPanel.calendar.unblockSuccess', undefined, 'Selected dates were released.');
      },
      error: (err) => {
        this.calendarError = err?.error?.message || this.i18n.t('adminPanel.calendar.saveError', undefined, 'Could not update dates.');
      }
    });
  }

  // Handles user clicks on the inline calendar (onChange fires only on real user interaction)
  private handleCalendarChange(selectedDates: Date[]): void {
    if (this.isSyncingToCalendar) return;

    this.calendarMessage = '';
    this.calendarError = '';

    if (!selectedDates.length) {
      this.clearSelectionState();
      this.syncRangeInputs();
      this.cdr.detectChanges();
      return;
    }

    const [startDate, endDate] = selectedDates;
    this.selectedStartDate = new Date(startDate);
    this.selectedEndDate = endDate ? new Date(endDate) : null;

    if (!endDate) {
      this.selectedDates = [this.toDateKey(startDate)];
    } else {
      this.selectedDates = this.enumerateDateRange(startDate, endDate);
    }

    this.syncRangeInputs();
    this.cdr.detectChanges();
  }

  private handleFromInputChange(startDate: Date | null): void {
    if (!startDate) {
      this.clearSelection();
      return;
    }

    const normalizedEnd = this.selectedEndDate && this.selectedEndDate >= startDate
      ? this.selectedEndDate
      : null;

    this.applyRangeFromInputs(startDate, normalizedEnd);
  }

  private handleToInputChange(endDate: Date | null): void {
    if (!endDate) {
      this.applyRangeFromInputs(this.selectedStartDate, null);
      return;
    }

    const rawStart = this.selectedStartDate ?? new Date(endDate);
    const start = rawStart <= endDate ? rawStart : new Date(endDate);
    const end = rawStart <= endDate ? new Date(endDate) : rawStart;

    this.applyRangeFromInputs(start, end);
  }

  private applyRangeFromInputs(startDate: Date | null, endDate: Date | null): void {
    this.calendarMessage = '';
    this.calendarError = '';

    if (!startDate) {
      this.clearSelection();
      return;
    }

    const normStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const normEnd = endDate
      ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
      : null;

    this.selectedStartDate = normStart;
    this.selectedEndDate = normEnd;
    this.selectedDates = normEnd
      ? this.enumerateDateRange(normStart, normEnd)
      : [this.toDateKey(normStart)];

    // Push selection to inline calendar without triggering onChange
    if (this.inlineFp) {
      this.isSyncingToCalendar = true;
      this.inlineFp.setDate(normEnd ? [normStart, normEnd] : [normStart], false);
      this.inlineFp.jumpToDate(normEnd ?? normStart);
      this.isSyncingToCalendar = false;
    }

    this.syncRangeInputs();
    this.cdr.detectChanges();
  }

  private syncRangeInputs(): void {
    if (this.rangeFromFp) {
      if (this.selectedStartDate) {
        this.rangeFromFp.setDate(this.selectedStartDate, false);
      } else {
        this.rangeFromFp.clear(false);
      }
    }

    if (this.rangeToFp) {
      if (this.selectedEndDate) {
        this.rangeToFp.setDate(this.selectedEndDate, false);
      } else {
        this.rangeToFp.clear(false);
      }
    }
  }

  private clearSelectionState(): void {
    this.selectedDates = [];
    this.selectedStartDate = null;
    this.selectedEndDate = null;
  }

  private clearSelection(clearInlineCalendar = true): void {
    this.clearSelectionState();
    this.syncRangeInputs();

    if (clearInlineCalendar && this.inlineFp) {
      const savedYear: number = this.inlineFp.currentYear;
      const savedMonth: number = this.inlineFp.currentMonth;
      this.isSyncingToCalendar = true;
      this.inlineFp.clear(false);
      this.inlineFp.jumpToDate(new Date(savedYear, savedMonth, 1), false);
      this.isSyncingToCalendar = false;
    }

    this.cdr.detectChanges();
  }

  private enumerateDateRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      dates.push(this.toDateKey(cursor));
    }

    return dates;
  }

  private applyBlockedDates(dates: string[]): void {
    const normalizedDates = dates
      .map((date) => String(date || '').trim())
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));

    this.blockedDateSet = new Set(normalizedDates);

    if (this.inlineFp) {
      this.inlineFp.redraw();
    }
  }

  private isBlockedDate(date: Date): boolean {
    return this.blockedDateSet.has(this.toDateKey(date));
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getFlatpickrLocaleByLanguage(language: string): any {
    switch (language) {
      case 'el':
        return GREEK_LOCALE_NO_TONOS;
      case 'ro':
        return Romanian;
      case 'sr':
        return Serbian;
      case 'bg':
        return Bulgarian;
      case 'tr':
        return Turkish;
      default:
        return 'default';
    }
  }

  private updateCalendarLocale(): void {
    const locale = this.getFlatpickrLocaleByLanguage(this.i18n.getLanguage());

    if (this.inlineFp) {
      this.inlineFp.set('locale', locale);
      this.inlineFp.redraw();
    }

    if (this.rangeFromFp) {
      this.rangeFromFp.set('locale', locale);
    }

    if (this.rangeToFp) {
      this.rangeToFp.set('locale', locale);
    }
  }

  logout(): void {
    if (this.isLoggingOut) return;

    this.menuOpen = false;
    this.isLoggingOut = true;
    this.error = '';

    this.adminAuth.logout().pipe(
      finalize(() => {
        this.isLoggingOut = false;
      })
    ).subscribe({
      next: () => {
        void this.router.navigate(['/admin/login']);
      },
      error: (err) => {
        this.error = err?.error?.message || this.i18n.t('adminPanel.errors.logoutFailed', undefined, 'Logout failed. Please try again.');
      }
    });
  }
}
