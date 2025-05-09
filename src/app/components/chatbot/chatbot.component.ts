import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewChecked, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';

@Component({
    selector: 'app-chatbot',
    templateUrl: './chatbot.component.html',
    imports: [NgClass, NgFor, NgIf, FormsModule]
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

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
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

        this.messages.push({ text: this.input, isUser: true });

        setTimeout(() => {
            this.messages.push({
                text: `I heard: "${this.input}". How can I assist you further?`,
                isUser: false
            });
            this.scrollToBottom();
        }, 500);

        this.input = '';
    }

    private scrollToBottom(): void {
        if (isPlatformBrowser(this.platformId)) {
            try {
                this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
            } catch (err) {}
        }
    }
}
