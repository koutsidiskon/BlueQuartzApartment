import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import GLightbox from 'glightbox';
import { finalize, retry, timer, timeout } from 'rxjs';
import { ImageService, HouseImage } from '../../service/image'; 

@Component({
  selector: 'app-facilities',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './facilities.html',
  styleUrls: ['./facilities.scss']
})
export class Facilities implements OnInit {
  private lightbox: any;
  private lightboxRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  roomGroups: { category: string, images: HouseImage[] }[] = [];
  isLoading = false;
  loadError = '';

  constructor(
    private imageService: ImageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadImages();
  }

  ngOnDestroy(): void {
    if (this.lightboxRefreshTimer) {
      clearTimeout(this.lightboxRefreshTimer);
      this.lightboxRefreshTimer = null;
    }
    this.destroyLightbox();
  }

  private scheduleLightboxRefresh(): void {
    if (this.lightboxRefreshTimer) {
      clearTimeout(this.lightboxRefreshTimer);
    }

    // Wait for Angular template updates, then bind/reload once.
    this.lightboxRefreshTimer = setTimeout(() => {
      if (!this.lightbox) {
        this.lightbox = GLightbox({
          selector: '.facilities-page .glightbox',
          touchNavigation: true,
          loop: true,
          closeButton: true
        });
      } else {
        this.lightbox.reload();
      }
      this.lightboxRefreshTimer = null;
    }, 0);
  }

  private destroyLightbox(): void {
    if (this.lightbox) {
      this.lightbox.destroy();
      this.lightbox = null;
    }
  }

  loadImages(): void {
    this.isLoading = true;
    this.loadError = '';
    this.destroyLightbox();
    this.cdr.detectChanges(); // Ensure the loader UI gets rendered immediately

    this.imageService.getImages().pipe(
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
        const safeData = Array.isArray(data) ? data : [];

        const normalized = safeData
          .filter((img) => !!img?.url && !!img?.category)
          .map((img) => ({
            ...img,
            url: img.url.trim(),
            category: img.category.trim()
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder);

        // 1. Ομαδοποιούμε προσωρινά
        const tempGrouped = normalized.reduce((acc, img) => {
          if (!acc[img.category]) acc[img.category] = [];
          acc[img.category].push(img);
          return acc;
        }, {} as { [key: string]: HouseImage[] });

        // 2. Μετατρέπουμε το λεξικό στον Ασφαλή Πίνακα (Array)
        this.roomGroups = Object.keys(tempGrouped).map(key => ({
          category: key,
          images: tempGrouped[key]
        }));

        this.cdr.detectChanges(); // Trigger change detection BEFORE checking length and scheduling lightbox

        if (this.roomGroups.length) {
          this.scheduleLightboxRefresh();
        }
      },
      error: (err) => {
        this.loadError = 'Unable to load images right now. Please try again in a moment.';
        console.error('Failed to load images from API.', err);
      }
    });

  }

  retryLoadImages(): void {
    this.loadImages();
  }


  getCategoryLabel(cat: string): string {
    const labels: any = {
      'bedroom': 'Sleep & Rest',
      'living-room': 'Relaxation',
      'kitchen': 'Gastronomy',
      'bathroom': 'Wellness',
      'veranda': 'Vistas'
    };
    return labels[cat] || 'Exclusive Amenities';
  }

  getRoomTitle(cat: string): string {
    const titles: any = {
      'bedroom': 'The Master Suite',
      'living-room': 'The Living Space',
      'kitchen': 'Gourmet Kitchen',
      'bathroom': 'The Quartz Bathroom',
      'veranda': 'Sea-view Veranda'
    };
    return titles[cat] || 'Luxury Space';
  }

  getRoomDescription(cat: string): string {
    const descriptions: any = {
      'bedroom': 'Immerse yourself in a serene master suite designed for deep rest and effortless comfort. Soft textures, carefully selected linens, and blackout curtains create a calm atmosphere, while thoughtful details make every evening feel peaceful and every morning feel refreshing.',
      'living-room': 'Our spacious living area invites you to unwind in style, with a generous corner sofa, warm ambient lighting, and an elegant open layout that connects comfort with sophistication. It is the ideal setting for slow mornings, family moments, or relaxed evenings after the beach.',
      'kitchen': 'The gourmet kitchen combines modern aesthetics with practical functionality, fully equipped for everything from quick breakfasts to complete home-cooked dinners. Premium appliances, quality cookware, and a clean design ensure a smooth and enjoyable cooking experience.',
      'bathroom': 'Step into a refined bathroom experience where minimalist design meets everyday luxury. The walk-in rainfall shower, quality amenities, and soothing atmosphere are crafted to help you reset, recharge, and enjoy a true sense of wellness throughout your stay.',
      'veranda': 'The sea-view veranda is your private front-row seat to the natural beauty of Thassos. Enjoy sunrise coffee, golden-hour relaxation, and peaceful evenings with a gentle breeze, surrounded by open views that make every moment feel memorable.'
    };
    return descriptions[cat] || 'Experience absolute comfort in our premises.';
  }

  getFeatures(cat: string): string[] {
    const features: any = {
      'bedroom': ["Extra pillows, blankets and sheets for your comfort",'High-thread count cotton sheets', 'Blackout curtains',"Iron for clothes" ], 
      'living-room': ['Convertible premium corner sofa', 'Ambient architectural lighting'],
      'kitchen': ['Nespresso® Vertuo Coffee System', 'Professional-grade cookware'],
      'bathroom': ['Walk-in rainfall shower', 'Premium organic toiletries'],
      'veranda': ['Outdoor lounge furniture', 'Unobstructed sea views']
    };
    return features[cat] || ['Premium amenities', 'Hand-picked details'];
  }
}