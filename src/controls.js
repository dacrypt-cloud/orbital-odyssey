/**
 * Orbital Odyssey: Gravity Well
 * Unified Desktop Keyboard & Android/Mobile Multi-Touch Control System
 */
(function (root) {
  'use strict';

  class InputController {
    constructor(callbacks = {}) {
      this.callbacks = callbacks;

      this.keys = {
        left: false,
        right: false,
        thrust: false,
        brake: false,
        boost: false
      };

      this.touch = {
        left: false,
        right: false,
        thrust: false,
        brake: false,
        boost: false,
        joystickActive: false,
        joystickAngle: null,
        joystickMagnitude: 0
      };

      this.joystickTouchId = null;
      this.joystickCenter = { x: 0, y: 0 };
      this.maxJoystickRadius = 46;

      this._bindKeyboard();
      this._bindTouchControls();
    }

    getState() {
      const usingJoystick = this.touch.joystickActive && this.touch.joystickMagnitude > 0.16;
      return {
        left: this.keys.left || this.touch.left,
        right: this.keys.right || this.touch.right,
        thrust:
          this.keys.thrust ||
          this.touch.thrust ||
          (usingJoystick && this.touch.joystickMagnitude > 0.58),
        brake: this.keys.brake || this.touch.brake,
        boost: this.keys.boost || this.touch.boost,
        targetAngle: usingJoystick ? this.touch.joystickAngle : null
      };
    }

    resetAll() {
      this.keys.left = false;
      this.keys.right = false;
      this.keys.thrust = false;
      this.keys.brake = false;
      this.keys.boost = false;

      this.touch.left = false;
      this.touch.right = false;
      this.touch.thrust = false;
      this.touch.brake = false;
      this.touch.boost = false;
      this.touch.joystickActive = false;
      this.touch.joystickAngle = null;
      this.touch.joystickMagnitude = 0;
      this.joystickTouchId = null;

      this._updateJoystickKnob(0, 0);
      this._syncButtonVisuals();
    }

    _bindKeyboard() {
      if (typeof window === 'undefined') return;

      window.addEventListener('keydown', (e) => {
        // Ignore shortcuts if typing in an input
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
          return;
        }

        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
            this.keys.left = true;
            e.preventDefault();
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.keys.right = true;
            e.preventDefault();
            break;
          case 'ArrowUp':
          case 'KeyW':
            this.keys.thrust = true;
            e.preventDefault();
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.keys.brake = true;
            e.preventDefault();
            break;
          case 'Space':
          case 'ShiftLeft':
          case 'ShiftRight':
            this.keys.boost = true;
            e.preventDefault();
            break;
          case 'KeyP':
          case 'Escape':
            if (this.callbacks.onPauseToggle) this.callbacks.onPauseToggle();
            e.preventDefault();
            break;
          case 'KeyR':
            if (this.callbacks.onRestart) this.callbacks.onRestart();
            e.preventDefault();
            break;
          case 'KeyM':
            if (this.callbacks.onMuteToggle) this.callbacks.onMuteToggle();
            e.preventDefault();
            break;
          case 'KeyT':
            if (this.callbacks.onTrajectoryToggle) this.callbacks.onTrajectoryToggle();
            e.preventDefault();
            break;
          case 'KeyZ':
          case 'KeyV':
            if (this.callbacks.onZoomToggle) this.callbacks.onZoomToggle();
            e.preventDefault();
            break;
          default:
            break;
        }
      });

      window.addEventListener('keyup', (e) => {
        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
            this.keys.left = false;
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.keys.right = false;
            break;
          case 'ArrowUp':
          case 'KeyW':
            this.keys.thrust = false;
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.keys.brake = false;
            break;
          case 'Space':
          case 'ShiftLeft':
          case 'ShiftRight':
            this.keys.boost = false;
            break;
          default:
            break;
        }
      });

      window.addEventListener('blur', () => this.resetAll());
    }

    _bindTouchControls() {
      if (typeof document === 'undefined') return;

      const bindHoldButton = (id, prop) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        const activate = (e) => {
          if (e.cancelable) e.preventDefault();
          this.touch[prop] = true;
          btn.classList.add('active');
          if (navigator.vibrate) {
            try {
              navigator.vibrate(10);
            } catch (_) {}
          }
        };

        const deactivate = (e) => {
          if (e && e.cancelable) e.preventDefault();
          this.touch[prop] = false;
          btn.classList.remove('active');
        };

        btn.addEventListener('touchstart', activate, { passive: false });
        btn.addEventListener('touchend', deactivate, { passive: false });
        btn.addEventListener('touchcancel', deactivate, { passive: false });
        btn.addEventListener('mousedown', activate);
        btn.addEventListener('mouseup', deactivate);
        btn.addEventListener('mouseleave', deactivate);
      };

      bindHoldButton('btn-touch-left', 'left');
      bindHoldButton('btn-touch-right', 'right');
      bindHoldButton('btn-touch-thrust', 'thrust');
      bindHoldButton('btn-touch-brake', 'brake');
      bindHoldButton('btn-touch-boost', 'boost');

      // Virtual Analog Thumbstick
      const joyZone = document.getElementById('joystick-base');
      if (!joyZone) return;

      const handleJoyStart = (clientX, clientY) => {
        const rect = joyZone.getBoundingClientRect();
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        this.maxJoystickRadius = Math.max(32, rect.width * 0.42);
        this.touch.joystickActive = true;
        joyZone.classList.add('active');
        handleJoyMove(clientX, clientY);
      };

      const handleJoyMove = (clientX, clientY) => {
        if (!this.touch.joystickActive) return;
        const dx = clientX - this.joystickCenter.x;
        const dy = clientY - this.joystickCenter.y;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, this.maxJoystickRadius);
        const angle = Math.atan2(dy, dx);

        this.touch.joystickAngle = angle;
        this.touch.joystickMagnitude = clampedDist / this.maxJoystickRadius;

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;
        this._updateJoystickKnob(knobX, knobY);
      };

      const handleJoyEnd = () => {
        this.touch.joystickActive = false;
        this.touch.joystickAngle = null;
        this.touch.joystickMagnitude = 0;
        this.joystickTouchId = null;
        joyZone.classList.remove('active');
        this._updateJoystickKnob(0, 0);
      };

      joyZone.addEventListener(
        'touchstart',
        (e) => {
          if (e.cancelable) e.preventDefault();
          const t = e.changedTouches[0];
          if (t) {
            this.joystickTouchId = t.identifier;
            handleJoyStart(t.clientX, t.clientY);
          }
        },
        { passive: false }
      );

      joyZone.addEventListener(
        'touchmove',
        (e) => {
          if (e.cancelable) e.preventDefault();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === this.joystickTouchId) {
              handleJoyMove(t.clientX, t.clientY);
              break;
            }
          }
        },
        { passive: false }
      );

      const onTouchFinish = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystickTouchId) {
            handleJoyEnd();
            break;
          }
        }
      };

      joyZone.addEventListener('touchend', onTouchFinish, { passive: false });
      joyZone.addEventListener('touchcancel', onTouchFinish, { passive: false });

      // Mouse drag fallback on joystick for desktop/testing
      let mouseDraggingJoy = false;
      joyZone.addEventListener('mousedown', (e) => {
        e.preventDefault();
        mouseDraggingJoy = true;
        handleJoyStart(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => {
        if (mouseDraggingJoy) {
          handleJoyMove(e.clientX, e.clientY);
        }
      });
      window.addEventListener('mouseup', () => {
        if (mouseDraggingJoy) {
          mouseDraggingJoy = false;
          handleJoyEnd();
        }
      });
    }

    _updateJoystickKnob(dx, dy) {
      if (typeof document === 'undefined') return;
      const knob = document.getElementById('joystick-knob');
      if (knob) {
        knob.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
      }
    }

    _syncButtonVisuals() {
      if (typeof document === 'undefined') return;
      const ids = [
        'btn-touch-left',
        'btn-touch-right',
        'btn-touch-thrust',
        'btn-touch-brake',
        'btn-touch-boost'
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
      });
    }
  }

  root.Orbital = root.Orbital || {};
  root.Orbital.InputController = InputController;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputController };
  }
})(typeof window !== 'undefined' ? window : globalThis);
