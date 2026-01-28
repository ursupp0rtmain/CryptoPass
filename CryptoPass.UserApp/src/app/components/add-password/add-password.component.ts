import { Component, input, output, signal, OnInit, computed, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { VaultItem, VaultItemType, Password, SecureNote, Address, Card } from '../../interfaces/password';
import { TotpService } from '../../services/totp.service';

@Component({
  selector: 'app-add-password',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './add-password.component.html',
  styleUrl: './add-password.component.scss',
})
export class AddPasswordComponent implements OnInit, OnDestroy {
  password = input<VaultItem | null>(null);
  initialItemType = input<VaultItemType>('login');
  passwordSaved = output<VaultItem>();
  cancelled = output<void>();

  form: FormGroup;
  showPassword = signal(false);
  selectedItemType = signal<VaultItemType>('login');
  private totpTimer: any;
  public totpRefreshTrigger = signal(0);
  
  itemTypeOptions = [
    { value: 'login' as VaultItemType, label: 'Login', icon: 'pi-key' },
    { value: 'note' as VaultItemType, label: 'Secure Note', icon: 'pi-file' },
    { value: 'address' as VaultItemType, label: 'Address', icon: 'pi-map-marker' },
    { value: 'card' as VaultItemType, label: 'Card', icon: 'pi-credit-card' }
  ];

  constructor(private fb: FormBuilder, private totpService: TotpService) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      // Login fields
      username: [''],
      password: [''],
      url: ['', Validators.maxLength(500)],
      // 2FA fields
      totpSecret: [''],
      // Note fields
      noteContent: [''],
      // Address fields
      firstName: [''],
      lastName: [''],
      addressLine1: [''],
      addressLine2: [''],
      city: [''],
      state: [''],
      postalCode: [''],
      country: [''],
      // Card fields
      cardholderName: [''],
      cardNumber: [''],
      expirationMonth: [''],
      expirationYear: [''],
      cvv: [''],
      // Common
      notes: ['', Validators.maxLength(1000)],
    });
  }

  ngOnInit(): void {
    // Set initial item type if creating new item
    if (!this.password()) {
      this.selectedItemType.set(this.initialItemType());
    }
    
    const existingItem = this.password();
    if (existingItem) {
      this.selectedItemType.set(existingItem.type);
      
      this.form.patchValue({
        title: existingItem.title,
        notes: existingItem.notes || '',
      });

      if (existingItem.type === 'login') {
        this.form.patchValue({
          username: existingItem.username,
          password: existingItem.password,
          url: existingItem.url || '',
          totpSecret: existingItem.totp || '',
        });
      } else if (existingItem.type === 'note') {
        this.form.patchValue({
          noteContent: existingItem.content,
        });
      } else if (existingItem.type === 'address') {
        this.form.patchValue({
          firstName: existingItem.firstName || '',
          lastName: existingItem.lastName || '',
          addressLine1: existingItem.addressLine1 || '',
          addressLine2: existingItem.addressLine2 || '',
          city: existingItem.city || '',
          state: existingItem.state || '',
          postalCode: existingItem.postalCode || '',
          country: existingItem.country || '',
        });
      } else if (existingItem.type === 'card') {
        this.form.patchValue({
          cardholderName: existingItem.cardholderName,
          cardNumber: existingItem.cardNumber,
          expirationMonth: existingItem.expirationMonth || '',
          expirationYear: existingItem.expirationYear || '',
          cvv: existingItem.cvv || '',
        });
      }
    }
    
    this.updateValidators();
    
    // Start TOTP timer for live preview
    this.totpTimer = setInterval(() => {
      this.totpRefreshTrigger.update(v => v + 1);
    }, 1000);
  }

  updateValidators(): void {
    const type = this.selectedItemType();
    
    // Reset all validators
    Object.keys(this.form.controls).forEach(key => {
      if (key !== 'title' && key !== 'notes') {
        this.form.get(key)?.clearValidators();
        this.form.get(key)?.updateValueAndValidity();
      }
    });

    // Set type-specific validators
    if (type === 'login') {
      this.form.get('username')?.setValidators([Validators.required, Validators.maxLength(100)]);
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(4)]);
      // totpSecret is optional for logins
    } else if (type === 'note') {
      this.form.get('noteContent')?.setValidators([Validators.required]);
    } else if (type === 'address') {
      this.form.get('addressLine1')?.setValidators([Validators.required]);
      this.form.get('city')?.setValidators([Validators.required]);
      this.form.get('country')?.setValidators([Validators.required]);
    } else if (type === 'card') {
      this.form.get('cardholderName')?.setValidators([Validators.required]);
      this.form.get('cardNumber')?.setValidators([Validators.required]);
    }

    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.updateValueAndValidity();
    });
  }

  public onItemTypeChange(): void {
    this.updateValidators();
  }

  onSubmit(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const existingItem = this.password();
    const now = Date.now();
    const type = this.selectedItemType();

    let vaultItem: VaultItem;

    const baseData = {
      id: existingItem?.id || this.generateId(type),
      title: this.form.value.title.trim(),
      notes: this.form.value.notes?.trim() || undefined,
      createdAt: existingItem?.createdAt || now,
      updatedAt: now,
    };

    if (type === 'login') {
      vaultItem = {
        ...baseData,
        type: 'login',
        username: this.form.value.username.trim(),
        password: this.form.value.password,
        url: this.form.value.url?.trim() || undefined,
        totp: this.form.value.totpSecret?.trim() || undefined,
      } as Password;
    } else if (type === 'note') {
      vaultItem = {
        ...baseData,
        type: 'note',
        content: this.form.value.noteContent.trim(),
      } as SecureNote;
    } else if (type === 'address') {
      vaultItem = {
        ...baseData,
        type: 'address',
        firstName: this.form.value.firstName?.trim(),
        lastName: this.form.value.lastName?.trim(),
        addressLine1: this.form.value.addressLine1.trim(),
        addressLine2: this.form.value.addressLine2?.trim(),
        city: this.form.value.city.trim(),
        state: this.form.value.state?.trim(),
        postalCode: this.form.value.postalCode?.trim(),
        country: this.form.value.country.trim(),
      } as Address;
    } else if (type === 'card') {
      vaultItem = {
        ...baseData,
        type: 'card',
        cardholderName: this.form.value.cardholderName.trim(),
        cardNumber: this.form.value.cardNumber.trim(),
        expirationMonth: this.form.value.expirationMonth?.trim(),
        expirationYear: this.form.value.expirationYear?.trim(),
        cvv: this.form.value.cvv?.trim(),
      } as Card;
    } else {
      return; // Should never happen
    }

    this.passwordSaved.emit(vaultItem);
    this.form.reset();
    this.selectedItemType.set('login');
  }

  onCancel(): void {
    this.cancelled.emit();
    this.form.reset();
  }

  public togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  public generatePassword(): void {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
    let password = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }
    this.form.patchValue({ password });
  }

  public generateTotpSecret(): void {
    const secret = this.totpService.generateSecret();
    this.form.patchValue({ totpSecret: secret });
  }

  private generateId(type: VaultItemType): string {
    const prefix = {
      'login': 'pwd',
      'note': 'note',
      'address': 'addr',
      'card': 'card'
    }[type];
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return `${fieldName} is required`;
    if (control.errors['minlength'])
      return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxLength'])
      return `${fieldName} must not exceed ${control.errors['maxLength'].requiredLength} characters`;

    return '';
  }

  public getItemTypeLabel(): string {
    const option = this.itemTypeOptions.find(o => o.value === this.selectedItemType());
    return option?.label || 'Item';
  }

  public getCurrentTotpCode(): string {
    this.totpRefreshTrigger(); // Trigger reactivity
    const secret = this.form.value.totpSecret?.trim();
    if (!secret) return '------';
    
    try {
      return this.totpService.generateCode(secret);
    } catch (error) {
      return 'INVALID';
    }
  }

  public getTotpProgress(): number {
    this.totpRefreshTrigger(); // Trigger reactivity
    const remaining = this.totpService.getRemainingSeconds();
    return (remaining / 30) * 100;
  }

  ngOnDestroy(): void {
    if (this.totpTimer) {
      clearInterval(this.totpTimer);
    }
  }
}
