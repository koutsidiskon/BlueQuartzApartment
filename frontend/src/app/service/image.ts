import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';


export interface HouseImage {
  id?: number;
  url: string;
  category: string;
  sortOrder: number;
  caption?: string;
}

@Injectable({ providedIn: 'root' } )

export class ImageService {
  private apiUrl = '/api/images';

  constructor(private http: HttpClient) { }

  // Fetches all images from the API
  getImages(): Observable<HouseImage[]> {
    return this.http.get<HouseImage[]>(this.apiUrl);
  }

  // Creates a new image entry in the backend for admin purposes (not currently used in the UI)
  createImage(image: HouseImage): Observable<HouseImage> {
    return this.http.post<HouseImage>(this.apiUrl, image);
  }

  // fetches images and normalizes them for use in the application
  // ensuring they are sorted and categorized properly.
  getPreparedImages(): Observable<HouseImage[]> {
    return this.getImages().pipe(
      map((images) => this.normalizeImages(images))
    );
  }

  // Fetches a limited number of images for the gallery preview
  //  using the prepared images method in home page 
  getGalleryPreviewImages(limit = 11): Observable<HouseImage[]> {
    return this.getPreparedImages().pipe(
      map((images) => images.slice(0, limit))
    );
  }

  // Groups images by their category for easier display in the facilities page
  groupByCategory(images: HouseImage[]): { category: string; images: HouseImage[] }[] {
    const grouped = images.reduce((acc, img) => {
      if (!acc[img.category]) acc[img.category] = [];
      acc[img.category].push(img);
      return acc;
    }, {} as Record<string, HouseImage[]>);

    return Object.keys(grouped).map((category) => ({
      category,
      images: grouped[category]
    }));
  }

  // Normalizes the image data by ensuring required fields are present,
  // trimming strings, and sorting by sortOrder
  private normalizeImages(images: HouseImage[] | unknown): HouseImage[] {
    const safeImages = Array.isArray(images) ? images : [];

    return safeImages
      .filter((img) => !!img?.url)
      .map((img) => ({
        ...img,
        url: img.url.trim(),
        category: (img.category || '').trim(),
        sortOrder: Number.isFinite(img.sortOrder) ? img.sortOrder : 0
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  

}