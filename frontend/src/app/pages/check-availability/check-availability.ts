import { Component, AfterViewInit, DoCheck, ViewChild, ElementRef, HostListener, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InquiryService } from '../../service/inquiry';
import { AvailabilityCalendarService } from '../../service/availability-calendar';
import { PrivacyPolicyDialogService } from '../../service/privacy-policy-dialog';
import { getSuccessPopupHtml } from './check-availability-popup.template';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { I18nService } from '../../service/i18n';
import flatpickr from 'flatpickr';
import { Bulgarian } from 'flatpickr/dist/l10n/bg.js';
import { Greek } from 'flatpickr/dist/l10n/gr.js';
import { Romanian } from 'flatpickr/dist/l10n/ro.js';
import { Serbian } from 'flatpickr/dist/l10n/sr.js';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';
import Swal from 'sweetalert2';

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

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

type RequiredFieldKey = 'fullName' | 'email' | 'checkIn' | 'checkOut' | 'guests' | 'gdprConsent';

// Replace with your Google reCAPTCHA v3 SITE key.
// This must match the key used in frontend/src/index.html script URL.
const RECAPTCHA_SITE_KEY: string = '6Ld6vqwsAAAAAEaQhbmrjCwTAxTNqH64GCr0qMmZ';
const MIN_STAY_NIGHTS = 5;

@Component({
  selector: 'app-check-availability',
  standalone: true,
                imports: [CommonModule, TranslatePipe],
  templateUrl: './check-availability.html',
  styleUrl: './check-availability.scss'
})
export class CheckAvailability implements AfterViewInit, DoCheck {
    private inquiryService = inject(InquiryService);
    private availabilityCalendar = inject(AvailabilityCalendarService);
    private privacyPolicyDialog = inject(PrivacyPolicyDialogService);
    private i18n = inject(I18nService);
    private destroyRef = inject(DestroyRef);

    @ViewChild('fullName') fullNameInput!: ElementRef;
    @ViewChild('email') emailInput!: ElementRef;
    @ViewChild('message') messageInput!: ElementRef;
    @ViewChild('botField') botFieldInput!: ElementRef;
    @ViewChild('gdprConsentInput') gdprConsentInput!: ElementRef;
    @ViewChild('checkInPicker') checkInPicker!: ElementRef;
    @ViewChild('checkOutPicker') checkOutPicker!: ElementRef;
    @ViewChild('guests') guestsInput!: ElementRef;
    @ViewChild('inlineCalendar') inlineCalendar!: ElementRef;

    private checkInFp: any;
    private checkOutFp: any;
    private inlineFp: any;
    private isSyncingFromInline = false;
    private blockedDateSet = new Set<string>();
    private lastRenderedLanguage = '';
    readonly minStayNights = MIN_STAY_NIGHTS;
    minStayError = false;
    blockedRangeError = false;
    isSubmitting = false;
    requiredFieldErrors: Record<RequiredFieldKey, boolean> = {
        fullName: false,
        email: false,
        checkIn: false,
        checkOut: false,
        guests: false,
        gdprConsent: false
    };

    ngAfterViewInit() {
        this.initDatePickers();
        this.loadBlockedDates();
        this.lastRenderedLanguage = this.i18n.getLanguage();
        this.updateDatePickerLocale();
        this.updateDatePickerPlaceholders();
    }

    ngDoCheck(): void {
        const currentLanguage = this.i18n.getLanguage();
        if (currentLanguage === this.lastRenderedLanguage) return;

        this.lastRenderedLanguage = currentLanguage;
        this.updateDatePickerLocale();
        this.updateDatePickerPlaceholders();
    }

    // Adjusts the number of months shown in the date pickers based on the window or phone for better responsiveness
    @HostListener('window:resize')
    onResize() {
        const isMobile = window.innerWidth <= 768;
        const months = isMobile ? 1 : 2;
        if (this.checkInFp) this.checkInFp.set('showMonths', months);
        if (this.checkOutFp) this.checkOutFp.set('showMonths', months);
        // inline calendar could also show 1 or 2 months if there is space
        if (this.inlineFp) {
               // checking window size explicitly since container width may vary
               const inlineMonths = window.innerWidth <= 992 ? 1 : 1; 
               this.inlineFp.set('showMonths', inlineMonths);
        }
    }

