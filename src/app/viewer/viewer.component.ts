import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss'],
  imports: [CommonModule]
})
export class ViewerComponent {
  @Input() faqs: any[] | any;

  constructor() { }
}
