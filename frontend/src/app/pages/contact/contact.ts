import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InquiryService } from '../../service/inquiry';
import { getSuccessPopupHtml } from './contact-popup.template';
import flatpickr from 'flatpickr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class Contact implements AfterViewInit {
    private inquiryService = inject(InquiryService);

    @ViewChild('fullName') fullNameInput!: ElementRef;
    @ViewChild('email') emailInput!: ElementRef;
    @ViewChild('message') messageInput!: ElementRef;
    @ViewChild('checkInPicker') checkInPicker!: ElementRef;
    @ViewChild('checkOutPicker') checkOutPicker!: ElementRef;

    private checkInFp: any;
    private checkOutFp: any;

    ngAfterViewInit() {
        this.initDatePickers();
    }

    @HostListener('window:resize')
    onResize() {
        const isMobile = window.innerWidth <= 768;
        const months = isMobile ? 1 : 2;
        if (this.checkInFp) this.checkInFp.set('showMonths', months);
        if (this.checkOutFp) this.checkOutFp.set('showMonths', months);
    }

    private initDatePickers() {
        if (this.checkInPicker?.nativeElement && this.checkOutPicker?.nativeElement) {
        const isMobile = window.innerWidth <= 768;
        const months = isMobile ? 1 : 2;

        this.checkOutFp = flatpickr(this.checkOutPicker.nativeElement, {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            showMonths: months,
            altInput: true,
            altFormat: 'F j, Y',
            disableMobile: true,
        });

        this.checkInFp = flatpickr(this.checkInPicker.nativeElement, {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            showMonths: months,
            altInput: true,
            altFormat: 'F j, Y',
            disableMobile: true,
            onChange: (selectedDates, dateStr, instance) => {
            if (this.checkOutFp && selectedDates.length > 0) {
                this.checkOutFp.set('minDate', selectedDates[0]);
                setTimeout(() => this.checkOutFp.open(), 100);
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
        if (this.checkInFp) this.checkInFp.clear();
        if (this.checkOutFp) this.checkOutFp.clear();
    }
}
