import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UiFeedbackServiceMock {
  showError(message: string): void {
    console.warn(`[UiFeedback] ${message}`);
  }
}