    // Initializes the flatpickr date pickers for check-in, check-out, and the inline calendar
    // Sets up synchronization between the check-in/check-out pickers and the inline calendar
    private initDatePickers() {
        if (this.checkInPicker?.nativeElement && this.checkOutPicker?.nativeElement) {
        const locale = this.getFlatpickrLocaleByLanguage(this.i18n.getLanguage());
        const isMobile = window.innerWidth <= 768;
        const months = isMobile ? 1 : 2;

        // Initialize the check-out picker first to set its minDate based on check-in selection
        this.checkOutFp = flatpickr(this.checkOutPicker.nativeElement, {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            showMonths: months,
            monthSelectorType: 'static',
            shorthandCurrentMonth: false,
            locale,
            disable: [(date: Date) => this.isBlockedDate(date)],
            altInput: true,
            altFormat: 'F j, Y',
            disableMobile: true,

            onChange: (selectedDates) => {
                if (selectedDates.length > 0) {
                    this.clearFieldError('checkOut');
                }

                if (this.isSyncingFromInline) {
                    return;
                }

                if (selectedDates.length > 0 && this.checkInFp?.selectedDates?.length) {
                    const startDate = this.checkInFp.selectedDates[0];
                    const endDate = selectedDates[0];

                    if (!this.isMinimumStayValid(startDate, endDate)) {
                        this.minStayError = true;
                    } else {
                        this.minStayError = false;
                    }

                    this.blockedRangeError = this.hasBlockedDateInRange(startDate, endDate);
                } else {
                    this.blockedRangeError = false;
                }

                if (!this.inlineFp || !this.checkInFp?.selectedDates?.length) 
                    return;

                const startDate = this.checkInFp.selectedDates[0];
                
                if (selectedDates.length > 0) {
                    this.inlineFp.setDate([startDate, selectedDates[0]], false);
                }
            }
        });

        // Initialize the check-in picker and set up synchronization with the check-out picker and inline calendar
        this.checkInFp = flatpickr(this.checkInPicker.nativeElement, {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            showMonths: months,
            monthSelectorType: 'static',
            shorthandCurrentMonth: false,
            locale,
            disable: [(date: Date) => this.isBlockedDate(date)],
            altInput: true,
            altFormat: 'F j, Y',
            disableMobile: true,

            onChange: (selectedDates) => {
                if (selectedDates.length > 0) {
                    this.clearFieldError('checkIn');
                }

                if (this.checkOutFp && selectedDates.length > 0) {
                    const startDate = selectedDates[0];

                    this.checkOutFp.set('minDate', startDate);

                    const currentCheckOut = this.checkOutFp?.selectedDates?.[0];
                    if (currentCheckOut && !this.isMinimumStayValid(startDate, currentCheckOut)) {
                        this.minStayError = true;
                    } else {
                        this.minStayError = false;
                    }

                    if (currentCheckOut) {
                        this.blockedRangeError = this.hasBlockedDateInRange(startDate, currentCheckOut);
                    } else {
                        this.blockedRangeError = false;
                    }

                    if (!this.isSyncingFromInline) {
                        setTimeout(() => this.checkOutFp.open(), 100);
                    }
                }

                if (!this.isSyncingFromInline && this.inlineFp && selectedDates.length > 0) {
                    const maybeEndDate = this.checkOutFp?.selectedDates?.[0];
                    const startDate = selectedDates[0];
                    if (maybeEndDate) {
                        this.inlineFp.setDate([startDate, maybeEndDate], false);
                    } else {
                        this.inlineFp.setDate([startDate], false);
                    }
                }
            }
        });

        // Apply native validation attributes to the altInput fields of the date pickers for better mobile support
        const applyNativeValidation = (fp: any, id: string) => {
            if (fp && fp.altInput) {
            fp.altInput.required = true;
            fp.altInput.removeAttribute('readonly'); 
            fp.altInput.setAttribute('inputmode', 'none'); 
            fp.altInput.setAttribute('autocomplete', 'one-time-code');
            fp.altInput.id = id; // Give the visible input the label's target ID
            fp.input.id = id + '-hidden'; // Rename the hidden input
            fp.altInput.addEventListener('keydown', (e: Event) => e.preventDefault()); 
            }
        };

        applyNativeValidation(this.checkInFp, 'checkIn');
        applyNativeValidation(this.checkOutFp, 'checkOut');
        this.updateDatePickerPlaceholders();
        }

        // Init the inline calendar for availability presentation on the right side
        if (this.inlineCalendar?.nativeElement) {
            const locale = this.getFlatpickrLocaleByLanguage(this.i18n.getLanguage());
            this.inlineFp = flatpickr(this.inlineCalendar.nativeElement, {
                inline: true,
                minDate: 'today',
                showMonths: 1,  
                mode: 'range',
                dateFormat: 'Y-m-d',
                locale,
                monthSelectorType: 'static',
                shorthandCurrentMonth: false,
                disableMobile: true,
                onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
                    const dayDate = (dayElem as any).dateObj as Date | undefined;
                    if (!dayDate) return;

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (dayDate >= today && this.isBlockedDate(dayDate)) {
                        dayElem.classList.add('booked-day');
                    }
                },
                onChange: (selectedDates) => this.syncDateRangeFromInlineCalendar(selectedDates),
                // Disable dates to visually show booked days:
                // disable: ['2026-04-10', '2026-04-11', '2026-04-12']  // Add dummy dates if you wish
            });
        }
    }

    private loadBlockedDates(): void {
        this.availabilityCalendar.blockedDates$.pipe(
            filter((dates): dates is string[] => dates !== null),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(dates => this.applyBlockedDates(dates));

        this.availabilityCalendar.getBlockedDates().subscribe({
            error: (error) => console.error('Could not load blocked dates:', error)
        });
    }

    private applyBlockedDates(dates: string[]): void {
        const normalizedDates = dates
            .map((date) => String(date || '').trim())
            .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));

        this.blockedDateSet = new Set(normalizedDates);

        const applyDisableRule = (fp: any): void => {
            if (!fp) return;
            fp.set('disable', [(date: Date) => this.isBlockedDate(date)]);
            fp.redraw();
        };

        applyDisableRule(this.checkInFp);
        applyDisableRule(this.checkOutFp);

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

    private updateDatePickerLocale(): void {
        const locale = this.getFlatpickrLocaleByLanguage(this.i18n.getLanguage());

        const applyLocale = (fp: any): void => {
            if (!fp) return;

            fp.set('locale', locale);
            fp.redraw();

            if (fp.selectedDates?.length) {
                fp.setDate([...fp.selectedDates], false);
            }
        };

        applyLocale(this.checkInFp);
        applyLocale(this.checkOutFp);
        applyLocale(this.inlineFp);
    }

    private updateDatePickerPlaceholders(): void {
        const checkInPlaceholder = this.i18n.t('checkAvailability.form.checkInPlaceholder');
        const checkOutPlaceholder = this.i18n.t('checkAvailability.form.checkOutPlaceholder');

        if (this.checkInPicker?.nativeElement) {
            this.checkInPicker.nativeElement.placeholder = checkInPlaceholder;
        }
        if (this.checkOutPicker?.nativeElement) {
            this.checkOutPicker.nativeElement.placeholder = checkOutPlaceholder;
        }

        if (this.checkInFp?.altInput) {
            this.checkInFp.altInput.placeholder = checkInPlaceholder;
        }
        if (this.checkOutFp?.altInput) {
            this.checkOutFp.altInput.placeholder = checkOutPlaceholder;
        }
    }

    // Synchronizes the selected date range from the inline calendar to the check-in and check-out pickers
    private syncDateRangeFromInlineCalendar(selectedDates: Date[]): void {

        if (!this.checkInFp || !this.checkOutFp) return;

        this.isSyncingFromInline = true;
        try {
            if (selectedDates.length === 0) {
                this.checkInFp.clear();
                this.checkOutFp.clear();
                this.minStayError = false;
                this.blockedRangeError = false;
                return;
            }

            const [startDate, endDate] = selectedDates;

            if (!endDate) {
                this.checkInFp.setDate(startDate, true);
                this.clearFieldError('checkIn');
                this.checkOutFp.set('minDate', startDate);
                this.checkOutFp.clear();
                this.clearFieldError('checkOut');
                this.minStayError = false;
                this.blockedRangeError = false;
                return;
            }

            this.checkInFp.setDate(startDate, true);
            this.clearFieldError('checkIn');
            this.checkOutFp.set('minDate', startDate);
            this.checkOutFp.setDate(endDate, true);
            this.clearFieldError('checkOut');
            this.minStayError = !this.isMinimumStayValid(startDate, endDate);
            this.blockedRangeError = this.hasBlockedDateInRange(startDate, endDate);
        } finally {
            this.isSyncingFromInline = false;
        }
    }

    private hasBlockedDateInRange(checkInDate: Date, checkOutDate: Date): boolean {
        const start = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
        const end = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate());

        if (end <= start) {
            return false;
        }

        for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
            if (this.isBlockedDate(cursor)) {
                return true;
            }
        }

        return false;
    }

    private isMinimumStayValid(checkInDate: Date, checkOutDate: Date): boolean {
        const start = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
        const end = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate());
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        const nights = Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);
        return nights >= MIN_STAY_NIGHTS;
    }

    openPrivacyPolicy(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.privacyPolicyDialog.open();
    }

    private getRecaptchaToken(): Promise<string> {
      return new Promise((resolve, reject) => {
                if (RECAPTCHA_SITE_KEY === 'YOUR_SITE_KEY') {
                                        reject(new Error(this.i18n.t('checkAvailability.alerts.recaptchaConfigError')));
                    return;
                }

        const grecaptcha = window.grecaptcha;
        if (!grecaptcha) {
                    reject(new Error(this.i18n.t('checkAvailability.alerts.recaptchaScriptMissing')));
          return;
        }

        grecaptcha.ready(() => {
                    grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'inquiry' })
            .then((token: string) => resolve(token))
            .catch((error: any) => reject(error));
        });
      });
    }

    onSubmit(event: Event) {
    event.preventDefault();

    if (!this.validateRequiredFields()) {
        return;
    }

    const nameValue = this.fullNameInput?.nativeElement.value || '';
    const firstName = nameValue.split(' ')[0];

    this.isSubmitting = true;

    this.getRecaptchaToken().then((recaptchaToken) => {
      const inquiryData = {
          fullName: nameValue,
          email: this.emailInput?.nativeElement.value || '',
          message: this.messageInput?.nativeElement.value || '',
          botField: this.botFieldInput?.nativeElement.value?.trim() || '',
          recaptchaToken,
          guests: this.guestsInput?.nativeElement.value ? parseInt(this.guestsInput.nativeElement.value, 10) : 1,
          checkIn: this.checkInFp.formatDate(this.checkInFp.selectedDates[0], 'Y-m-d'),
          checkOut: this.checkOutFp.formatDate(this.checkOutFp.selectedDates[0], 'Y-m-d')
      };

      this.inquiryService.createInquiry(inquiryData).subscribe({
          next: (_) => {
              this.isSubmitting = false;
              Swal.fire({
                  title: this.i18n.t('checkAvailability.popup.greeting', { firstName }),
                  icon: 'success',
                  iconColor: '#003366',
                  width: '600px',
                  html: getSuccessPopupHtml(inquiryData.email, {
                      thankYou: this.i18n.t('checkAvailability.popup.thankYou'),
                      apartmentName: this.i18n.t('checkAvailability.popup.apartmentName'),
                      inquiryReceived: this.i18n.t('checkAvailability.popup.inquiryReceived'),
                      emailSent: this.i18n.t('checkAvailability.popup.emailSent'),
                      followUp: this.i18n.t('checkAvailability.popup.followUp'),
                      spamHint: this.i18n.t('checkAvailability.popup.spamHint'),
                      team: this.i18n.t('checkAvailability.popup.team')
                  }),
                  confirmButtonText: this.i18n.t('common.close'),
                  confirmButtonColor: '#003366',
                  background: '#ffffff',
                  showClass: {
                      popup: 'animate__animated animate__fadeInDown'
                  }
              });
              this.resetForm(); 
          },
          error: (err) => {
              this.isSubmitting = false;
              Swal.fire({
                  title: this.i18n.t('checkAvailability.alerts.submissionError.title'),
                  text: this.i18n.t('checkAvailability.alerts.submissionError.text'),
                  icon: 'error',
                  confirmButtonColor: '#003366'
              });
              console.error('Error in backend:', err);
          }
      });
    }).catch((error) => {
      this.isSubmitting = false;
      Swal.fire({
                title: this.i18n.t('checkAvailability.alerts.recaptchaError.title'),
                text: this.i18n.t('checkAvailability.alerts.recaptchaError.text'),
        icon: 'error',
        confirmButtonColor: '#003366'
      });
      console.error('reCAPTCHA error:', error);
    });
    }

    // Resets the form fields and clears the date pickers after a successful submission
    private resetForm(): void {
        this.fullNameInput.nativeElement.value = '';
        this.emailInput.nativeElement.value = '';
        this.messageInput.nativeElement.value = '';
        if (this.botFieldInput?.nativeElement) this.botFieldInput.nativeElement.value = '';
        if (this.gdprConsentInput?.nativeElement) this.gdprConsentInput.nativeElement.checked = false;
        if (this.guestsInput?.nativeElement) this.guestsInput.nativeElement.value = '1';
        if (this.checkInFp) this.checkInFp.clear();
        if (this.checkOutFp) this.checkOutFp.clear();
        if (this.inlineFp) this.inlineFp.clear();
        this.resetRequiredFieldErrors();
    }

    clearFieldError(field: RequiredFieldKey): void {
        this.requiredFieldErrors[field] = false;
        if (field === 'checkIn' || field === 'checkOut') {
            this.minStayError = false;
        }
    }

    shouldShowFieldError(field: RequiredFieldKey): boolean {
        return this.requiredFieldErrors[field];
    }

    private validateRequiredFields(): boolean {
        const fullName = (this.fullNameInput?.nativeElement?.value || '').trim();
        const email = (this.emailInput?.nativeElement?.value || '').trim();
        const guests = (this.guestsInput?.nativeElement?.value || '').toString().trim();
        const hasCheckIn = this.checkInFp?.selectedDates.length > 0;
        const hasCheckOut = this.checkOutFp?.selectedDates.length > 0;
        const hasGdprConsent = !!this.gdprConsentInput?.nativeElement?.checked;

        this.requiredFieldErrors.fullName = !fullName;
        this.requiredFieldErrors.email = !email;
        this.requiredFieldErrors.checkIn = !hasCheckIn;
        this.requiredFieldErrors.checkOut = !hasCheckOut;
        this.requiredFieldErrors.guests = !guests;
        this.requiredFieldErrors.gdprConsent = !hasGdprConsent;

        if (hasCheckIn && hasCheckOut) {
            const startDate = this.checkInFp.selectedDates[0];
            const endDate = this.checkOutFp.selectedDates[0];
            this.minStayError = !this.isMinimumStayValid(startDate, endDate);
            this.blockedRangeError = this.hasBlockedDateInRange(startDate, endDate);
        } else {
            this.minStayError = false;
            this.blockedRangeError = false;
        }

        const hasRequiredFieldErrors = (Object.keys(this.requiredFieldErrors) as RequiredFieldKey[])
            .some((field) => this.requiredFieldErrors[field]);

        return !hasRequiredFieldErrors && !this.minStayError && !this.blockedRangeError;
    }

    private resetRequiredFieldErrors(): void {
        this.requiredFieldErrors.fullName = false;
        this.requiredFieldErrors.email = false;
        this.requiredFieldErrors.checkIn = false;
        this.requiredFieldErrors.checkOut = false;
        this.requiredFieldErrors.guests = false;
        this.requiredFieldErrors.gdprConsent = false;
        this.minStayError = false;
        this.blockedRangeError = false;
    }
}
