import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface HouseImage {
  id?: number;
  url: string;
  category: string;
  sortOrder: number;
  caption?: string;
}

@Injectable({
  providedIn: 'root'
} )
export class ImageService {
  private apiUrl = 'http://localhost:3000/api/images';

  constructor(private http: HttpClient) { }

  getImages(): Observable<HouseImage[]> {
    return this.http.get<HouseImage[]>(this.apiUrl);
  }

  createImage(image: HouseImage): Observable<HouseImage> {
    return this.http.post<HouseImage>(this.apiUrl, image);
  }

}