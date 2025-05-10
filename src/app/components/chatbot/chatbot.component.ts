import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewChecked, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Component({
    selector: 'app-chatbot',
    templateUrl: './chatbot.component.html',
    imports: [NgClass, NgFor, NgIf, FormsModule, HttpClientModule]
})
export class ChatbotAppComponent implements AfterViewChecked {
    messages: { text: string, isUser: boolean }[] = [
        { text: 'Hey there! I’m your Voice AI Assistant. Speak or type to get started!', isUser: false }
    ];
    input: string = '';
    isListening: boolean = false;

    @ViewChild('chatContainer') private chatContainer!: ElementRef;
    @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

    private recognition: any;
    private apiUrl = 'https://chatbot.avblog.io/api/chat';

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private http: HttpClient
    ) {
        this.initSpeechRecognition();
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    initSpeechRecognition() {
        if (isPlatformBrowser(this.platformId)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US';

                this.recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    this.input = transcript;
                    this.sendMessage();
                };

                this.recognition.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    this.isListening = false;
                };

                this.recognition.onend = () => {
                    this.isListening = false;
                };
            }
        }
    }

    toggleVoice() {
        if (isPlatformBrowser(this.platformId) && this.recognition) {
            if (this.isListening) {
                this.recognition.stop();
            } else {
                this.recognition.start();
                this.isListening = true;
            }
        }
    }

    sendMessage() {
        if (this.input.trim() === '') return;

        // Format user message
        const formattedUserMessage = this.formatMessage(this.input);
        this.messages.push({ text: formattedUserMessage, isUser: true });

        // Make API request
        this.sendChatRequest(this.input).subscribe({
            next: (response: any) => {
                const botResponse = response.response || 'Sorry, I couldn’t process that. Please try again.';
                // Format bot response
                const formattedBotResponse = this.formatMessage(botResponse);
                this.messages.push({ text: formattedBotResponse, isUser: false });
                this.scrollToBottom();
            },
            error: (error) => {
                console.error('API error:', error);
                const errorMessage = 'Oops! Something went wrong. Please try again later.';
                this.messages.push({ text: this.formatMessage(errorMessage), isUser: false });
                this.scrollToBottom();
            }
        });

        this.input = '';
    }

    private formatMessage(message: string): string {
        // Replace \n with <br> for HTML rendering
        return message.replace(/\n/g, '<br>');
    }

    private sendChatRequest(message: string): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': 'application/json'
        });

        const body = { message: message };

        return this.http.post(this.apiUrl, body, { headers }).pipe(
            tap(response => response),
            catchError(error => {
                console.error('Error in API request:', error);
                return throwError(() => new Error('Failed to fetch response from API'));
            })
        );
    }

    private scrollToBottom(): void {
        if (isPlatformBrowser(this.platformId)) {
            try {
                this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
            } catch (err) {}
        }
    }
}
