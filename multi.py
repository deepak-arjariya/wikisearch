from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import Column, Integer, String, Text, ForeignKey, create_engine, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from typing import List
import json
import requests
from pydantic import BaseModel

# Configuration
DATABASE_URL = "sqlite:///./articles.db"  # Replace with your production DB URL
AUTH0_DOMAIN = "dev-vvk6ffsi4ip5unr2.us.auth0.com"  # Replace with your Auth0 domain
API_AUDIENCE = "https://dev-vvk6ffsi4ip5unr2.us.auth0.com/api/v2/"  # Replace with your Auth0 API audience
ALGORITHMS = ["RS256", "dir"]  # Support both RS256 and dir algorithms

# Shared Secret Key for "dir" algorithm
SHARED_SECRET_KEY = "your_shared_secret_key_here"  # Replace this with your actual shared secret key

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

# OAuth2 Configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        # Get the unverified header to check the algorithm
        unverified_header = jwt.get_unverified_header(token)
        print(f"unverified header {unverified_header}")
        
        # Check the algorithm used
        if unverified_header["alg"] == "dir":
            # Use the shared secret key to decode the token
            payload = jwt.decode(
                token,
                SHARED_SECRET_KEY,
                algorithms=["dir"],
                audience=API_AUDIENCE,
                issuer=f"https://{AUTH0_DOMAIN}/"
            )
            return payload
        
        # If algorithm is RS256, fetch keys from Auth0
        rsa_key = {}
        jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
        jwks_response = requests.get(jwks_url).json()
        for key in jwks_response["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
        if rsa_key:
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=ALGORITHMS,
                audience=API_AUDIENCE,
                issuer=f"https://{AUTH0_DOMAIN}/"
            )
            return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Define User model
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    auth0_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    articles: Mapped[list["Article"]] = relationship("Article", back_populates="owner")

# Define Article model
class Article(Base):
    __tablename__ = "articles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pageid: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    snippet: Mapped[str] = mapped_column(String, nullable=False)
    tags: Mapped[str] = mapped_column(String, nullable=True)  # This could also be JSON if needed
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    owner: Mapped["User"] = relationship("User", back_populates="articles")

    __table_args__ = (UniqueConstraint('pageid', 'owner_id', name='unique_pageid_per_user'),)

Base.metadata.create_all(bind=engine)

# Utility function to generate tags from OpenAI (dummy implementation)
def generate_tags_from_article(content: str) -> List[str]:
    return ["knowledge", "testing"]

# Pydantic models
# Pydantic models should not inherit from SQLAlchemy's Base
class ArticleCreate(BaseModel):  # Correct this by using BaseModel instead of Base
    title: str
    snippet: str
    pageid: int

class UpdateArticleTags(BaseModel):
    tags: List[str]


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
def save_article(
    article: ArticleCreate, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    # Get or create user in the database
    auth0_id = current_user["sub"]
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    if not user:
        user = User(auth0_id=auth0_id)
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
        owner_id=user.id,
    )
    db.add(new_article)
    db.commit()
    db.refresh(new_article)
    return {"message": "Article saved successfully", "article": new_article}

# Get Saved Articles Endpoint
@app.get("/articles/")
def get_saved_articles(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    auth0_id = current_user["sub"]
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    articles = db.query(Article).filter(Article.owner_id == user.id).all()
    return [{"pageid": article.pageid, "title": article.title, "snippet": article.snippet, "tags": json.loads(article.tags)} for article in articles]

# Update Article Tags Endpoint
@app.put("/articles/{article_id}/")
def update_article(article_id: int, request: UpdateArticleTags, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    auth0_id = current_user["sub"]
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    article = db.query(Article).filter(Article.id == article_id, Article.owner_id == user.id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article.tags = json.dumps(request.tags)
    db.commit()
    db.refresh(article)
    return {"message": "Article updated successfully", "article": article}

# Delete Article Endpoint
@app.delete("/articles/{article_id}/")
def delete_article(article_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    auth0_id = current_user["sub"]
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    article = db.query(Article).filter(Article.id == article_id, Article.owner_id == user.id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return {"message": "Article deleted successfully"}
