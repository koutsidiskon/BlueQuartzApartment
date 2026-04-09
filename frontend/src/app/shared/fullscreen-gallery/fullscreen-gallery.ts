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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] || changes['images'] || changes['activeIndex']) {
      this.syncState();
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  closeViewer(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    document.body.style.overflow = '';
  }

  goToSlide(index: number): void {
    if (!this.images.length) return;
    this.setActiveIndex(index);
  }

  showPrev(): void {
    if (!this.images.length) return;
    this.setActiveIndex((this.activeIndex - 1 + this.images.length) % this.images.length);
  }

  showNext(): void {
    if (!this.images.length) return;
    this.setActiveIndex((this.activeIndex + 1) % this.images.length);
  }

  getAltText(photo: HouseImage, index: number): string {
    return photo.caption || `${this.altPrefix} ${index + 1}`;
  }

  @HostListener('window:keydown', ['$event'])
  handleViewerKeydown(event: KeyboardEvent): void {
    if (!this.isOpen) return;

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
  private syncState(): void {
    if (!this.images.length) {
      if (this.isOpen) this.closeViewer();
      return;
    }

    const boundedIndex = Math.max(0, Math.min(this.activeIndex, this.images.length - 1));
    if (boundedIndex !== this.activeIndex) {
      this.setActiveIndex(boundedIndex);
    }

    document.body.style.overflow = this.isOpen ? 'hidden' : '';
  }

  private setActiveIndex(index: number): void {
    this.activeIndex = index;
    this.activeIndexChange.emit(index);
  }
}
