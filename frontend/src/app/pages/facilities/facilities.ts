import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, retry, timer, timeout } from 'rxjs';
import { ImageService, HouseImage } from '../../service/image'; 
import { FullscreenGallery } from '../../shared/fullscreen-gallery/fullscreen-gallery';

interface AmenityFeature {
  icon: string;
  label: string;
}

interface HouseRule {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-facilities',
  standalone: true,
  imports: [CommonModule, RouterLink, FullscreenGallery],
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
      title: 'No Smoking Indoors',
      description: 'Smoking is strictly prohibited inside the apartment. You may use outdoor areas responsibly.'
    },
    {
      icon: 'celebration',
      title: 'No Parties or Events',
      description: 'Parties and loud gatherings are not allowed to protect the space and respect the neighborhood.'
    },
    {
      icon: 'nightlight',
      title: 'Respect Quiet Hours',
      description: 'Please keep noise low during local quiet hours and be considerate of nearby residents.'
    },
    {
      icon: 'login',
      title: 'Check-In After 15:00',
      description: 'Arrival is available after 3:00 PM so the apartment can be fully cleaned and prepared.'
    },
    {
      icon: 'logout',
      title: 'Check-Out Before 10:00',
      description: 'Departure is before 10:00 AM to allow enough time for cleaning before the next guests.'
    },
    {
      icon: 'build_circle',
      title: 'Report Any Damage',
      description: 'Please inform the hosts immediately about any damage. Extensive damage may require compensation.'
    },
    {
      icon: 'group',
      title: 'Registered Guests Only',
      description: 'Only guests included in the reservation are allowed to stay overnight in the property.'
    },
    {
      icon: 'lock',
      title: 'Keep the Home Secure',
      description: 'Lock doors and switch off air conditioning and appliances when leaving the apartment.'
    }
  ];

  constructor(
    private imageService: ImageService,
    private cdr: ChangeDetectorRef
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
        this.loadError = 'Unable to load images right now. Please try again in a moment.';
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

  getFeatures(cat: string): AmenityFeature[] {
    const features: Record<string, AmenityFeature[]> = {
      'bedroom': [
        { icon: 'king_bed', label: 'Master bedroom with premium mattress' },
        { icon: 'curtains', label: 'Blackout curtains for restful sleep' },
        { icon: 'checkroom', label: 'Iron and ironing board' },
        { icon: 'local_laundry_service', label: 'Washing machine on the back balcony' },
        { icon: 'bed', label: 'Extra pillows, blankets, and fresh linens' }
      ],
      'living-room': [
        { icon: 'weekend', label: 'Large corner sofa for comfortable lounging' },
        { icon: 'bed', label: 'Convertible sofa for extra sleeping space' },
        { icon: 'tv', label: 'Smart TV with streaming, including Netflix' },
        { icon: 'wifi', label: 'High-speed Wi-Fi throughout the entire property' }
      ],
      'kitchen': [
        { icon: 'kitchen', label: 'Fully equipped kitchen with complete cookware' },
        { icon: 'soup_kitchen', label: 'Pots, pans, oven trays, and essential utensils' },
        { icon: 'wine_bar', label: 'Water and wine glasses with full tableware set' },
        { icon: 'coffee_maker', label: 'Espresso machine, kettle, and coffee filters' },
        { icon: 'local_dining', label: 'Dishwasher for quick and effortless cleanup' }
      ],
      'bathroom': [
        { icon: 'shower', label: 'Shampoo, conditioner, and body wash' },
        { icon: 'soap', label: 'Hand soap and fresh toilet paper' },
        { icon: 'mode_fan', label: 'Hair dryer available for daily use' },
        { icon: 'cleaning_services', label: 'Cleaning products available if needed' }
      ],
      'veranda': [
        { icon: 'table_restaurant', label: 'Outdoor table with comfortable chairs for dining and relaxing' },
        { icon: 'wb_twilight', label: 'Open sea view with beautiful sunset moments' },
        { icon: 'air', label: 'Fresh coastal breeze for calm mornings and peaceful nights' }
      ]
    };

    return features[cat] || [
      { icon: 'star', label: 'Premium amenities with carefully selected details' }
    ];
  }
}