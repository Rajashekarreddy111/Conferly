/**
 * Date and deadline utilities.
 * Requirement:
 * - Deadline contains ONLY a date (YYYY-MM-DD), not a time.
 * - Display format must strictly be DD-MM-YYYY (e.g. 25-11-2026).
 * - Semantics: A conference remains active throughout its deadline date,
 *   and becomes expired at the start of the following day (23:59:59 of that date).
 */

/**
 * Formats a date string (ISO, YYYY-MM-DD) into DD-MM-YYYY format.
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    // If format is YYYY-MM-DD
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
      const [year, month, day] = dateString.trim().split('-');
      return `${day}-${month}-${year}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

/**
 * Display format is DD-MM-YYYY across the entire app.
 */
export const formatDateTime = (dateString) => {
  return formatDate(dateString);
};

/**
 * Normalizes any deadline input (YYYY-MM-DD or ISO) into YYYY-MM-DD.
 */
export const normalizeDateInput = (val) => {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * End of deadline date in local time: 23:59:59.999 of the specified date.
 */
export const getDeadlineEndOfDayTimestamp = (deadlineString) => {
  if (!deadlineString) return 0;
  try {
    let year, month, day;
    if (typeof deadlineString === 'string' && deadlineString.includes('-')) {
      const parts = deadlineString.split('T')[0].split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      const d = new Date(deadlineString);
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }
    // Set to 23:59:59.999 on that date
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);
    return endOfDay.getTime();
  } catch {
    return new Date(deadlineString).getTime();
  }
};

/**
 * Checks if a conference deadline has passed.
 * Expired only when current time > 23:59:59 of deadline date.
 */
export const isPastDeadline = (deadlineString) => {
  if (!deadlineString) return false;
  const deadlineEndMs = getDeadlineEndOfDayTimestamp(deadlineString);
  return Date.now() > deadlineEndMs;
};

/**
 * Requirement: Approaching deadline when:
 * 0 < deadlineEndOfDay - current_time <= 24 hours
 */
export const isApproachingDeadline = (deadlineString) => {
  if (!deadlineString) return false;
  const deadlineEndMs = getDeadlineEndOfDayTimestamp(deadlineString);
  const now = Date.now();
  const diffMs = deadlineEndMs - now;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return diffMs > 0 && diffMs <= twentyFourHoursMs;
};

export const getDeadlineStatus = (deadlineString) => {
  if (!deadlineString) return 'unknown';
  if (isPastDeadline(deadlineString)) return 'expired';
  if (isApproachingDeadline(deadlineString)) return 'approaching';
  return 'active';
};

export const getTimeRemaining = (deadlineString) => {
  if (!deadlineString) return { expired: true, text: 'No deadline', isUrgent: false };
  const deadlineEndMs = getDeadlineEndOfDayTimestamp(deadlineString);
  const now = Date.now();
  const diffMs = deadlineEndMs - now;

  if (diffMs <= 0) {
    return { expired: true, text: 'Expired', isUrgent: false };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(hours / 24);

  if (days >= 1) {
    return { expired: false, text: `${days} day${days > 1 ? 's' : ''} left`, isUrgent: false };
  }
  if (hours > 0) {
    return { expired: false, text: `${hours}h ${minutes}m left`, isUrgent: true };
  }
  return { expired: false, text: `${minutes}m left`, isUrgent: true };
};
