import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { I18nService } from './i18n';

@Injectable({ providedIn: 'root' })
export class PrivacyPolicyDialogService {
  constructor(private i18n: I18nService) {}

  open(): void {
    Swal.fire({
      title: this.i18n.t('privacyDialog.title'),
      html: `
        <iframe
          src="/privacy-policy.html"
          title="${this.i18n.t('privacyDialog.iframeTitle')}"
          style="width:100%;height:72vh;border:0;border-radius:8px;background:#fff;"
          loading="lazy"
        ></iframe>
      `,
      width: '95vw',
      padding: '0.8rem',
      showCloseButton: true,
      confirmButtonText: this.i18n.t('common.close'),
      confirmButtonColor: '#003366',
      customClass: {
        popup: 'privacy-policy-popup',
      },
    });
  }
}
