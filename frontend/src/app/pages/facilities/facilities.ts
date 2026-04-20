import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, retry, timer, timeout } from 'rxjs';
import { ImageService, HouseImage } from '../../service/image'; 
import { FullscreenGallery } from '../../shared/fullscreen-gallery/fullscreen-gallery';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { I18nService } from '../../service/i18n';

interface AmenityFeature {
  icon: string;
  label: string;
}

interface HouseRule {
  icon: string;
  key: string;
}

@Component({
  selector: 'app-facilities',
  standalone: true,
  imports: [CommonModule, RouterLink, FullscreenGallery, TranslatePipe],
  templateUrl: './facilities.html',
  styleUrls: ['./facilities.scss']
})
export class Facilities implements OnInit {
  roomGroups: { category: string, images: HouseImage[] }[] = [];
  viewerImages: HouseImage[] = [];
  isLoading = false;
  loadError = '';
  isViewerOpen = false;
  viewerIndex = 0;
  houseRules: HouseRule[] = [
    {
      icon: 'smoke_free',
      key: 'noSmoking'
    },
    {
      icon: 'celebration',
      key: 'noParties'
    },
    {
      icon: 'nightlight',
      key: 'quietHours'
    },
    {
      icon: 'login',
      key: 'checkIn'
    },
    {
      icon: 'logout',
      key: 'checkOut'
    },
    {
      icon: 'build_circle',
      key: 'damage'
    },
    {
      icon: 'group',
      key: 'registeredGuests'
    },
    {
      icon: 'lock',
      key: 'secureHome'
    }
  ];

  constructor(
    private imageService: ImageService,
    private cdr: ChangeDetectorRef,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadImages();
  }

  // Method to load and prepare images for the facilities page
  loadImages(): void {
    this.isLoading = true;
    this.loadError = '';
    this.cdr.detectChanges(); // Ensure the loader UI gets rendered immediately

    this.imageService.getPreparedImages().pipe(
      timeout(10000),
      retry({
        count: 2,
        delay: (_error, retryCount) => timer(retryCount * 800)
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges(); // Forcing update when all completes
      })
    ).subscribe({
      next: (data) => {
        const categorizedImages = data.filter((img) => !!img.category);
        this.viewerImages = categorizedImages;
        this.roomGroups = this.imageService.groupByCategory(categorizedImages);

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = this.i18n.t('facilitiesPage.status.loadError');
        console.error('Failed to load images from API.', err);
      }
    });

  }

  // retry loading images when user clicks retry button after a failure
  retryLoadImages(): void {
    this.loadImages();
  }

  // Method to open the gallery viewer based on the clicked image URL
  openViewerByUrl(photoUrl: string, event: Event): void {
    event.preventDefault();
    if (!this.viewerImages.length) return;

    const idx = this.viewerImages.findIndex((img) => img.url === photoUrl);
    this.viewerIndex = idx >= 0 ? idx : 0;
    this.isViewerOpen = true;
  }

  // Helper methods to get contents 

  getCategoryLabel(cat: string): string {
    return this.i18n.t(
      `facilitiesPage.categories.${cat}`,
      undefined,
      this.i18n.t('facilitiesPage.categories.default')
    );
  }

  getRoomTitle(cat: string): string {
    return this.i18n.t(
      `facilitiesPage.titles.${cat}`,
      undefined,
      this.i18n.t('facilitiesPage.titles.default')
    );
  }

  getRoomDescription(cat: string): string {
    return this.i18n.t(
      `facilitiesPage.descriptions.${cat}`,
      undefined,
      this.i18n.t('facilitiesPage.descriptions.default')
    );
  }

  getFeatures(cat: string): AmenityFeature[] {
    const featureIcons: Record<string, string[]> = {
      'bedroom': ['king_bed', 'curtains', 'ac_unit', 'checkroom', 'local_laundry_service', 'bed'],
      'living-room': ['weekend', 'ac_unit', 'bed', 'tv', 'wifi'],
      'kitchen': ['kitchen', 'soup_kitchen', 'wine_bar', 'coffee_maker', 'local_dining'],
      'bathroom': ['shower', 'soap', 'mode_fan', 'cleaning_services'],
      'veranda': ['table_restaurant', 'wb_twilight', 'air']
    };

    const labels = this.i18n.tArray(`facilitiesPage.features.${cat}`);
    const fallbackLabels = this.i18n.tArray('facilitiesPage.features.default');
    const resolvedLabels = labels.length ? labels : fallbackLabels;
    const icons = featureIcons[cat] || ['star'];

    return resolvedLabels.map((label, index) => ({
      icon: icons[index] || icons[icons.length - 1] || 'star',
      label
    }));
  }
}