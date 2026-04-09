export interface SuccessPopupCopy {
    thankYou: string;
    apartmentName: string;
    inquiryReceived: string;
    emailSent: string;
    followUp: string;
    spamHint: string;
    team: string;
}

export function getSuccessPopupHtml(email: string, copy: SuccessPopupCopy): string {
    return `
        <style>
            .swal2-icon { transform: scale(0.75); margin: 10px auto !important; }
            .swal2-title { font-size: 1.3rem !important; }
        </style>
        <div style="color: #2c3e50; text-align: center; font-size: 0.95rem; line-height: 1.5;">
            <p style="margin-bottom: 15px;">
                ${copy.thankYou} <b>${copy.apartmentName}</b>. ${copy.inquiryReceived}
            </p>
            <p style="margin-bottom: 20px; color: #586776;">
                ${copy.emailSent}<br>
                <span style="color: #4a90e2; font-weight: 600;">${email}</span>
            </p>

            <div style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #1a3c5a; margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0; font-size: 0.9rem;">
                    ${copy.followUp}
                </p>
                <p style="margin: 0; font-size: 0.85rem; color: #666;">
                    <em>${copy.spamHint}</em>
                </p>
            </div>

            <p style="margin: 0; font-size: 0.9rem; color: #003366; font-style: italic;">
                ${copy.team}
            </p>
        </div>
    `;
}
