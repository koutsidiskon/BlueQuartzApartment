import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageService, HouseImage } from '../../service/image';
import { CheckAvailability } from '../check-availability/check-availability';
import { ContactInfo } from '../contact-info/contact-info';
import { FullscreenGallery } from '../../shared/fullscreen-gallery/fullscreen-gallery';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CheckAvailability, ContactInfo, FullscreenGallery, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private imageService = inject(ImageService);

  menuOpen = false;
  isGalleryLoading = true;
  galleryPreview: HouseImage[] = [];
  isViewerOpen = false;
  viewerIndex = 0;

  // Load gallery images on component initialization
  ngOnInit(): void {
    this.loadGalleryPreview();
  }

  // Load images for the gallery preview from api 
  private loadGalleryPreview(): void {

    this.isGalleryLoading = true;

    this.imageService.getGalleryPreviewImages(11).subscribe({
      next: (images) => {
        this.galleryPreview = images;
        this.isGalleryLoading = false;
      },
      error: () => {
        this.galleryPreview = [];
        this.isGalleryLoading = false;
      }
    });
  }

  // Open the fullscreen gallery viewer when a preview image is clicked
  openViewer(index: number, event: Event): void {
    event.preventDefault();
    this.viewerIndex = index;
    this.isViewerOpen = true;
  }
}
