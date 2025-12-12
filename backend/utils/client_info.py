"""
Utilities for extracting real client information from requests.
Handles proxy headers (X-Forwarded-For, X-Real-IP) for Docker/Nginx setups.
"""
from fastapi import Request


def get_client_ip(request: Request) -> str:
    """
    Get the real client IP address from the request.
    
    Checks headers in order:
    1. X-Forwarded-For (from nginx/proxy)
    2. X-Real-IP (from nginx)
    3. request.client.host (direct connection)
    
    For X-Forwarded-For, takes the first IP (original client).
    """
    # Check X-Forwarded-For first (most common with nginx)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can be a comma-separated list: client, proxy1, proxy2
        # The first IP is the original client
        return forwarded_for.split(",")[0].strip()
    
    # Check X-Real-IP (nginx alternative)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fallback to direct connection IP
    if request.client:
        return request.client.host
    
    return "0.0.0.0"


def get_user_agent(request: Request) -> str:
    """
    Get the User-Agent from the request.
    
    Note: Brave browser reports as Chrome in User-Agent by design.
    Most Chromium-based browsers do this for compatibility.
    """
    return request.headers.get("User-Agent", "")
