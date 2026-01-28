import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Password } from '../../interfaces/password';
import { ShareService } from '../../services/share.service';

@Component({
  selector: 'app-share-dialog',
  imports: [CommonModule, FormsModule],
  templateUrl: './share-dialog.component.html',
  styleUrl: './share-dialog.component.scss',
})
export class ShareDialogComponent {
  private shareService = inject(ShareService);

  password = input.required<Password>();
  closed = output<void>();

  protected recipientAddress = signal('');
  protected isSending = signal(false);
  protected error = signal<string | null>(null);
  protected success = signal(false);
  protected txHash = signal<string | null>(null);

  protected shareFee = this.shareService.getShareFee();

  async sendPassword(): Promise<void> {
    const address = this.recipientAddress().trim();

    if (!this.shareService.isValidWalletAddress(address)) {
      this.error.set('Please enter a valid Ethereum wallet address (0x...)');
      return;
    }

    this.isSending.set(true);
    this.error.set(null);

    try {
      const result = await this.shareService.sendShareRequest(this.password(), address);

      if (result.success) {
        this.success.set(true);
        this.txHash.set(result.txHash || null);
      } else {
        this.error.set(result.error || 'Failed to send password');
      }
    } catch (err: any) {
      this.error.set(err.message || 'An error occurred');
    } finally {
      this.isSending.set(false);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
