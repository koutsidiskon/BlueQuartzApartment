import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class PrivacyPolicyDialogService {
  open(): void {
    Swal.fire({
      title: 'Privacy Policy',
      html: `
        <iframe
          src="/privacy-policy.html"
          title="Privacy Policy"
          style="width:100%;height:72vh;border:0;border-radius:8px;background:#fff;"
          loading="lazy"
        ></iframe>
      `,
      width: '95vw',
      padding: '0.8rem',
      showCloseButton: true,
      confirmButtonText: 'Close',
      confirmButtonColor: '#003366',
      customClass: {
        popup: 'privacy-policy-popup',
      },
    });
  }
}
