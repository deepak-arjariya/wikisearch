from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import requests
from fastapi.middleware.cors import CORSMiddleware
import openai
from sqlalchemy.dialects.postgresql import ARRAY
import json



# Database setup
DATABASE_URL = "sqlite:///./articles.db"  # Change this for production use
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


openai.api_key = "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"

# Define Article Model
class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    snippet = Column(String, nullable=False)
    tags = Column(Text, nullable=True) 
    def __repr__(self):
        return f"<Article(id={self.id}, title={self.title}, snippet={self.snippet}, tags={self.tags})>"


Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with specific origins for production
    allow_methods=["*"],
    allow_headers=["*"],
)




# Function to generate tags from the article content using OpenAI
def generate_tags_from_article(content: str):
    # Create a prompt for the LLM to extract tags

    return ["knowledge", "testing"]
    prompt = f"Extract relevant categories or tags for the following article:\n\n{content}\n\nTags:"
    
    # Call the OpenAI API to generate tags
    response = openai.chat.completions.create(
        model="davinci-002",  # You can use gpt-3.5 or gpt-4 depending on your quota
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=50,
        temperature=0.7
    )
    
    # Extract the tags from the LLM response
    tags = response['choices'][0]['message']['content'].strip().split(',')


    return [tag.strip() for tag in tags]


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Wikipedia Search Endpoint
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

from pydantic import BaseModel

# Define the Pydantic model to validate the request body
class ArticleCreate(BaseModel):
    title: str
    snippet: str

@app.post("/articles/")
def save_article(article: ArticleCreate, db: Session = Depends(get_db)):
    # Use the data in the request body
    tags = generate_tags_from_article(article.snippet)
    tags_json = json.dumps(tags)
    new_article = Article(title=article.title, snippet=article.snippet, tags=tags_json)
    db.add(new_article)
    db.commit()
    db.refresh(new_article)
    return {"message": "Article saved successfully", "article": new_article}


from typing import List

class UpdateArticleTags(BaseModel):
    tags: List[str]

@app.put("/articles/{article_id}/")
def update_article(article_id: int, request: UpdateArticleTags, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Update tags
    article.tags = json.dumps(request.tags)
    db.commit()
    db.refresh(article)
    return {"message": "Article updated successfully", "article": article}

# Get Saved Articles Endpoint
@app.get("/articles/")
def get_saved_articles(db: Session = Depends(get_db)):
    articles = db.query(Article).all()
    result = []
    for article in articles:
        result.append({
            "id": article.id,
            "title": article.title,
            "snippet": article.snippet,
            "tags": json.loads(article.tags) if article.tags else []
        })
    return result

# Delete Article Endpoint
@app.delete("/articles/{article_id}/")
def delete_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return {"message": "Article deleted successfully"}
