/**
 * Opens a WhatsApp chat URL.
 * Uses multiple fallback strategies to escape iframe sandboxes (e.g. Lovable preview).
 */
export const openWhatsApp = (phoneNumber: string, message?: string) => {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const cleanNumber = digitsOnly.length === 10 && digitsOnly.startsWith("9")
    ? `977${digitsOnly}`
    : digitsOnly;
  if (!cleanNumber) return;

  const url = message
    ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${cleanNumber}`;

  try {
    const win = window.top?.open(url, "_blank", "noopener,noreferrer");
    if (win) return;
  } catch {}

  try {
    const win = window.parent?.open(url, "_blank", "noopener,noreferrer");
    if (win) return;
  } catch {}

  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) return;
  } catch {}

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
