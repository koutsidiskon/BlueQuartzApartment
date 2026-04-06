import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageService, HouseImage } from '../../service/image';
import { CheckAvailability } from '../check-availability/check-availability';
import { ContactInfo } from '../contact-info/contact-info';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CheckAvailability, ContactInfo],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  private imageService = inject(ImageService);

  menuOpen = false;
  isGalleryLoading = true;
  galleryPreview: HouseImage[] = [];
  isViewerOpen = false;
  viewerIndex = 0;

  ngOnInit(): void {
    this.loadGalleryPreview();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  private loadGalleryPreview(): void {
    this.isGalleryLoading = true;

    this.imageService.getImages().subscribe({
      next: (images) => {
        const safeImages = Array.isArray(images) ? images : [];
        this.galleryPreview = safeImages
          .filter((img) => !!img?.url)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .slice(0, 8);
        this.isGalleryLoading = false;
      },
      error: () => {
        this.galleryPreview = [];
        this.isGalleryLoading = false;
      }
    });
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'bedroom': 'Master Suite',
      'living-room': 'Living Room',
      'kitchen': 'Kitchen',
      'bathroom': 'Bathroom',
      'veranda': 'Veranda'
    };

    return labels[category] || 'Blue Quartz';
  }

  openViewer(index: number, event: Event): void {
    event.preventDefault();
    this.viewerIndex = index;
    this.isViewerOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewer(): void {
    this.isViewerOpen = false;
    document.body.style.overflow = '';
  }

  goToSlide(index: number): void {
    if (!this.galleryPreview.length) return;
    this.viewerIndex = index;
  }

  showPrev(): void {
    if (!this.galleryPreview.length) return;
    this.viewerIndex = (this.viewerIndex - 1 + this.galleryPreview.length) % this.galleryPreview.length;
  }

  showNext(): void {
    if (!this.galleryPreview.length) return;
    this.viewerIndex = (this.viewerIndex + 1) % this.galleryPreview.length;
  }

  @HostListener('window:keydown', ['$event'])
  handleViewerKeydown(event: KeyboardEvent): void {
    if (!this.isViewerOpen) return;

    if (event.key === 'Escape') {
      this.closeViewer();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.showPrev();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.showNext();
    }
  }
}
