import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Password } from '../../interfaces/password';
import { ShareRequest } from '../../interfaces/share-request';

@Component({
  selector: 'app-receive-dialog',
  imports: [CommonModule],
  templateUrl: './receive-dialog.component.html',
  styleUrl: './receive-dialog.component.scss',
})
export class ReceiveDialogComponent {
  shareRequest = input.required<ShareRequest>();

  accepted = output<Password>();
  rejected = output<void>();
  closed = output<void>();

  protected showPassword = signal(false);
  protected isSaving = signal(false);

  get password(): Password | null {
    return this.shareRequest().password || null;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  saveToVault(): void {
    if (this.password) {
      this.isSaving.set(true);
      // Emit the password to be saved by parent
      this.accepted.emit(this.password);
    }
  }

  reject(): void {
    this.rejected.emit();
  }

  close(): void {
    this.closed.emit();
  }
}
