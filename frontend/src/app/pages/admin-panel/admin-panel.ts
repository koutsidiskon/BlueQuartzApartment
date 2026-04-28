import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AfterViewInit, ChangeDetectorRef, Component, DoCheck, ElementRef, HostListener, NgZone, ViewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
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
import { BookingService, BookingListItem, BookingCalendarItem, BookingSource, CreateBookingData } from '../../service/booking';
import { PhoneCountrySelectComponent } from '../../shared/phone-country-select.component';

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
  imports: [CommonModule, RouterLink, TranslatePipe, FormsModule, PhoneCountrySelectComponent],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss'
})
export class AdminPanel implements AfterViewInit, DoCheck {
  @ViewChild('adminInlineCalendar') adminInlineCalendar!: ElementRef;
  @ViewChild('adminRangeFromInput') adminRangeFromInput!: ElementRef<HTMLInputElement>;
  @ViewChild('adminRangeToInput') adminRangeToInput!: ElementRef<HTMLInputElement>;

  activeTab: 'calendar' | 'inquiries' | 'bookings' = 'calendar';
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
  inquiryPageSize = 10;
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

  selectedInquiryIds = new Set<number>();
  expandedMessageIds = new Set<number>();

  searchTerm = '';
  sortField = 'createdAt';
  sortDir: 'ASC' | 'DESC' = 'DESC';
  isDeleting = false;
  deleteMessage = '';
  deleteError = '';
  private searchDebounceTimer: any = null;

  // ── Bookings tab ─────────────────────────────────────
  bookings: BookingListItem[] = [];
  bookingPage = 1;
  bookingTotalPages = 1;
  bookingTotalItems = 0;
  bookingPageSize = 10;
  bookingSearchTerm = '';
  bookingSortField = 'checkIn';
  bookingSortDir: 'ASC' | 'DESC' = 'DESC';
  isBookingsLoading = false;
  bookingsError = '';
  bookingMessage = '';
  private bookingPageCache = new Map<number, BookingListItem[]>();
  private bookingTotalItemsCache = 0;
  private bookingTotalPagesCache = 1;
  private bookingRequestToken = 0;
  private bookingSearchDebounceTimer: any = null;

  // ── Calendar booking overlay ──────────────────────────
  calendarBookings: BookingCalendarItem[] = [];

  // ── Booking modal ─────────────────────────────────────
  isBookingModalOpen = false;
  isEditMode = false;
  editingBookingId: number | null = null;
  bookingModalFromInquiryId: number | null = null;
  bookingModalData = {
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestPhoneCountryCode: '+30',
    checkIn: '',
    checkOut: '',
    guestCount: 1,
    notes: '',
    source: 'Website' as BookingSource
  };
  isSavingBooking = false;
  bookingModalError = '';
  bookingModalManualBlockConflict: number | null = null;
  private modalCheckInFp: any;
  private modalCheckOutFp: any;

  // ── Delete confirmation modal ─────────────────────────
  isDeleteConfirmModalOpen = false;
  deletingBooking: BookingListItem | null = null;

  // ── Booking notes expand ──────────────────────────────
  expandedBookingNoteIds = new Set<number>();

  // ── iCal feed ─────────────────────────────────────────
  icalFeedUrl = '';
  icalUrlLoading = false;
  icalUrlError = '';

