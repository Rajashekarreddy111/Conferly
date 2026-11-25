from datetime import datetime, timezone, time
import re

def normalize_date(date_str: str) -> str:
    """Normalizes any ISO or YYYY-MM-DD date string into clean YYYY-MM-DD."""
    if not date_str:
        return ""
    clean = str(date_str).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", clean):
        return clean
    if "T" in clean:
        return clean.split("T")[0]
    try:
        dt = datetime.fromisoformat(clean.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return clean

def format_display_date(date_str: str) -> str:
    """Converts YYYY-MM-DD into strict DD-MM-YYYY format."""
    norm = normalize_date(date_str)
    if re.match(r"^\d{4}-\d{2}-\d{2}$", norm):
        parts = norm.split("-")
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return norm

def get_deadline_end_of_day_epoch(deadline_str: str) -> float:
    """
    Returns timestamp for 23:59:59.999 of the specified deadline date in UTC.
    Semantics: Conference remains active until 23:59:59 of deadline date.
    """
    norm = normalize_date(deadline_str)
    if not norm or not re.match(r"^\d{4}-\d{2}-\d{2}$", norm):
        return 0.0
    try:
        parts = [int(p) for p in norm.split("-")]
        end_dt = datetime(parts[0], parts[1], parts[2], 23, 59, 59, 999999, tzinfo=timezone.utc)
        return end_dt.timestamp()
    except Exception:
        return 0.0

def is_past_deadline(deadline_str: str) -> bool:
    """
    True only when current timestamp > 23:59:59.999 of deadline date.
    """
    end_epoch = get_deadline_end_of_day_epoch(deadline_str)
    if end_epoch == 0.0:
        return False
    now_epoch = datetime.now(timezone.utc).timestamp()
    return now_epoch > end_epoch

def is_approaching_deadline(deadline_str: str) -> bool:
    """
    Approaching deadline rule:
    0 < deadlineEndOfDay - current_timestamp <= 24 hours (86400 seconds)
    """
    end_epoch = get_deadline_end_of_day_epoch(deadline_str)
    if end_epoch == 0.0:
        return False
    now_epoch = datetime.now(timezone.utc).timestamp()
    diff = end_epoch - now_epoch
    return 0 < diff <= 86400

def get_time_remaining(deadline_str: str) -> dict:
    """Computes human-readable remaining time until 23:59:59 of deadline date."""
    end_epoch = get_deadline_end_of_day_epoch(deadline_str)
    if end_epoch == 0.0:
        return {"expired": True, "text": "No deadline", "isUrgent": False}
        
    now_epoch = datetime.now(timezone.utc).timestamp()
    diff = end_epoch - now_epoch
    
    if diff <= 0:
        return {"expired": True, "text": "Expired", "isUrgent": False}
        
    hours = int(diff // 3600)
    minutes = int((diff % 3600) // 60)
    days = hours // 24
    
    if days >= 1:
        return {"expired": False, "text": f"{days} day{'s' if days > 1 else ''} left", "isUrgent": False}
    elif hours > 0:
        return {"expired": False, "text": f"{hours}h {minutes}m left", "isUrgent": True}
    else:
        return {"expired": False, "text": f"{minutes}m left", "isUrgent": True}
