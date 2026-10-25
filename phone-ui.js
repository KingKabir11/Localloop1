import { sound } from './audio.js';

export class PhoneUIManager {
  constructor(callbacks) {
    this.callbacks = callbacks || {};

    // Booking selections state matching user screens
    this.selectedDate = 'Today, 24 Oct';
    this.selectedTime = '8:00 PM – 10:00 PM';
    this.selectedDeck = 'Front Stage Deck';
    this.guestCount = 2;
    this.pricePerGuest = 499;
    this.gstFee = 8;

    this.currentStep = 1; // 1: Slot, 2: Confirmation, 3: Payment, 4: Success Ticket

    this.initDOMElements();
  }

  initDOMElements() {
    this.phoneContainer = document.getElementById('phone-container');
    this.phoneScreen = document.getElementById('phone-screen');
    this.hotspotModalBackdrop = document.getElementById('hotspot-modal-backdrop');
    this.endingShowcase = document.getElementById('ending-showcase');

    this.bindEvents();
  }

  bindEvents() {
    // 1. "Explore in 3D" & "Preview →" Buttons in Spot Details
    const exploreCard = document.getElementById('explore-3d-card');
    const previewBtn = document.getElementById('preview-3d-btn');

    const start3D = () => {
      sound.playClick();
      sound.playTransitionWhoosh(true);
      if (this.callbacks.onStart3DExploration) {
        this.callbacks.onStart3DExploration();
      }
    };

    if (exploreCard) exploreCard.addEventListener('click', start3D);
    if (previewBtn) previewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      start3D();
    });

    // 2. "Book experience →" CTA in Spot Details -> Opens Step 1
    const bookExpBtn = document.getElementById('btn-book-experience');
    if (bookExpBtn) {
      bookExpBtn.addEventListener('click', () => {
        sound.playClick();
        this.goToStep(1);
      });
    }

    // 3. Step 1: Date Pills
    document.querySelectorAll('.date-select-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.date-select-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedDate = pill.dataset.val;
        sound.playClick();
      });
    });

    // 4. Step 1: Time Slot Selection
    document.querySelectorAll('.time-slot-card').forEach(slot => {
      slot.addEventListener('click', () => {
        document.querySelectorAll('.time-slot-card').forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        this.selectedTime = slot.dataset.val;
        sound.playClick();
      });
    });

    // 5. Step 1: Guest Counter (+ / -)
    const btnMinus = document.getElementById('btn-guest-minus');
    const btnPlus = document.getElementById('btn-guest-plus');
    const guestDisplay = document.getElementById('guest-count-val');

    if (btnMinus && btnPlus && guestDisplay) {
      btnMinus.addEventListener('click', () => {
        if (this.guestCount > 1) {
          this.guestCount--;
          guestDisplay.textContent = this.guestCount;
          this.updateTotals();
          sound.playClick();
        }
      });

      btnPlus.addEventListener('click', () => {
        if (this.guestCount < 8) {
          this.guestCount++;
          guestDisplay.textContent = this.guestCount;
          this.updateTotals();
          sound.playClick();
        }
      });
    }

    // 6. Step 1 -> Step 2: "Review Booking →"
    const reviewBookingBtn = document.getElementById('btn-review-booking');
    if (reviewBookingBtn) {
      reviewBookingBtn.addEventListener('click', () => {
        sound.playClick();
        this.goToStep(2);
      });
    }

    // 7. Step 2 -> Step 3: "Continue to Payment →"
    const continuePayBtn = document.getElementById('btn-continue-payment');
    if (continuePayBtn) {
      continuePayBtn.addEventListener('click', () => {
        sound.playClick();
        this.goToStep(3);
      });
    }

    // 8. Step 3: UPI Selection
    document.querySelectorAll('.upi-row').forEach(row => {
      row.addEventListener('click', () => {
        document.querySelectorAll('.upi-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        sound.playClick();
      });
    });

    // 9. Step 3 -> Step 4: "Pay ₹1,006 via Google Pay"
    const payBtn = document.getElementById('btn-pay-upi');
    if (payBtn) {
      payBtn.addEventListener('click', () => {
        this.executePaymentSuccess();
      });
    }

    // 10. Step 4 -> Scene 5: "View in My Bookings →"
    const viewBookingsBtn = document.getElementById('btn-view-bookings');
    if (viewBookingsBtn) {
      viewBookingsBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.callbacks.onFinishBooking) {
          this.callbacks.onFinishBooking();
        }
      });
    }

    // 11. Back button handling inside phone
    const backBtn = document.getElementById('phone-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.currentStep > 1 && this.currentStep < 4) {
          this.goToStep(this.currentStep - 1);
        } else {
          this.showScene1();
        }
      });
    }

    // 12. Hotspot Modals
    const closeModalBtn = document.getElementById('close-hotspot-modal');
    const modalResumeBtn = document.getElementById('modal-resume-btn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeHotspotModal());
    if (modalResumeBtn) modalResumeBtn.addEventListener('click', () => this.closeHotspotModal());

    const modalBookBtn = document.getElementById('modal-book-now-btn');
    if (modalBookBtn) {
      modalBookBtn.addEventListener('click', () => {
        this.closeHotspotModal();
        if (this.callbacks.onReturnToPhone) {
          this.callbacks.onReturnToPhone();
        }
      });
    }

    // 13. Scene 5 Ending Navigation Buttons
    const replayBtn = document.getElementById('btn-replay-experience');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.callbacks.onReplay) {
          this.callbacks.onReplay();
        }
      });
    }

    const jump3DBtn = document.getElementById('btn-jump-3d');
    if (jump3DBtn) {
      jump3DBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.callbacks.onStart3DExploration) {
          this.callbacks.onStart3DExploration();
        }
      });
    }

    const jumpPhoneBtn = document.getElementById('btn-jump-phone');
    if (jumpPhoneBtn) {
      jumpPhoneBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.callbacks.onReturnToPhone) {
          this.callbacks.onReturnToPhone();
        }
      });
    }
  }

  updateTotals() {
    const subtotal = this.guestCount * this.pricePerGuest;
    const totalWithTax = subtotal + this.gstFee;

    const subtotalDisplays = document.querySelectorAll('.subtotal-display');
    subtotalDisplays.forEach(el => el.textContent = `₹${subtotal}`);

    const totalDisplays = document.querySelectorAll('.total-display');
    totalDisplays.forEach(el => el.textContent = `₹${totalWithTax}`);

    const guestTextDisplays = document.querySelectorAll('.guest-count-text');
    guestTextDisplays.forEach(el => el.textContent = `${this.guestCount} Guests`);

    const guestCalcNote = document.getElementById('guest-calc-note');
    if (guestCalcNote) {
      guestCalcNote.textContent = `₹499 x ${this.guestCount} = ₹${subtotal}`;
    }
  }

  goToStep(stepNum) {
    this.currentStep = stepNum;

    // Hide all views
    document.getElementById('discovery-view').style.display = 'none';
    document.getElementById('booking-step1-view').style.display = 'none';
    document.getElementById('booking-step2-view').style.display = 'none';
    document.getElementById('booking-step3-view').style.display = 'none';
    document.getElementById('booking-step4-view').style.display = 'none';
    if (this.endingShowcase) this.endingShowcase.classList.remove('active');

    // Show selected step view
    if (stepNum === 1) {
      document.getElementById('booking-step1-view').style.display = 'block';
    } else if (stepNum === 2) {
      document.getElementById('booking-step2-view').style.display = 'block';
    } else if (stepNum === 3) {
      document.getElementById('booking-step3-view').style.display = 'block';
    } else if (stepNum === 4) {
      document.getElementById('booking-step4-view').style.display = 'block';
    }

    this.updateTotals();
    this.phoneScreen.scrollTop = 0;
  }

  showScene1() {
    this.phoneContainer.classList.remove('minimized');
    document.getElementById('discovery-view').style.display = 'block';
    document.getElementById('booking-step1-view').style.display = 'none';
    document.getElementById('booking-step2-view').style.display = 'none';
    document.getElementById('booking-step3-view').style.display = 'none';
    document.getElementById('booking-step4-view').style.display = 'none';
    if (this.endingShowcase) this.endingShowcase.classList.remove('active');
    this.phoneScreen.scrollTop = 0;
  }

  minimizePhone() {
    this.phoneContainer.classList.add('minimized');
  }

  showScene4Booking() {
    this.phoneContainer.classList.remove('minimized');
    this.goToStep(1); // Return directly to booking step 1
  }

  executePaymentSuccess() {
    sound.playBookingCelebration();
    this.triggerConfetti();
    this.goToStep(4);
  }

  triggerConfetti() {
    const colors = ['#b43418', '#f59e0b', '#10b981', '#3b82f6', '#ea580c'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.style.position = 'absolute';
      c.style.top = '40%';
      c.style.left = '50%';
      c.style.width = `${Math.random() * 8 + 6}px`;
      c.style.height = `${Math.random() * 10 + 6}px`;
      c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      c.style.borderRadius = '3px';
      c.style.zIndex = '99';
      c.style.pointerEvents = 'none';
      document.body.appendChild(c);

      const destX = (Math.random() - 0.5) * window.innerWidth * 0.7;
      const destY = (Math.random() - 0.7) * window.innerHeight * 0.8;
      const rot = Math.random() * 720;

      c.animate([
        { transform: 'translate(0, 0) scale(0)', opacity: 1 },
        { transform: `translate(${destX}px, ${destY}px) rotate(${rot}deg) scale(1)`, opacity: 0 }
      ], {
        duration: 1800 + Math.random() * 800,
        easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
        fill: 'forwards'
      }).onfinish = () => c.remove();
    }
  }

  showEndingScreen() {
    this.phoneContainer.classList.add('minimized');
    if (this.endingShowcase) {
      this.endingShowcase.classList.add('active');
    }
  }

  openHotspotModal(hotspot) {
    if (!this.hotspotModalBackdrop) return;

    document.getElementById('modal-hotspot-title').textContent = hotspot.name;
    document.getElementById('modal-hotspot-category').textContent = hotspot.category;
    document.getElementById('modal-hotspot-desc').textContent = hotspot.description;

    const heroImg = document.getElementById('modal-hotspot-img');
    if (heroImg) heroImg.src = hotspot.heroImage;

    const featuresList = document.getElementById('modal-features-list');
    if (featuresList) {
      featuresList.innerHTML = '';
      hotspot.details.forEach(item => {
        const div = document.createElement('div');
        div.className = 'hotspot-feature-item';
        div.innerHTML = `<strong>${item.label}:</strong> <span>${item.val}</span>`;
        featuresList.appendChild(div);
      });
    }

    this.hotspotModalBackdrop.classList.add('open');
  }

  closeHotspotModal() {
    if (this.hotspotModalBackdrop) {
      this.hotspotModalBackdrop.classList.remove('open');
    }
  }
}
