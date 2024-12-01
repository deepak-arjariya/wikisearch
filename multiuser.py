from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import Column, Integer, String, Text, ForeignKey, create_engine, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import requests
from pydantic import BaseModel

# Configuration
DATABASE_URL = "sqlite:///./articles.db"  # Replace with your production DB URL

# Database setup
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# FastAPI app
app = FastAPI()

# Middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with specific origins in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Define User model (user_id as string for handling large values)
class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)  # Changed to String
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    articles: Mapped[list["Article"]] = relationship("Article", back_populates="owner")

# Define Article model
class Article(Base):
    __tablename__ = "articles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pageid: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    snippet: Mapped[str] = mapped_column(String, nullable=False)
    tags: Mapped[str] = mapped_column(String, nullable=True)  # This could also be JSON if needed
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))  # Changed to String
    owner: Mapped["User"] = relationship("User", back_populates="articles")

    __table_args__ = (UniqueConstraint('pageid', 'owner_id', name='unique_pageid_per_user'),)

Base.metadata.create_all(bind=engine)

# Utility function to generate tags from OpenAI (dummy implementation)
def generate_tags_from_article(content: str) -> List[str]:
    return ["knowledge", "testing"]

# Pydantic models
class ArticleCreate(BaseModel):
    title: str
    snippet: str
    pageid: int
    user_id: str  # This is now a string to handle large values

class UpdateArticleTags(BaseModel):
    tags: List[str]
    user_id: str

@app.get("/search/")
def search_wikipedia(keyword: str):
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "srsearch": keyword,
        "format": "json",
    }
    response = requests.get(url, params=params)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Wikipedia API error")
    data = response.json()
    return data.get("query", {}).get("search", [])

# Save Article Endpoint
@app.post("/articles/")
def save_article(article: ArticleCreate, db: Session = Depends(get_db)):
    # Extract the user_id and other details
    user_id = article.user_id
    print(f"Processing article for user ID: {user_id}")
    print("======================================================")
    
    # Get or create user in the database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Create a new user if not found
        user = User(id=user_id, name=f"User-{user_id}")  # Use a placeholder name based on user_id
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Check if the article already exists for this user
    existing_article = db.query(Article).filter(
        Article.pageid == article.pageid,
        Article.owner_id == user.id
    ).first()
    if existing_article:
        return {"message": f"Article '{existing_article.title}' already exists for the user."}

    # Generate tags and save the article
    tags = generate_tags_from_article(article.snippet)
    tags_json = json.dumps(tags)
    new_article = Article(
        title=article.title,
        snippet=article.snippet,
        tags=tags_json,
        pageid=article.pageid,
        owner_id=user.id,  # owner_id is now a string
    )
    db.add(new_article)
    db.commit()
    db.refresh(new_article)
    return {"message": "Article saved successfully", "article": new_article}

# Get Saved Articles Endpoint
@app.get("/articles/{user_id}/")
def get_saved_articles(user_id: str, db: Session = Depends(get_db)):  # user_id as a string
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    articles = db.query(Article).filter(Article.owner_id == user.id).all()
    result =  [{"pageid": article.pageid, "title": article.title, "snippet": article.snippet, "tags": json.loads(article.tags), "owner_id": article.owner_id, "id": article.id, "owner_name": article.owner} for article in articles]
    print(result)
    return result

# Update Article Tags Endpoint
@app.put("/articles/{article_id}/")
def update_article(article_id: int, request: UpdateArticleTags, db: Session = Depends(get_db)):  # user_id as a string
    user_id = request.user_id
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    article = db.query(Article).filter(Article.pageid == article_id, Article.owner_id == user_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article.tags = json.dumps(request.tags)
    db.commit()
    db.refresh(article)
    return {"message": "Article updated successfully", "article": article}

# Delete Article Endpoint
@app.delete("/articles/{user_id}/{article_id}/")
def delete_article(user_id: str, article_id: int, db: Session = Depends(get_db)):  # user_id as a string
    print(user_id)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print("user not found")
        raise HTTPException(status_code=404, detail="User not found")
    article = db.query(Article).filter(Article.pageid == article_id, Article.owner_id == user_id).first()
    if not article:
        print("article not found")
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return {"message": "Article deleted successfully"}
