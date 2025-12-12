"""
Admin roles and permissions model.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.base_class import Base


# Association table for admin_user <-> admin_role
admin_user_roles = Table(
    'admin_user_roles',
    Base.metadata,
    Column('admin_user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('admin_role_id', Integer, ForeignKey('admin_roles.id'), primary_key=True)
)


class AdminRole(Base):
    """Role with a set of permissions."""
    __tablename__ = "admin_roles"

    id = Column(Integer, primary_key=True, index=True)
    
    # Role name (unique)
    name = Column(String(50), unique=True, nullable=False)
    
    # Role description
    description = Column(String(500), nullable=True)
    
    # Permissions as JSON array of permission strings
    # e.g., ["orders.read", "orders.update", "products.read", "products.write"]
    permissions = Column(JSON, default=list)
    
    # Is this a built-in role that cannot be deleted?
    is_builtin = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def has_permission(self, permission: str) -> bool:
        """Check if role has a specific permission."""
        if not self.permissions:
            return False
        
        # Check exact match
        if permission in self.permissions:
            return True
        
        # Check wildcard (e.g., "orders.*" includes "orders.read")
        parts = permission.split(".")
        if len(parts) == 2:
            wildcard = f"{parts[0]}.*"
            if wildcard in self.permissions:
                return True
        
        # Check super admin
        return "*" in self.permissions


# Define all available permissions
PERMISSIONS = {
    # Orders
    "orders.read": "View orders",
    "orders.update": "Update order status",
    "orders.refund": "Process refunds",
    
    # Products / Catalog
    "products.read": "View products",
    "products.write": "Create/edit products",
    "products.delete": "Delete products",
    
    # Categories
    "categories.read": "View categories",
    "categories.write": "Create/edit categories",
    "categories.delete": "Delete categories",
    
    # Users
    "users.read": "View users",
    "users.write": "Edit users",
    "users.ban": "Ban/unban users",
    
    # Blog
    "blog.read": "View articles",
    "blog.write": "Create/edit articles",
    "blog.delete": "Delete articles",
    
    # Moderation
    "moderation.read": "View reports and comments",
    "moderation.write": "Handle reports, delete comments",
    
    # Promo codes
    "promos.read": "View promo codes",
    "promos.write": "Create/edit promo codes",
    "promos.delete": "Delete promo codes",
    
    # Inventory
    "inventory.read": "View stock levels",
    "inventory.write": "Update stock",
    
    # Settings
    "settings.read": "View settings",
    "settings.write": "Modify settings",
    
    # Analytics
    "analytics.read": "View analytics and reports",
    
    # Admin management
    "admins.read": "View admin users",
    "admins.write": "Create/edit admin users",
    "admins.roles": "Manage roles and permissions",
    
    # Super admin
    "*": "Full access to everything",
}


# Predefined roles
BUILTIN_ROLES = {
    "super_admin": {
        "description": "Full access to all features",
        "permissions": ["*"]
    },
    "manager": {
        "description": "Order and customer management",
        "permissions": [
            "orders.read", "orders.update",
            "users.read",
            "products.read",
            "inventory.read",
            "analytics.read"
        ]
    },
    "content_manager": {
        "description": "Product and blog content management",
        "permissions": [
            "products.read", "products.write",
            "categories.read", "categories.write",
            "blog.read", "blog.write",
            "moderation.read", "moderation.write"
        ]
    },
    "support": {
        "description": "Customer support and moderation",
        "permissions": [
            "orders.read",
            "users.read",
            "moderation.read", "moderation.write"
        ]
    }
}
