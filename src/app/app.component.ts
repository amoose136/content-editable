import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenHighlightDirective } from './token-highlight.directive';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TokenHighlightDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'hello';
}
