import resend
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def _get_config():
    """Get email config from environment at call time (not import time)."""
    return {
        "api_key": os.environ.get("RESEND_API_KEY", ""),
        "from_email": os.environ.get("FROM_EMAIL", "ViciLend <noreply@vicilend.com>"),
        "app_url": os.environ.get("APP_URL", "https://vicilend.com"),
    }


def _send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend. Returns True on success, False on failure."""
    cfg = _get_config()
    if not cfg["api_key"]:
        logger.warning("RESEND_API_KEY not set, skipping email send")
        return False
    try:
        resend.api_key = cfg["api_key"]
        resend.Emails.send({
            "from": cfg["from_email"],
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False


def send_password_reset_email(to: str, user_name: str, reset_token: str) -> bool:
    """Send password reset email with token link."""
    app_url = _get_config()["app_url"]
    reset_url = f"{app_url}?reset_token={reset_token}"
    subject = "ViciLend — Reset Your Password"
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669;">ViciLend</h2>
        <p>Hi {user_name},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{reset_url}" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Reset Password
            </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">ViciLend — Lending in my vicinity</p>
    </div>
    """
    return _send_email(to, subject, html)


def send_rental_request_email(to: str, owner_name: str, requester_name: str, item_title: str, start_date: str, end_date: str, message: Optional[str] = None) -> bool:
    """Notify item owner of a new rental request."""
    app_url = _get_config()["app_url"]
    subject = f"ViciLend — New rental request for \"{item_title}\""
    msg_html = f"<p><em>\"{message}\"</em></p>" if message else ""
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669;">ViciLend</h2>
        <p>Hi {owner_name},</p>
        <p><strong>{requester_name}</strong> wants to rent your item <strong>"{item_title}"</strong>.</p>
        <p>📅 <strong>{start_date}</strong> to <strong>{end_date}</strong></p>
        {msg_html}
        <p style="text-align: center; margin: 32px 0;">
            <a href="{app_url}" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                View Request
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">ViciLend — Lending in my vicinity</p>
    </div>
    """
    return _send_email(to, subject, html)


def send_rental_status_email(to: str, user_name: str, item_title: str, status: str, owner_name: str) -> bool:
    """Notify requester that their rental request status changed."""
    app_url = _get_config()["app_url"]
    status_labels = {
        "approved": ("approved", "You can now arrange pickup with the owner."),
        "rejected": ("declined", "The owner is unable to lend this item at this time."),
        "returned": ("marked as returned", "The item has been returned. Don't forget to rate the owner!"),
    }
    label, detail = status_labels.get(status, (status, ""))
    subject = f"ViciLend — Your request for \"{item_title}\" was {label}"
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669;">ViciLend</h2>
        <p>Hi {user_name},</p>
        <p>Your rental request for <strong>"{item_title}"</strong> has been <strong>{label}</strong> by {owner_name}.</p>
        <p>{detail}</p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{app_url}" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Open ViciLend
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">ViciLend — Lending in my vicinity</p>
    </div>
    """
    return _send_email(to, subject, html)


def send_booking_request_email(to: str, provider_name: str, requester_name: str, service_title: str, scheduled_date: str, message: Optional[str] = None) -> bool:
    """Notify service provider of a new booking request."""
    app_url = _get_config()["app_url"]
    subject = f"ViciLend — New booking request for \"{service_title}\""
    msg_html = f"<p><em>\"{message}\"</em></p>" if message else ""
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669;">ViciLend</h2>
        <p>Hi {provider_name},</p>
        <p><strong>{requester_name}</strong> wants to book your service <strong>"{service_title}"</strong>.</p>
        <p>📅 Scheduled: <strong>{scheduled_date}</strong></p>
        {msg_html}
        <p style="text-align: center; margin: 32px 0;">
            <a href="{app_url}" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                View Request
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">ViciLend — Lending in my vicinity</p>
    </div>
    """
    return _send_email(to, subject, html)


def send_booking_status_email(to: str, user_name: str, service_title: str, status: str, provider_name: str) -> bool:
    """Notify requester that their service booking status changed."""
    app_url = _get_config()["app_url"]
    status_labels = {
        "approved": ("approved", "The provider will be in touch to coordinate."),
        "rejected": ("declined", "The provider is unable to fulfill this booking at this time."),
        "completed": ("marked as completed", "Don't forget to rate the provider!"),
    }
    label, detail = status_labels.get(status, (status, ""))
    subject = f"ViciLend — Your booking for \"{service_title}\" was {label}"
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669;">ViciLend</h2>
        <p>Hi {user_name},</p>
        <p>Your booking for <strong>"{service_title}"</strong> has been <strong>{label}</strong> by {provider_name}.</p>
        <p>{detail}</p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{app_url}" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Open ViciLend
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">ViciLend — Lending in my vicinity</p>
    </div>
    """
    return _send_email(to, subject, html)


def send_new_message_email(to: str, recipient_name: str, sender_name: str, message_preview: str) -> bool:
    """Notify user of a new message."""
    app_url = _get_config()["app_url"]
    preview = message_preview[:100] + "..." if len(message_preview) > 100 else message_preview
    subject = f"ViciLend — New message from {sender_name}"
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669;">ViciLend</h2>
        <p>Hi {recipient_name},</p>
        <p><strong>{sender_name}</strong> sent you a message:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #374151;">"{preview}"</p>
        </div>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{app_url}" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Reply on ViciLend
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">ViciLend — Lending in my vicinity</p>
    </div>
    """
    return _send_email(to, subject, html)
