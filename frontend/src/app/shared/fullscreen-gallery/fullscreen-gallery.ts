import { CommonModule } from '@angular/common';
import {Component,EventEmitter,HostListener,Input,OnChanges,OnDestroy,Output,SimpleChanges} from '@angular/core';
import { HouseImage } from '../../service/image';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-fullscreen-gallery',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './fullscreen-gallery.html',
  styleUrl: './fullscreen-gallery.scss',
})
export class FullscreenGallery implements OnChanges, OnDestroy {
  @Input() images: HouseImage[] = [];
  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();

  @Input() activeIndex = 0;
  @Output() activeIndexChange = new EventEmitter<number>();

  @Input() altPrefix = 'Photo';

  imageLoaded = false;
  private requestedIndex = 0;
  private navigationToken = 0;
  private readonly imagePreloads = new Map<string, Promise<void>>();
  private readonly decodedImages = new Map<string, HTMLImageElement>();
  private idlePreloadHandle: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] || changes['images'] || changes['activeIndex']) {
      if (changes['isOpen']?.currentValue === true) {
        this.imageLoaded = false;
        this.scheduleAlbumPreload();
      }
      this.syncState();
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    if (this.idlePreloadHandle !== null) {
      window.clearTimeout(this.idlePreloadHandle);
    }
  }

  closeViewer(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    document.body.style.overflow = '';
  }

  goToSlide(index: number): void {
    if (!this.images.length) return;
    this.navigateTo(index);
  }

  showPrev(): void {
    if (!this.images.length) return;
    this.navigateTo((this.requestedIndex - 1 + this.images.length) % this.images.length);
  }

  showNext(): void {
    if (!this.images.length) return;
    this.navigateTo((this.requestedIndex + 1) % this.images.length);
  }

  onImageLoaded(): void {
    this.imageLoaded = true;
  }

  getAltText(photo: HouseImage, index: number): string {
    return photo.caption || `${this.altPrefix} ${index + 1}`;
  }

  @HostListener('window:keydown', ['$event'])
  handleViewerKeydown(event: KeyboardEvent): void {
    if (!this.isOpen) return;
    if (event.key === 'Escape') {
      this.closeViewer();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.showPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.showNext();
    }
  }

  private syncState(): void {
    if (!this.images.length) {
      if (this.isOpen) this.closeViewer();
      return;
    }
    const boundedIndex = Math.max(0, Math.min(this.activeIndex, this.images.length - 1));
    this.requestedIndex = boundedIndex;
    this.preloadAround(boundedIndex);
    if (boundedIndex !== this.activeIndex) this.setActiveIndex(boundedIndex);
    document.body.style.overflow = this.isOpen ? 'hidden' : '';
  }

  private navigateTo(index: number): void {
    const boundedIndex = (index + this.images.length) % this.images.length;
    this.requestedIndex = boundedIndex;
    const token = ++this.navigationToken;
    this.imageLoaded = false;

    const imageUrl = this.images[boundedIndex].url;
    this.preloadImage(imageUrl).then(() => {
      if (token !== this.navigationToken || !this.isOpen) return;
      this.setActiveIndex(boundedIndex);
      this.preloadAround(boundedIndex);
    });
  }

  private preloadAround(index: number): void {
    if (!this.images.length) return;
    const adjacent = [
      index,
      (index + 1) % this.images.length,
      (index - 1 + this.images.length) % this.images.length
    ];
    adjacent.forEach((imageIndex) => this.preloadImage(this.images[imageIndex].url));
  }

  private preloadImage(url: string): Promise<void> {
    const existing = this.imagePreloads.get(url);
    if (existing) return existing;

    const preload = new Promise<void>((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try {
          await image.decode();
        } catch {
          // The loaded image is still usable when decode() is unavailable.
        }
        this.decodedImages.set(url, image);
        resolve();
      };
      image.onerror = () => resolve();
      image.src = url;
    });
    this.imagePreloads.set(url, preload);
    return preload;
  }

  private scheduleAlbumPreload(): void {
    if (this.idlePreloadHandle !== null || !this.images.length) return;

    this.idlePreloadHandle = window.setTimeout(() => {
      this.idlePreloadHandle = null;
      this.preloadAlbumBatch(0);
    }, 120);
  }

  private preloadAlbumBatch(startIndex: number): void {
    const batch = this.images.slice(startIndex, startIndex + 3);
    batch.forEach((photo) => this.preloadImage(photo.url));

    if (startIndex + batch.length < this.images.length) {
      this.idlePreloadHandle = window.setTimeout(() => {
        this.idlePreloadHandle = null;
        this.preloadAlbumBatch(startIndex + batch.length);
      }, 80);
    }
  }

  private setActiveIndex(index: number): void {
    this.activeIndex = index;
    this.activeIndexChange.emit(index);
  }
}
