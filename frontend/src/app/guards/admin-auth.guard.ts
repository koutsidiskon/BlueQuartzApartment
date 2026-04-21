import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminAuthService } from '../service/admin-auth';

export const adminAuthGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  return adminAuth.me().pipe(
    map((response) => {
      if (response.success && response.data) {
        return true;
      }

      return router.createUrlTree(['/admin/login']);
    }),
    catchError(() => of(router.createUrlTree(['/admin/login'])))
  );
};
