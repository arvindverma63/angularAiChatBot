import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatbotAppComponent } from "./components/chatbot/chatbot.component";

@Component({
  selector: 'app-root',
  imports: [ ChatbotAppComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'aibot';
}
