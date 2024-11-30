from fastapi import FastAPI, Depends, HTTPException, WebSocket
from fastapi_users import FastAPIUsers, UserManager
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import Column, String, Integer, create_engine, ForeignKey, Table, Text
from sqlalchemy.ext.declarative import DeclarativeMeta, declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import requests
from langchain.chat_models import ChatOpenAI
from gemini_pro import GeminiPro

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
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
DATABASE_URL = "cockroachdb://<username>:<password>@<cluster>/<db_name>?sslmode=require"
engine = create_engine(DATABASE_URL)
Base: DeclarativeMeta = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# User Model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

# Article Model
class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    snippet = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    tags = Column(Text)

app = FastAPI()

# Wikipedia Search Endpoint
@app.get("/search/")
def search_wikipedia(keyword: str):
    url = "https://en.wikipedia.org/w/api.php"
    params = {"action": "query", "list": "search", "srsearch": keyword, "format": "json"}
    response = requests.get(url, params=params).json()
    return response["query"]["search"]

# Save Article and Auto-tag
@app.post("/articles/")
def save_article(title: str, snippet: str, user_id: int, gemini: GeminiPro = Depends(GeminiPro)):
    tags = gemini.tag_text(snippet)
    session = SessionLocal()
    article = Article(title=title, snippet=snippet, user_id=user_id, tags=", ".join(tags))
    session.add(article)
    session.commit()
    return {"message": "Article saved with tags", "tags": tags}

# Get Saved Articles
@app.get("/articles/")
def get_articles(user_id: int):
    session = SessionLocal()
    articles = session.query(Article).filter(Article.user_id == user_id).all()
    return articles

# Modify Tags
@app.put("/articles/{article_id}/tags/")
def update_tags(article_id: int, new_tags: str):
    session = SessionLocal()
    article = session.query(Article).get(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article.tags = new_tags
    session.commit()
    return {"message": "Tags updated"}