  private deferredCheckInMap = new Map<string, BookingCalendarItem>();

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private i18n: I18nService,
    private languageFacade: LanguageFacadeService,
    private availabilityCalendar: AvailabilityCalendarService,
    private inquiryService: InquiryService,
    private bookingService: BookingService,
    private sanitizer: DomSanitizer
  ) {
    this.currentLanguage = this.languageFacade.getCurrentLanguage();
    this.languageOptions = this.languageFacade.languageOptions;
  }

  ngAfterViewInit(): void {
    this.initCalendar();
    this.initRangeInputs();
    this.loadBlockedDates();
    this.loadCalendarBookings();
    this.loadInquiries(1);
    this.loadBookings(1);
    this.loadIcalUrl();
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

    if (
      this.activeTab === 'calendar' &&
      this.selectedDates.length > 0 &&
      !target?.closest('.admin-calendar-card') &&
      !target?.closest('.calendar-range-controls') &&
      !target?.closest('.calendar-actions') &&
      !target?.closest('.flatpickr-calendar')
    ) {
      this.clearSelection();
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

  switchTab(tab: 'calendar' | 'inquiries' | 'bookings'): void {
    this.activeTab = tab;
    this.menuOpen = false;
    this.desktopLanguageMenuOpen = false;

    if (tab === 'inquiries') {
      this.loadInquiries(this.inquiryPage, true);
      return;
    }

    if (tab === 'bookings') {
      this.loadBookings(this.bookingPage, true);
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
    if (this.activeTab === 'bookings') {
      return this.i18n.t('adminPanel.bookingsTab', undefined, 'Bookings');
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

  // ── Inquiry tab ───────────────────────────────────────

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

  toggleMessageExpand(id: number, event: Event): void {
    event.stopPropagation();
    if (this.expandedMessageIds.has(id)) {
      this.expandedMessageIds.delete(id);
    } else {
      this.expandedMessageIds.add(id);
    }
  }

  isMessageExpanded(id: number): boolean {
    return this.expandedMessageIds.has(id);
  }

  refreshInquiries(): void {
    clearTimeout(this.searchDebounceTimer);
    this.inquiryPageCache.clear();
    this.selectedInquiryIds.clear();
    this.deleteMessage = '';
    this.deleteError = '';
    this.loadInquiries(1);
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.inquiryPageCache.clear();
        this.selectedInquiryIds.clear();
        this.deleteMessage = '';
        this.deleteError = '';
        this.loadInquiries(1);
      });
    }, 350);
  }

  clearSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm = '';
    this.inquiryPageCache.clear();
    this.selectedInquiryIds.clear();
    this.deleteMessage = '';
    this.deleteError = '';
    this.loadInquiries(1);
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = Number(select.value);
    if (newSize === this.inquiryPageSize) return;
    this.inquiryPageSize = newSize;
    this.inquiryPageCache.clear();
    this.selectedInquiryIds.clear();
    this.deleteMessage = '';
    this.deleteError = '';
    this.loadInquiries(1);
  }

  onSortFieldChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortField = select.value;
    this.inquiryPageCache.clear();
    this.selectedInquiryIds.clear();
    this.deleteMessage = '';
    this.deleteError = '';
    this.loadInquiries(1);
  }

  onSortDirToggle(): void {
    this.sortDir = this.sortDir === 'DESC' ? 'ASC' : 'DESC';
    this.inquiryPageCache.clear();
    this.selectedInquiryIds.clear();
    this.deleteMessage = '';
    this.deleteError = '';
    this.loadInquiries(1);
  }

  toggleSelectInquiry(id: number): void {
    if (this.selectedInquiryIds.has(id)) {
      this.selectedInquiryIds.delete(id);
    } else {
      this.selectedInquiryIds.add(id);
    }
  }

  isInquirySelected(id: number): boolean {
    return this.selectedInquiryIds.has(id);
  }

  isAllSelected(): boolean {
    return this.inquiries.length > 0 && this.inquiries.every(inq => this.selectedInquiryIds.has(inq.id));
  }

  isSomeSelected(): boolean {
    return this.selectedInquiryIds.size > 0;
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.inquiries.forEach(inq => this.selectedInquiryIds.delete(inq.id));
    } else {
      this.inquiries.forEach(inq => this.selectedInquiryIds.add(inq.id));
    }
  }

  deleteSelectedInquiries(): void {
    if (!this.selectedInquiryIds.size || this.isDeleting) return;

    const ids = Array.from(this.selectedInquiryIds);
    this.isDeleting = true;
    this.deleteError = '';
    this.deleteMessage = '';

    this.inquiryService.deleteInquiries(ids).pipe(
      finalize(() => {
        this.isDeleting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        if (!response?.success) {
          this.deleteError = this.i18n.t('adminPanel.inquiries.deleteError', undefined, 'Could not delete the selected inquiries.');
          this.cdr.detectChanges();
          return;
        }
        const count = response.data?.deletedCount ?? ids.length;
        this.deleteMessage = this.i18n.t('adminPanel.inquiries.deleteSuccess', { count }, `${count} inquiry/inquiries deleted successfully.`);
        this.selectedInquiryIds.clear();
        this.inquiryPageCache.clear();
        this.cdr.detectChanges();
        const safePageAfterDelete = this.inquiryPage > this.inquiryTotalPages ? 1 : this.inquiryPage;
        this.loadInquiries(safePageAfterDelete);
        setTimeout(() => {
          this.ngZone.run(() => {
            this.deleteMessage = '';
            this.cdr.detectChanges();
          });
        }, 4000);
      },
      error: () => {
        this.deleteError = this.i18n.t('adminPanel.inquiries.deleteError', undefined, 'Could not delete the selected inquiries.');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Booking modal ─────────────────────────────────────

  openAddBookingModal(): void {
    this.isEditMode = false;
    this.editingBookingId = null;
    this.bookingModalFromInquiryId = null;
    this.bookingModalData = { guestName: '', guestEmail: '', guestPhone: '', guestPhoneCountryCode: '+30', checkIn: '', checkOut: '', guestCount: 1, notes: '', source: 'Website' };
    this.bookingModalError = '';
    this.isBookingModalOpen = true;
    this.cdr.detectChanges();
    setTimeout(() => this.initModalDatePickers(), 60);
  }

  openEditBookingModal(booking: BookingListItem): void {
    this.isEditMode = true;
    this.editingBookingId = booking.id;
    this.bookingModalFromInquiryId = null;
    this.bookingModalData = {
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone ?? '',
      guestPhoneCountryCode: booking.guestPhoneCountryCode ?? '+30',
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guestCount: booking.guestCount,
      notes: booking.notes ?? '',
      source: booking.source
    };
    this.bookingModalError = '';
    this.isBookingModalOpen = true;
    this.cdr.detectChanges();
    setTimeout(() => this.initModalDatePickers(), 60);
  }

  openConfirmBookingModal(inquiry: InquiryListItem): void {
    this.isEditMode = false;
    this.editingBookingId = null;
    this.bookingModalFromInquiryId = inquiry.id;
    this.bookingModalData = {
      guestName: inquiry.fullName,
      guestEmail: inquiry.email,
      guestPhone: inquiry.phone ?? '',
      guestPhoneCountryCode: inquiry.phoneCountryCode ?? '+30',
      checkIn: inquiry.checkIn,
      checkOut: inquiry.checkOut,
      guestCount: inquiry.guests,
      notes: '',
      source: 'Website'
    };
    this.bookingModalError = '';
    this.isBookingModalOpen = true;
    this.cdr.detectChanges();
    setTimeout(() => this.initModalDatePickers(), 60);
  }

  closeBookingModal(): void {
    this.isBookingModalOpen = false;
    this.bookingModalManualBlockConflict = null;
    if (this.modalCheckInFp) { this.modalCheckInFp.destroy(); this.modalCheckInFp = null; }
    if (this.modalCheckOutFp) { this.modalCheckOutFp.destroy(); this.modalCheckOutFp = null; }
  }

  // ── Booking notes expand ──────────────────────────────

  toggleBookingNoteExpand(id: number, event: Event): void {
    event.stopPropagation();
    if (this.expandedBookingNoteIds.has(id)) {
      this.expandedBookingNoteIds.delete(id);
    } else {
      this.expandedBookingNoteIds.add(id);
    }
  }

  isBookingNoteExpanded(id: number): boolean {
    return this.expandedBookingNoteIds.has(id);
  }

  // ── iCal feed ─────────────────────────────────────────

  get icalIphoneUrl(): SafeUrl {
    const webcal = this.icalFeedUrl.replace(/^https?:\/\//, 'webcal://');
    return this.sanitizer.bypassSecurityTrustUrl(webcal);
  }

  get icalGoogleUrl(): string {
    const webcal = this.icalFeedUrl.replace(/^https?:\/\//, 'webcal://');
    return `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
  }

  private loadIcalUrl(): void {
    this.icalUrlLoading = true;
    this.icalUrlError = '';
    this.bookingService.getIcalUrl().subscribe({
      next: (res) => {
        this.icalFeedUrl = res?.url || '';
        this.icalUrlLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.icalUrlError = 'Could not load calendar sync links.';
        this.icalUrlLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Open edit modal from calendar click ───────────────

  openEditBookingFromCalendar(bookingId: number): void {
    const found = this.bookings.find(b => b.id === bookingId);
    if (found) {
      this.openEditBookingModal(found);
      return;
    }
    // Fetch if not in current page
    this.bookingService.getBookings(1, 100).subscribe({
      next: (res: any) => {
        const all = Array.isArray(res?.data) ? res.data : [];
        const booking = all.find((b: any) => b.id === bookingId);
        if (booking) this.ngZone.run(() => this.openEditBookingModal(booking));
      },
      error: () => {}
    });
  }

  onModalOverlayClick(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('booking-modal-overlay')) {
      this.closeBookingModal();
    }
  }

  saveBooking(force = false): void {
    if (this.isSavingBooking) return;

    const { guestName, guestEmail, checkIn, checkOut, guestCount, source, guestPhone, guestPhoneCountryCode, notes } = this.bookingModalData;

    if (!guestName.trim() || !guestEmail.trim() || !checkIn || !checkOut) {
      this.bookingModalError = this.i18n.t('adminPanel.bookings.requiredFields', undefined, 'Please fill in all required fields: Name, Email, Check-in, Check-out.');
      return;
    }

    if (checkOut <= checkIn) {
      this.bookingModalError = this.i18n.t('adminPanel.bookings.invalidDateRange', undefined, 'Check-out must be after check-in.');
      return;
    }

    this.isSavingBooking = true;
    this.bookingModalError = '';
    this.bookingModalManualBlockConflict = null;

    const data: CreateBookingData = {
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim() || undefined,
      guestPhoneCountryCode: guestPhoneCountryCode || undefined,
      checkIn,
      checkOut,
      guestCount: Number(guestCount) || 1,
      source,
      notes: notes.trim() || undefined,
      force: force || undefined
    };

    let obs$;
    if (this.bookingModalFromInquiryId) {
      obs$ = this.bookingService.createFromInquiry(this.bookingModalFromInquiryId, { guestPhone: data.guestPhone, guestPhoneCountryCode: data.guestPhoneCountryCode, notes: data.notes, force: data.force });
    } else if (this.isEditMode && this.editingBookingId) {
      obs$ = this.bookingService.updateBooking(this.editingBookingId, data);
    } else {
      obs$ = this.bookingService.createBooking(data);
    }

    obs$.pipe(finalize(() => { this.isSavingBooking = false; this.cdr.detectChanges(); })).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.bookingModalError = response?.message || 'Could not save booking.';
          this.cdr.detectChanges();
          return;
        }
        const wasFromInquiry = !!this.bookingModalFromInquiryId;
        this.closeBookingModal();
        this.bookingPageCache.clear();
        this.loadBookings(1);
        this.loadCalendarBookings();
        this.loadBlockedDates();
        if (wasFromInquiry) {
          this.inquiryPageCache.clear();
          this.loadInquiries(this.inquiryPage);
          this.deleteMessage = this.i18n.t('adminPanel.inquiries.confirmSuccess', undefined, 'Inquiry confirmed and booking created.');
          setTimeout(() => { this.ngZone.run(() => { this.deleteMessage = ''; this.cdr.detectChanges(); }); }, 4000);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        const status = err?.status;
        const body = err?.error;

        if (status === 409 && body?.conflictType === 'booking') {
          this.bookingModalError = this.i18n.t('adminPanel.bookings.conflictBooking', { guestName: body.guestName, checkIn: body.checkIn, checkOut: body.checkOut }, `These dates conflict with an existing booking for ${body.guestName} (${body.checkIn} → ${body.checkOut}).`);
          this.cdr.detectChanges();
          return;
        }

        if (status === 409 && body?.conflictType === 'manual_block') {
          this.bookingModalManualBlockConflict = body.blockedCount;
          this.cdr.detectChanges();
          return;
        }

        this.bookingModalError = body?.message || this.i18n.t('adminPanel.bookings.saveError', undefined, 'Could not save booking. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  confirmOverrideManualBlocks(): void {
    this.bookingModalManualBlockConflict = null;
    this.saveBooking(true);
  }

  openDeleteConfirm(booking: BookingListItem): void {
    this.deletingBooking = booking;
    this.isDeleteConfirmModalOpen = true;
  }

  cancelDeleteBooking(): void {
    this.isDeleteConfirmModalOpen = false;
    this.deletingBooking = null;
  }

  onDeleteModalOverlayClick(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('booking-modal-overlay')) {
      this.cancelDeleteBooking();
    }
  }

  confirmDeleteBooking(): void {
    if (!this.deletingBooking) return;
    const booking = this.deletingBooking;
    this.isDeleteConfirmModalOpen = false;
    this.deletingBooking = null;

    this.bookingService.deleteBooking(booking.id).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          if (!response?.success) {
            this.bookingsError = this.i18n.t('adminPanel.bookings.deleteError', undefined, 'Could not delete booking.');
            this.cdr.detectChanges();
            return;
          }
          this.bookingPageCache.clear();
          this.loadBookings(1);
          this.loadCalendarBookings();
          this.loadBlockedDates();
          this.bookingMessage = this.i18n.t('adminPanel.bookings.deleteSuccess', undefined, 'Booking deleted successfully.');
          this.cdr.detectChanges();
          setTimeout(() => { this.ngZone.run(() => { this.bookingMessage = ''; this.cdr.detectChanges(); }); }, 4000);
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.bookingsError = this.i18n.t('adminPanel.bookings.deleteError', undefined, 'Could not delete booking. Please try again.');
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ── Booking tab pagination/search/sort ────────────────

  goToBookingPage(page: number): void {
    if (page < 1 || page > this.bookingTotalPages) return;
    this.loadBookings(page, true);
  }

  hasBookingPreviousPage(): boolean { return this.bookingPage > 1; }
  hasBookingNextPage(): boolean { return this.bookingPage < this.bookingTotalPages; }

  onBookingSearchInput(value: string): void {
    this.bookingSearchTerm = value;
    clearTimeout(this.bookingSearchDebounceTimer);
    this.bookingSearchDebounceTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.bookingPageCache.clear();
        this.loadBookings(1);
      });
    }, 350);
  }

  clearBookingSearch(): void {
    clearTimeout(this.bookingSearchDebounceTimer);
    this.bookingSearchTerm = '';
    this.bookingPageCache.clear();
    this.loadBookings(1);
  }

  onBookingPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = Number(select.value);
    if (newSize === this.bookingPageSize) return;
    this.bookingPageSize = newSize;
    this.bookingPageCache.clear();
    this.loadBookings(1);
  }

  onBookingSortFieldChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.bookingSortField = select.value;
    this.bookingPageCache.clear();
    this.loadBookings(1);
  }

  onBookingSortDirToggle(): void {
    this.bookingSortDir = this.bookingSortDir === 'DESC' ? 'ASC' : 'DESC';
    this.bookingPageCache.clear();
    this.loadBookings(1);
  }

  refreshBookings(): void {
    clearTimeout(this.bookingSearchDebounceTimer);
    this.bookingPageCache.clear();
    this.loadBookings(1);
  }

  // ── Language ──────────────────────────────────────────

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

  // ── Calendar init ─────────────────────────────────────

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
      onClose: (selectedDates: Date[]) => {
        // If only start selected (no end), clear the selection
        if (selectedDates.length === 1) {
          this.ngZone.run(() => this.clearSelection());
        }
      },
      onChange: (selectedDates: Date[]) => this.ngZone.run(() => this.handleCalendarChange(selectedDates)),
      onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
        const dayDate = (dayElem as any).dateObj as Date | undefined;
        if (!dayDate) return;

        const dateKey = this.toDateKey(dayDate);
        const checkOutBooking = this.calendarBookings.find(b => b.checkOut === dateKey);
        const checkInBooking  = this.calendarBookings.find(b => b.checkIn  === dateKey);

        // Combined day: same date is checkout of one booking AND check-in of another
        if (checkOutBooking && checkInBooking) {
          dayElem.classList.add('booking-day', 'booking-combined');
          (dayElem as HTMLElement).style.setProperty('--booking-color',  checkOutBooking.color);
          (dayElem as HTMLElement).style.setProperty('--checkout-color', checkOutBooking.color);
          (dayElem as HTMLElement).style.setProperty('--checkin-color',  checkInBooking.color);
          const label = document.createElement('span');
          label.className = 'booking-day-label';
          label.textContent = '↩ ↪';
          label.title = `Out: ${checkOutBooking.guestName} (${checkOutBooking.checkIn} → ${checkOutBooking.checkOut})\nIn: ${checkInBooking.guestName} (${checkInBooking.checkIn} → ${checkInBooking.checkOut})`;
          dayElem.appendChild(label);
          return;
        }

        const midBooking  = this.calendarBookings.find(b => dateKey > b.checkIn && dateKey < b.checkOut);
        const bookingInfo = checkInBooking ?? checkOutBooking ?? midBooking;

        if (bookingInfo) {
          const isCheckIn  = dateKey === bookingInfo.checkIn;
          const isCheckOut = dateKey === bookingInfo.checkOut;

          dayElem.classList.add('booking-day');
          (dayElem as HTMLElement).style.setProperty('--booking-color', bookingInfo.color);

          if (isCheckIn) {
            dayElem.classList.add('booking-check-in');
            const label = document.createElement('span');
            label.className = 'booking-day-label';
            label.textContent = '↪ in';
            label.title = `${bookingInfo.guestName} (${bookingInfo.source})\n${bookingInfo.checkIn} → ${bookingInfo.checkOut}`;
            dayElem.appendChild(label);
          } else if (isCheckOut) {
            dayElem.classList.add('booking-check-out');
            if (this.isBlockedDate(dayDate)) dayElem.classList.add('booking-checkout-blocked');
            const label = document.createElement('span');
            label.className = 'booking-day-label';
            label.textContent = '↩ out';
            label.title = `${bookingInfo.guestName} (${bookingInfo.source})\n${bookingInfo.checkIn} → ${bookingInfo.checkOut}`;
            dayElem.appendChild(label);
          } else {
            // Mid day: show deferred check-in name if this is the first day after a combined day
            dayElem.classList.add('booking-mid');
            const deferredBooking = this.deferredCheckInMap.get(dateKey);
            if (deferredBooking) {
              const label = document.createElement('span');
              label.className = 'booking-day-label';
              label.textContent = deferredBooking.guestName.split(' ')[0];
              label.title = `${deferredBooking.guestName} (${deferredBooking.source})\n${deferredBooking.checkIn} → ${deferredBooking.checkOut}`;
              dayElem.appendChild(label);
            }
            // Only mid days open the edit modal — check-in/out allow normal range selection
            (dayElem as HTMLElement).style.cursor = 'pointer';
            dayElem.addEventListener('click', (e: Event) => {
              e.stopImmediatePropagation();
              e.preventDefault();
              this.ngZone.run(() => this.openEditBookingFromCalendar(bookingInfo.id));
            }, true);
          }
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dayDate >= today && this.isBlockedDate(dayDate)) {
          dayElem.classList.add('booked-day');
        }
      }
    });
  }

  private initModalDatePickers(): void {
    const checkInEl = document.getElementById('modalCheckInInput');
    const checkOutEl = document.getElementById('modalCheckOutInput');
    if (!checkInEl || !checkOutEl) return;

    if (this.modalCheckInFp) { this.modalCheckInFp.destroy(); this.modalCheckInFp = null; }
    if (this.modalCheckOutFp) { this.modalCheckOutFp.destroy(); this.modalCheckOutFp = null; }

    const locale = this.getFlatpickrLocaleByLanguage(this.i18n.getLanguage());

    this.modalCheckInFp = flatpickr(checkInEl, {
      dateFormat: 'Y-m-d',
      disableMobile: true,
      locale,
      onChange: (dates: Date[]) => {
        this.ngZone.run(() => {
          this.bookingModalData.checkIn = dates[0] ? this.toDateKey(dates[0]) : '';
          if (dates[0] && this.modalCheckOutFp) {
            this.modalCheckOutFp.jumpToDate(dates[0], false);
          }
        });
      }
    });

    this.modalCheckOutFp = flatpickr(checkOutEl, {
      dateFormat: 'Y-m-d',
      disableMobile: true,
      locale,
      onChange: (dates: Date[]) => {
        this.ngZone.run(() => {
          this.bookingModalData.checkOut = dates[0] ? this.toDateKey(dates[0]) : '';
        });
      }
    });

    if (this.bookingModalData.checkIn) this.modalCheckInFp.setDate(this.bookingModalData.checkIn, false);
    if (this.bookingModalData.checkOut) this.modalCheckOutFp.setDate(this.bookingModalData.checkOut, false);
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
      onOpen: () => {
        this.ngZone.run(() => {
          if (this.selectedStartDate && this.rangeToFp) {
            this.rangeToFp.jumpToDate(this.selectedStartDate, false);
          }
        });
      },
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

  // ── Data loading ──────────────────────────────────────

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
    this.cdr.detectChanges();
    const requestToken = ++this.inquiryRequestToken;

    this.inquiryService.getInquiries(page, this.inquiryPageSize, this.searchTerm || undefined, this.sortField, this.sortDir).pipe(
      finalize(() => {
        if (requestToken === this.inquiryRequestToken) {
          this.isInquiriesLoading = false;
          this.cdr.detectChanges();
        }
      })
    ).subscribe({
      next: (response) => {
        if (requestToken !== this.inquiryRequestToken) return;

        if (!response?.success) {
          this.inquiriesError = this.i18n.t('adminPanel.inquiries.loadError', undefined, 'Could not load inquiries.');
          this.cdr.detectChanges();
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

        this.cdr.detectChanges();
        this.prefetchInquiryPage(currentPage + 1);
        this.prefetchInquiryPage(currentPage - 1);
      },
      error: () => {
        if (requestToken !== this.inquiryRequestToken) return;
        this.inquiriesError = this.i18n.t('adminPanel.inquiries.loadError', undefined, 'Could not load inquiries.');
        this.cdr.detectChanges();
      }
    });
  }

  private prefetchInquiryPage(page: number): void {
    if (page < 1) return;
    if (this.inquiryTotalPagesCache && page > this.inquiryTotalPagesCache) return;
    if (this.inquiryPageCache.has(page)) return;

    this.inquiryService.getInquiries(page, this.inquiryPageSize, this.searchTerm || undefined, this.sortField, this.sortDir).subscribe({
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

  private loadBookings(page: number, useCacheFirst = false): void {
    const hasCachedPage = this.bookingPageCache.has(page);

    if (useCacheFirst && hasCachedPage) {
      this.bookings = this.bookingPageCache.get(page) || [];
      this.bookingPage = page;
      this.bookingTotalItems = this.bookingTotalItemsCache;
      this.bookingTotalPages = this.bookingTotalPagesCache;
      this.bookingsError = '';
      return;
    }

    this.isBookingsLoading = true;
    this.bookingsError = '';
    this.cdr.detectChanges();
    const requestToken = ++this.bookingRequestToken;

    this.bookingService.getBookings(page, this.bookingPageSize, this.bookingSearchTerm || undefined, this.bookingSortField, this.bookingSortDir).pipe(
      finalize(() => {
        if (requestToken === this.bookingRequestToken) {
          this.isBookingsLoading = false;
          this.cdr.detectChanges();
        }
      })
    ).subscribe({
      next: (response) => {
        if (requestToken !== this.bookingRequestToken) return;

        if (!response?.success) {
          this.bookingsError = this.i18n.t('adminPanel.bookings.loadError', undefined, 'Could not load bookings.');
          this.cdr.detectChanges();
          return;
        }

        const rows = Array.isArray(response.data) ? response.data : [];
        const pagination = response.pagination;
        const totalPages = Math.max(1, Number(pagination?.totalPages || 1));
        const totalItems = Math.max(0, Number(pagination?.totalItems || 0));
        const currentPage = Math.min(Math.max(1, Number(pagination?.page || page)), totalPages);

        this.bookingPageCache.set(currentPage, rows);
        this.bookingTotalItemsCache = totalItems;
        this.bookingTotalPagesCache = totalPages;
        this.bookings = rows;
        this.bookingPage = currentPage;
        this.bookingTotalPages = totalPages;
        this.bookingTotalItems = totalItems;
        this.cdr.detectChanges();
      },
      error: () => {
        if (requestToken !== this.bookingRequestToken) return;
        this.bookingsError = this.i18n.t('adminPanel.bookings.loadError', undefined, 'Could not load bookings.');
        this.cdr.detectChanges();
      }
    });
  }

  private loadCalendarBookings(): void {
    this.bookingService.getBookingsForCalendar().subscribe({
      next: (response) => {
        this.calendarBookings = Array.isArray(response?.data) ? response.data : [];
        this.rebuildDeferredCheckInMap();
        if (this.inlineFp) this.inlineFp.redraw();
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

  // ── Calendar helpers ──────────────────────────────────

  private getBookingForDate(date: Date): BookingCalendarItem | null {
    const dateKey = this.toDateKey(date);
    for (const booking of this.calendarBookings) {
      if (dateKey >= booking.checkIn && dateKey <= booking.checkOut) {
        return booking;
      }
    }
    return null;
  }

  private rebuildDeferredCheckInMap(): void {
    this.deferredCheckInMap.clear();
    for (const b of this.calendarBookings) {
      const [y, m, d] = b.checkIn.split('-').map(Number);
      this.deferredCheckInMap.set(this.toDateKey(new Date(y, m - 1, d + 1)), b);
    }
  }

  private updateSelectionState(blocked: boolean): void {
    if (!this.selectedDates.length || this.isCalendarSaving) return;

    // Block reserve/release only for mid-days of a booking (check-in and check-out are allowed)
    const bookedDays = this.selectedDates.filter(d => {
      const parts = d.split('-').map(Number);
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      const booking = this.getBookingForDate(date);
      if (!booking) return false;
      return d !== booking.checkIn && d !== booking.checkOut;
    });
    if (bookedDays.length > 0) {
      this.calendarError = `${bookedDays.length} selected date(s) are part of an existing booking and cannot be ${blocked ? 'manually blocked' : 'released'}.`;
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
        this.cdr.detectChanges();
        setTimeout(() => {
          this.ngZone.run(() => {
            this.calendarMessage = '';
            this.cdr.detectChanges();
          });
        }, 4000);
      },
      error: (err) => {
        this.calendarError = err?.error?.message || this.i18n.t('adminPanel.calendar.saveError', undefined, 'Could not update dates.');
      }
    });
  }

  private handleCalendarChange(selectedDates: Date[]): void {
    if (this.isSyncingToCalendar) return;

    if (selectedDates.length > 0) this.calendarMessage = '';
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
    const normalizedEnd = this.selectedEndDate && this.selectedEndDate >= startDate ? this.selectedEndDate : null;
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
    const normEnd = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;

    this.selectedStartDate = normStart;
    this.selectedEndDate = normEnd;
    this.selectedDates = normEnd ? this.enumerateDateRange(normStart, normEnd) : [this.toDateKey(normStart)];

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
      if (this.selectedStartDate) this.rangeFromFp.setDate(this.selectedStartDate, false);
      else this.rangeFromFp.clear(false);
    }
    if (this.rangeToFp) {
      if (this.selectedEndDate) this.rangeToFp.setDate(this.selectedEndDate, false);
      else this.rangeToFp.clear(false);
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
      case 'el': return GREEK_LOCALE_NO_TONOS;
      case 'ro': return Romanian;
      case 'sr': return Serbian;
      case 'bg': return Bulgarian;
      case 'tr': return Turkish;
      default: return 'default';
    }
  }

  private updateCalendarLocale(): void {
    const locale = this.getFlatpickrLocaleByLanguage(this.i18n.getLanguage());

    if (this.inlineFp) {
      this.inlineFp.set('locale', locale);
      this.inlineFp.redraw();
    }

    if (this.rangeFromFp) this.rangeFromFp.set('locale', locale);
    if (this.rangeToFp) this.rangeToFp.set('locale', locale);
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
