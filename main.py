import psycopg2
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import os
import requests
from pydantic import BaseModel
import google.generativeai as genai

genai.configure(api_key=os.getenv('GENAI_KEY', ""))
model = genai.GenerativeModel("gemini-1.5-flash")


DATABASE_URL = os.getenv('DATABASE_URL', "")


conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

create_users_table = """
CREATE TABLE IF NOT EXISTS users (
    id STRING PRIMARY KEY,
    name STRING
);
"""

create_articles_table = """
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title STRING NOT NULL,
    snippet STRING NOT NULL,
    tags STRING,
    pageid INT NOT NULL,
    owner_id STRING REFERENCES users(id),
    UNIQUE (pageid, owner_id)
);
"""


cursor.execute(create_users_table)
cursor.execute(create_articles_table)


conn.commit()
cursor.close()
conn.close()

print("Tables created successfully.")


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    return conn, cursor


def close_db(conn, cursor):
    cursor.close()
    conn.close()


class ArticleCreate(BaseModel):
    title: str
    snippet: str
    pageid: int
    user_id: str

class UpdateArticleTags(BaseModel):
    tags: List[str]
    user_id: str


def generate_tags_from_article(content: str) -> List[str]:
    try:
    
        message = f"""
        Select appropriate tags from the tags listed below given content and return in the form of a list:

        Content: {content}

        Tags: Technology, Self-Help, Market, Biography, Discovery, Inventions, Science, History, Geography, Love, Humor, Finance.
        """
        
        
        response = model.generate_content(message)
        
        
        print(response.text)
        tags = response.text.strip().split(",")  
        tags = [tag.strip().replace('[', '').replace(']', '').replace("'", "").replace('"', "") for tag in tags]  
        
        return tags
    except Exception as e:
        print(e)
        return ['Default']

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


@app.post("/articles/")
def save_article(article: ArticleCreate):
    conn, cursor = get_db()

    try:
        
        cursor.execute("SELECT * FROM users WHERE id = %s", (article.user_id,))
        user = cursor.fetchone()
        if not user:
            cursor.execute("INSERT INTO users (id, name) VALUES (%s, %s)", (article.user_id, f"User-{article.user_id}"))
            conn.commit()

        
        cursor.execute("SELECT * FROM articles WHERE pageid = %s AND owner_id = %s", (article.pageid, article.user_id))
        existing_article = cursor.fetchone()
        if existing_article:
            close_db(conn, cursor)
            return {"message": f"Article '{existing_article[1]}' already exists for the user."}

        
        tags = generate_tags_from_article(article.snippet)
        tags_json = json.dumps(tags)

        cursor.execute(
            "INSERT INTO articles (title, snippet, tags, pageid, owner_id) VALUES (%s, %s, %s, %s, %s) RETURNING *",
            (article.title, article.snippet, tags_json, article.pageid, article.user_id)
        )
        conn.commit()
        new_article = cursor.fetchone()

        close_db(conn, cursor)
        return {"message": "Article saved successfully", "article": new_article}

    except Exception as e:
        close_db(conn, cursor)
        print(e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/articles/{user_id}/")
def get_saved_articles(user_id: str):
    conn, cursor = get_db()

    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            close_db(conn, cursor)
            raise HTTPException(status_code=404, detail="User not found")

        cursor.execute("SELECT id, title, snippet, tags, pageid, owner_id FROM articles WHERE owner_id = %s", (user_id,))
        articles = cursor.fetchall()

        result = []
        for article in articles:
            print(article)
            try:
                tags = json.loads(article[3]) if isinstance(article[3], str) else article[3]
            except json.JSONDecodeError:
                tags = article[4]

            result.append({
                "pageid": article[4],
                "title": article[1],
                "snippet": article[2],
                "tags": tags,
                "owner_id": article[5],
                "id": article[0],
                "owner_name": user[1]
            })
        
        close_db(conn, cursor)
        print(result)
        return result

    except Exception as e:
        print(e)
        close_db(conn, cursor)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/articles/{article_id}/")
def update_article(article_id: int, request: UpdateArticleTags):
    conn, cursor = get_db()

    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (request.user_id,))
        user = cursor.fetchone()
        if not user:
            close_db(conn, cursor)
            raise HTTPException(status_code=404, detail="User not found")

        cursor.execute("SELECT * FROM articles WHERE pageid = %s AND owner_id = %s", (article_id, request.user_id))
        article = cursor.fetchone()
        if not article:
            close_db(conn, cursor)
            raise HTTPException(status_code=404, detail="Article not found")

        tags_json = json.dumps(request.tags)
        cursor.execute("UPDATE articles SET tags = %s WHERE pageid = %s AND owner_id = %s RETURNING *", (tags_json, article_id, request.user_id))
        conn.commit()
        updated_article = cursor.fetchone()

        close_db(conn, cursor)
        return {"message": "Article updated successfully", "article": updated_article}

    except Exception as e:
        close_db(conn, cursor)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.delete("/articles/{user_id}/{article_id}/")
def delete_article(user_id: str, article_id: int):
    conn, cursor = get_db()

    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            close_db(conn, cursor)
            raise HTTPException(status_code=404, detail="User not found")

        cursor.execute("SELECT * FROM articles WHERE pageid = %s AND owner_id = %s", (article_id, user_id))
        article = cursor.fetchone()
        if not article:
            close_db(conn, cursor)
            raise HTTPException(status_code=404, detail="Article not found")

        cursor.execute("DELETE FROM articles WHERE pageid = %s AND owner_id = %s", (article_id, user_id))
        conn.commit()

        close_db(conn, cursor)
        return {"message": "Article deleted successfully"}

    except Exception as e:
        close_db(conn, cursor)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
