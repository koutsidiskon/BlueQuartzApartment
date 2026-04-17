import { Component, AfterViewInit, DoCheck, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InquiryService } from '../../service/inquiry';
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

// Replace with your Google reCAPTCHA v3 SITE key.
// This must match the key used in frontend/src/index.html script URL.
const RECAPTCHA_SITE_KEY: string = '6Ld6vqwsAAAAAEaQhbmrjCwTAxTNqH64GCr0qMmZ';

@Component({
  selector: 'app-check-availability',
  standalone: true,
                imports: [CommonModule, TranslatePipe],
  templateUrl: './check-availability.html',
  styleUrl: './check-availability.scss'
})
export class CheckAvailability implements AfterViewInit, DoCheck {
    private inquiryService = inject(InquiryService);
                private privacyPolicyDialog = inject(PrivacyPolicyDialogService);
                private i18n = inject(I18nService);

    @ViewChild('fullName') fullNameInput!: ElementRef;
    @ViewChild('email') emailInput!: ElementRef;
    @ViewChild('message') messageInput!: ElementRef;
    @ViewChild('botField') botFieldInput!: ElementRef;
    @ViewChild('checkInPicker') checkInPicker!: ElementRef;
    @ViewChild('checkOutPicker') checkOutPicker!: ElementRef;
    @ViewChild('guests') guestsInput!: ElementRef;
    @ViewChild('inlineCalendar') inlineCalendar!: ElementRef;

    private checkInFp: any;
    private checkOutFp: any;
    private inlineFp: any;
    private isSyncingFromInline = false;
    private lastRenderedLanguage = '';

    ngAfterViewInit() {
        this.initDatePickers();
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
            altInput: true,
            altFormat: 'F j, Y',
            disableMobile: true,

            onChange: (selectedDates) => {

                if (this.isSyncingFromInline || !this.inlineFp || !this.checkInFp?.selectedDates?.length) 
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
            altInput: true,
            altFormat: 'F j, Y',
            disableMobile: true,

            onChange: (selectedDates) => {

                if (this.checkOutFp && selectedDates.length > 0) {

                    this.checkOutFp.set('minDate', selectedDates[0]);

                    if (!this.isSyncingFromInline) {
                        setTimeout(() => this.checkOutFp.open(), 100);
                    }
                }

                if (!this.isSyncingFromInline && this.inlineFp && selectedDates.length > 0) {
                    const maybeEndDate = this.checkOutFp?.selectedDates?.[0];
                    this.inlineFp.setDate(maybeEndDate ? [selectedDates[0], maybeEndDate] : [selectedDates[0]], false);
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
                onChange: (selectedDates) => this.syncDateRangeFromInlineCalendar(selectedDates),
                // Disable dates to visually show booked days:
                // disable: ['2026-04-10', '2026-04-11', '2026-04-12']  // Add dummy dates if you wish
            });
        }
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
                return;
            }

            const [startDate, endDate] = selectedDates;

            this.checkInFp.setDate(startDate, true);
            this.checkOutFp.set('minDate', startDate);

            if (endDate) {
                this.checkOutFp.setDate(endDate, true);
            } else {
                this.checkOutFp.clear();
            }
        } finally {
            this.isSyncingFromInline = false;
        }
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

    const hasCheckIn = this.checkInFp?.selectedDates.length > 0;
    const hasCheckOut = this.checkOutFp?.selectedDates.length > 0;

    if (!hasCheckIn || !hasCheckOut) {
        Swal.fire({
            title: this.i18n.t('checkAvailability.alerts.missingDates.title'),
            icon: 'warning',
            confirmButtonColor: '#003366'
        });
        return; 
    }

    const nameValue = this.fullNameInput?.nativeElement.value || '';
    const firstName = nameValue.split(' ')[0];

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
          next: (response) => {
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
        if (this.guestsInput?.nativeElement) this.guestsInput.nativeElement.value = '1';
        if (this.checkInFp) this.checkInFp.clear();
        if (this.checkOutFp) this.checkOutFp.clear();
        if (this.inlineFp) this.inlineFp.clear();
    }
}
