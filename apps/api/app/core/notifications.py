"""
Notification utilities for BlestLabs admin alerts.

Supports:
- Discord webhooks
- Ntfy.sh push notifications

Set webhook URLs in .env:
- DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
- NTFY_TOPIC_URL=https://ntfy.sh/your-topic-name
"""

import httpx
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("notifications")


async def send_discord_notification(
    title: str,
    description: str,
    color: int = 0x5865F2,  # Discord blurple
    fields: Optional[list] = None
):
    """
    Send notification to Discord webhook.

    Args:
        title: Embed title
        description: Main message content
        color: Embed color (hex integer)
        fields: Optional list of {"name": str, "value": str, "inline": bool}
    """
    if not settings.DISCORD_WEBHOOK_URL:
        return

    embed = {
        "title": title,
        "description": description,
        "color": color,
        "timestamp": None  # Discord will use current time
    }

    if fields:
        embed["fields"] = fields

    payload = {"embeds": [embed]}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.DISCORD_WEBHOOK_URL,
                json=payload,
                timeout=10.0
            )
            if response.status_code not in (200, 204):
                logger.warning(f"Discord webhook returned {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to send Discord notification: {e}")


async def send_ntfy_notification(
    title: str,
    message: str,
    priority: str = "default",
    tags: Optional[list] = None
):
    """
    Send push notification via ntfy.sh.

    Args:
        title: Notification title
        message: Notification body
        priority: "min", "low", "default", "high", "urgent"
        tags: Optional emoji tags like ["user", "email"]
    """
    if not settings.NTFY_TOPIC_URL:
        return

    headers = {
        "Title": title,
        "Priority": priority
    }

    if tags:
        headers["Tags"] = ",".join(tags)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.NTFY_TOPIC_URL,
                content=message,
                headers=headers,
                timeout=10.0
            )
            if response.status_code not in (200, 204):
                logger.warning(f"Ntfy returned {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to send ntfy notification: {e}")


async def notify_new_signup(email: str, name: str):
    """Notify admin of new user signup."""
    # Discord
    await send_discord_notification(
        title="New User Signup",
        description=f"**{name}** just signed up!",
        color=0x57F287,  # Green
        fields=[
            {"name": "Email", "value": email, "inline": True},
            {"name": "Action", "value": "Review in admin panel", "inline": True}
        ]
    )

    # Ntfy
    await send_ntfy_notification(
        title="New BlestLabs Signup",
        message=f"{name} ({email}) just signed up",
        priority="default",
        tags=["user", "tada"]
    )


async def notify_access_request(email: str, name: str, reason: str):
    """Notify admin of CCResearch access request."""
    # Discord
    await send_discord_notification(
        title="CCResearch Access Request",
        description=f"**{name}** is requesting access to CCResearch",
        color=0xFEE75C,  # Yellow
        fields=[
            {"name": "Email", "value": email, "inline": True},
            {"name": "Reason", "value": reason[:500] if reason else "Not provided", "inline": False}
        ]
    )

    # Ntfy
    await send_ntfy_notification(
        title="CCResearch Access Request",
        message=f"{name} ({email}) wants access: {reason[:100]}",
        priority="high",
        tags=["key", "warning"]
    )


async def notify_plugin_skill_request(
    email: str,
    request_type: str,
    name: str,
    description: str,
    use_case: str
):
    """Notify admin of plugin/skill request."""
    # Discord
    await send_discord_notification(
        title=f"New {request_type.capitalize()} Request",
        description=f"Someone requested a new {request_type}: **{name}**",
        color=0x5865F2,  # Blurple
        fields=[
            {"name": "Email", "value": email, "inline": True},
            {"name": "Name", "value": name, "inline": True},
            {"name": "Description", "value": description[:500] if description else "None", "inline": False},
            {"name": "Use Case", "value": use_case[:500] if use_case else "None", "inline": False}
        ]
    )

    # Ntfy
    await send_ntfy_notification(
        title=f"New {request_type.capitalize()} Request",
        message=f"{email} wants: {name}\n{description[:100]}",
        priority="default",
        tags=["package", "inbox_tray"]
    )
