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
        { text: 'Hey there! I’m your Voice AI Assistant. Speak or type to get started! / नमस्ते! मैं आपका वॉयस AI असिस्टेंट हूँ। बोलें या टाइप करें।', isUser: false }
    ];
    input: string = '';
    isListening: boolean = false;
    isSpeaking: boolean = false;
    selectedLanguage: string = 'en-US'; // Default to English
    languages: { label: string, value: string }[] = [
        { label: 'English', value: 'en-US' },
        { label: 'Hindi', value: 'hi-IN' }
    ];

    @ViewChild('chatContainer') private chatContainer!: ElementRef;
    @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

    private recognition: any;
    private synth: SpeechSynthesis | null = null;
    private hindiVoice: SpeechSynthesisVoice | null = null;
    private englishVoice: SpeechSynthesisVoice | null = null;
    private apiUrl = 'https://chatbot.avblog.io/api/chat';

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private http: HttpClient
    ) {
        this.initSpeechRecognition();
        this.initTextToSpeech();
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
                this.recognition.lang = this.selectedLanguage;

                this.recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    this.input = transcript;
                    this.sendMessage();
                };

                this.recognition.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    this.isListening = false;
                    const errorMessage = this.selectedLanguage === 'en-US'
                        ? 'Sorry, I couldn’t hear you. Please try again.'
                        : 'मुझे सुनाई नहीं दिया। कृपया फिर से कोशिश करें।';
                    this.messages.push({ text: this.formatMessage(errorMessage), isUser: false });
                    this.scrollToBottom();
                };

                this.recognition.onend = () => {
                    this.isListening = false;
                };
            } else {
                console.warn('Speech Recognition API not supported in this browser.');
                const errorMessage = this.selectedLanguage === 'en-US'
                    ? 'Speech recognition is not supported in your browser.'
                    : 'आपके ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है।';
                this.messages.push({ text: this.formatMessage(errorMessage), isUser: false });
                this.scrollToBottom();
            }
        }
    }

    initTextToSpeech() {
        if (isPlatformBrowser(this.platformId)) {
            this.synth = window.speechSynthesis;
            if (this.synth) {
                // Load voices (voices may load asynchronously)
                const loadVoices = () => {
                    const voices = this.synth!.getVoices();
                    this.englishVoice = voices.find(voice => voice.lang === 'en-US') || null;
                    this.hindiVoice = voices.find(voice => voice.lang === 'hi-IN') || null;
                };

                // Voices may not be available immediately, so listen for changes
                this.synth.onvoiceschanged = loadVoices;
                loadVoices();

                if (!this.englishVoice && !this.hindiVoice) {
                    console.warn('No suitable voices found for English or Hindi.');
                    const warningMessage = this.selectedLanguage === 'en-US'
                        ? 'Text-to-speech voices for English or Hindi are not available.'
                        : 'अंग्रेजी या हिंदी के लिए टेक्स्ट-टू-स्पीच आवाजें उपलब्ध नहीं हैं।';
                    this.messages.push({ text: this.formatMessage(warningMessage), isUser: false });
                    this.scrollToBottom();
                }
            } else {
                console.warn('Speech Synthesis API not supported in this browser.');
                const errorMessage = this.selectedLanguage === 'en-US'
                    ? 'Text-to-speech is not supported in your browser.'
                    : 'आपके ब्राउज़र में टेक्स्ट-टू-स्पीच समर्थित नहीं है।';
                this.messages.push({ text: this.formatMessage(errorMessage), isUser: false });
                this.scrollToBottom();
            }
        }
    }

    toggleVoice() {
        if (isPlatformBrowser(this.platformId) && this.recognition) {
            if (this.isListening) {
                this.recognition.stop();
            } else {
                this.recognition.lang = this.selectedLanguage; // Update language for STT
                this.recognition.start();
                this.isListening = true;
            }
        }
    }

    changeLanguage() {
        if (isPlatformBrowser(this.platformId) && this.recognition) {
            this.recognition.lang = this.selectedLanguage; // Update STT language
            const message = this.selectedLanguage === 'en-US'
                ? 'Language switched to English.'
                : 'भाषा हिंदी में बदल दी गई।';
            this.messages.push({ text: this.formatMessage(message), isUser: false });
            this.scrollToBottom();
            this.speak(message);
        }
    }

    speak(text: string) {
        if (isPlatformBrowser(this.platformId) && this.synth) {
            // Stop any ongoing speech
            this.synth.cancel();

            // Remove \n for speech (already handled for display with <br>)
            const cleanText = text.replace(/\n/g, ' ');

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = this.selectedLanguage;

            // Select the appropriate voice based on language
            if (this.selectedLanguage === 'hi-IN' && this.hindiVoice) {
                utterance.voice = this.hindiVoice;
            } else if (this.selectedLanguage === 'en-US' && this.englishVoice) {
                utterance.voice = this.englishVoice;
            }

            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onstart = () => {
                this.isSpeaking = true;
            };
            utterance.onend = () => {
                this.isSpeaking = false;
            };
            utterance.onerror = (event: any) => {
                console.error('Speech synthesis error:', event.error);
                this.isSpeaking = false;
            };

            this.synth.speak(utterance);
        }
    }

    sendMessage() {
        if (this.input.trim() === '') return;

        // Format user message for display
        const formattedUserMessage = this.formatMessage(this.input);
        this.messages.push({ text: formattedUserMessage, isUser: true });

        // Make API request
        this.sendChatRequest(this.input).subscribe({
            next: (response: any) => {
                const botResponse = response.response || (this.selectedLanguage === 'en-US'
                    ? 'Sorry, I couldn’t process that. Please try again.'
                    : 'मुझे समझ नहीं आया। कृपया फिर से कोशिश करें।');
                // Format bot response for display
                const formattedBotResponse = this.formatMessage(botResponse);
                this.messages.push({ text: formattedBotResponse, isUser: false });
                this.scrollToBottom();
                // Speak the bot response
                this.speak(botResponse);
            },
            error: (error) => {
                console.error('API error:', error);
                const errorMessage = this.selectedLanguage === 'en-US'
                    ? 'Oops! Something went wrong. Please try again later.'
                    : 'कुछ गलत हो गया। कृपया बाद में फिर से कोशिश करें।';
                const formattedErrorMessage = this.formatMessage(errorMessage);
                this.messages.push({ text: formattedErrorMessage, isUser: false });
                this.scrollToBottom();
                // Speak the error message
                this.speak(errorMessage);
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
