import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InquiryService } from '../../service/inquiry';
import { getSuccessPopupHtml } from './check-availability-popup.template';
import flatpickr from 'flatpickr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-check-availability',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './check-availability.html',
  styleUrl: './check-availability.scss'
})
export class CheckAvailability implements AfterViewInit {
    private inquiryService = inject(InquiryService);

    @ViewChild('fullName') fullNameInput!: ElementRef;
    @ViewChild('email') emailInput!: ElementRef;
    @ViewChild('message') messageInput!: ElementRef;
    @ViewChild('checkInPicker') checkInPicker!: ElementRef;
    @ViewChild('checkOutPicker') checkOutPicker!: ElementRef;
    @ViewChild('guests') guestsInput!: ElementRef;
    @ViewChild('inlineCalendar') inlineCalendar!: ElementRef;

    private checkInFp: any;
    private checkOutFp: any;
    private inlineFp: any;
    private isSyncingFromInline = false;

    ngAfterViewInit() {
        this.initDatePickers();
    }

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

    private initDatePickers() {
        if (this.checkInPicker?.nativeElement && this.checkOutPicker?.nativeElement) {
        const isMobile = window.innerWidth <= 768;
        const months = isMobile ? 1 : 2;

        this.checkOutFp = flatpickr(this.checkOutPicker.nativeElement, {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            showMonths: months,
            monthSelectorType: 'static',
            shorthandCurrentMonth: false,
            altInput: true,
            altFormat: 'F j, Y',
            disableMobile: true,
            onChange: (selectedDates) => {
            if (this.isSyncingFromInline || !this.inlineFp || !this.checkInFp?.selectedDates?.length) return;

            const startDate = this.checkInFp.selectedDates[0];
            if (selectedDates.length > 0) {
                this.inlineFp.setDate([startDate, selectedDates[0]], false);
            }
            }
        });

        this.checkInFp = flatpickr(this.checkInPicker.nativeElement, {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            showMonths: months,
            monthSelectorType: 'static',
            shorthandCurrentMonth: false,
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
        }

        // Init the inline calendar for availability presentation on the right side
        if (this.inlineCalendar?.nativeElement) {
            this.inlineFp = flatpickr(this.inlineCalendar.nativeElement, {
                inline: true,
                minDate: 'today',
                showMonths: 1, // Let's keep it to 1 month for the sidebar width 
                mode: 'range',
                dateFormat: 'Y-m-d',
                monthSelectorType: 'static',
                shorthandCurrentMonth: false,
                disableMobile: true,
                onChange: (selectedDates) => this.syncDateRangeFromInlineCalendar(selectedDates),
                // Disable dates to visually show booked days:
                // disable: ['2026-04-10', '2026-04-11', '2026-04-12']  // Add dummy dates if you wish
            });
        }
    }

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

    onSubmit(event: Event) {
    event.preventDefault();

    const hasCheckIn = this.checkInFp?.selectedDates.length > 0;
    const hasCheckOut = this.checkOutFp?.selectedDates.length > 0;

    if (!hasCheckIn || !hasCheckOut) {
        // Προαιρετικά ένα μικρό warning αν λείπουν ημερομηνίες
        return; 
    }

    const nameValue = this.fullNameInput?.nativeElement.value || '';
    const firstName = nameValue.split(' ')[0];

    const inquiryData = {
        fullName: nameValue,
        email: this.emailInput?.nativeElement.value || '',
        message: this.messageInput?.nativeElement.value || '',
        guests: this.guestsInput?.nativeElement.value ? parseInt(this.guestsInput.nativeElement.value, 10) : 1,
        checkIn: this.checkInFp.formatDate(this.checkInFp.selectedDates[0], 'Y-m-d'),
        checkOut: this.checkOutFp.formatDate(this.checkOutFp.selectedDates[0], 'Y-m-d')
    };

    this.inquiryService.createInquiry(inquiryData).subscribe({
        next: (response) => {
            Swal.fire({
                title: `Hello, ${firstName}`,
                icon: 'success',
                iconColor: '#003366',
                width: '600px',
                html: getSuccessPopupHtml(inquiryData.email),
                confirmButtonText: 'Close',
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
                title: 'Something went wrong',
                text: 'We could not send your inquiry. Please try again later.',
                icon: 'error',
                confirmButtonColor: '#003366'
            });
            console.error('Error in backend:', err);
        }
    });
}

    private resetForm(): void {
        this.fullNameInput.nativeElement.value = '';
        this.emailInput.nativeElement.value = '';
        this.messageInput.nativeElement.value = '';
        if (this.guestsInput?.nativeElement) this.guestsInput.nativeElement.value = '1';
        if (this.checkInFp) this.checkInFp.clear();
        if (this.checkOutFp) this.checkOutFp.clear();
        if (this.inlineFp) this.inlineFp.clear();
    }
}
