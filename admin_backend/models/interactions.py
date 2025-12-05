from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.base_class import Base

class Comment(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    article_id = Column(Integer, ForeignKey("article.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=True)
    
    likes_count = Column(Integer, default=0)
    
    user = relationship("User", backref="comments")
    article = relationship("Article", backref="comments")
    product = relationship("Product", backref="comments")

class Like(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    fingerprint = Column(String, nullable=True)
    
    article_id = Column(Integer, ForeignKey("article.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=True)
    comment_id = Column(Integer, ForeignKey("comment.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'article_id', 'product_id', 'comment_id', name='uq_like_user_target'),
        UniqueConstraint('fingerprint', 'article_id', 'product_id', 'comment_id', name='uq_like_fingerprint_target'),
    )

class View(Base):
    id = Column(Integer, primary_key=True, index=True)
    fingerprint = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    article_id = Column(Integer, ForeignKey("article.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Report(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    comment_id = Column(Integer, ForeignKey("comment.id"), nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, default="new") # new, resolved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
