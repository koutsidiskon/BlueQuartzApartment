import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { COUNTRY_CODES, CountryCode } from './phone-country-codes';

@Component({
  selector: 'app-phone-country-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pcs-root" [class.open]="isOpen">
      <button type="button" class="pcs-trigger" (click)="toggle($event)">
        <span class="pcs-flag">{{ selected?.flag }}</span>
        <span class="pcs-code">{{ selected?.code }}</span>
        <span class="pcs-chevron">▾</span>
      </button>
      @if (isOpen) {
        <div class="pcs-dropdown" (click)="$event.stopPropagation()">
          <input
            #searchInput
            type="text"
            class="pcs-search"
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange()"
            placeholder="Search…"
            autocomplete="off"
          >
          <div class="pcs-list">
            @for (c of filtered; track c.code + c.name) {
              <button type="button" class="pcs-item" [class.pcs-active]="c.code === value" (click)="pick(c)">
                <span class="pcs-item-flag">{{ c.flag }}</span>
                <span class="pcs-item-code">{{ c.code }}</span>
                <span class="pcs-item-name">{{ c.name }}</span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }
    .pcs-root {
      position: relative;
      height: 100%;
    }
    .pcs-trigger {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
      height: 100%;
      min-height: 40px;
      padding: 0.45rem 0.5rem;
      border: 1px solid rgba(0, 51, 102, 0.3);
      border-radius: 10px;
      background: #fff;
      cursor: pointer;
      font-size: 0.88rem;
      color: rgba(0, 30, 60, 0.9);
      font-family: inherit;
      transition: border-color 0.18s ease, box-shadow 0.18s ease;
      white-space: nowrap;
      overflow: hidden;
    }
    .pcs-trigger:hover, .pcs-trigger:focus {
      border-color: rgba(143, 203, 241, 0.65);
      box-shadow: 0 0 0 3px rgba(143, 203, 241, 0.12);
      outline: none;
    }
    .pcs-flag { font-size: 1rem; line-height: 1; }
    .pcs-code { font-size: 0.8rem; font-weight: 600; }
    .pcs-chevron {
      margin-left: auto;
      font-size: 0.65rem;
      color: rgba(0, 30, 60, 0.42);
      transition: transform 0.18s ease;
      line-height: 1;
      flex-shrink: 0;
    }
    .open .pcs-chevron { transform: rotate(180deg); }

    .pcs-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 9999;
      width: min(230px, calc(100vw - 1.5rem));
      background: #fff;
      border: 1px solid rgba(0, 51, 102, 0.16);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 30, 60, 0.18);
      overflow: hidden;
    }
    .pcs-search {
      display: block;
      width: 100%;
      padding: 0.48rem 0.7rem;
      border: none;
      border-bottom: 1px solid rgba(0, 51, 102, 0.1);
      font-family: inherit;
      font-size: 0.84rem;
      color: rgba(0, 30, 60, 0.9);
      background: rgba(237, 247, 255, 0.55);
      outline: none;
      box-sizing: border-box;
    }
    .pcs-search::placeholder { color: rgba(0, 30, 60, 0.32); }
    .pcs-list {
      max-height: 218px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .pcs-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.38rem 0.68rem;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      font-size: 0.81rem;
      color: rgba(0, 30, 60, 0.88);
      transition: background 0.1s ease;
      width: 100%;
    }
    .pcs-item:hover { background: rgba(143, 203, 241, 0.14); }
    .pcs-item.pcs-active { background: rgba(143, 203, 241, 0.24); font-weight: 700; }
    .pcs-item-flag { font-size: 0.95rem; line-height: 1; }
    .pcs-item-code { min-width: 40px; font-weight: 600; font-size: 0.79rem; }
    .pcs-item-name {
      color: rgba(0, 30, 60, 0.52);
      font-size: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class PhoneCountrySelectComponent implements OnChanges {
  @Input() value = '+30';
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly allCountries: CountryCode[] = COUNTRY_CODES;
  filtered: CountryCode[] = COUNTRY_CODES.slice();
  selected: CountryCode = COUNTRY_CODES[0];
  isOpen = false;
  query = '';

  constructor(private elRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      const found = this.allCountries.find(c => c.code === this.value);
      this.selected = found ?? this.allCountries[0];
    }
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.query = '';
      this.filtered = this.allCountries.slice();
      setTimeout(() => this.searchInput?.nativeElement.focus(), 40);
    }
  }

  pick(country: CountryCode): void {
    this.selected = country;
    this.value = country.code;
    this.valueChange.emit(country.code);
    this.isOpen = false;
    this.query = '';
    this.filtered = this.allCountries.slice();
  }

  onQueryChange(): void {
    const q = this.query.toLowerCase();
    this.filtered = this.allCountries.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.includes(q)
    );
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elRef.nativeElement.contains(event.target as Node)) {
      this.isOpen = false;
    }
  }
}
