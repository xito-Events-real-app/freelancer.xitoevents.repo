// Simple event emitter to trigger the BookingReminderPopup externally
const listeners = new Set<() => void>();

export function onOpenBookingPopup(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function triggerBookingPopup() {
  listeners.forEach(cb => cb());
}
