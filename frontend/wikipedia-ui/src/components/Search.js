import React, { useState } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  Link,
} from "@mui/material";
import { Save } from "@mui/icons-material";

const Search = () => {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedArticles, setSavedArticles] = useState(new Set()); // Track saved articles

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/search/`, {
        params: { keyword },
      });
      setResults(response.data);
    } catch (error) {
      console.error("Error searching Wikipedia:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (article) => {
    try {
      await axios.post(`http://127.0.0.1:8000/articles/`, {
        title: article.title,
        snippet: article.snippet,
        pageid: article.pageid,
      });
      setSavedArticles((prevSaved) => new Set(prevSaved).add(article.pageid)); // Update saved articles state
    } catch (error) {
      console.error("Error saving article:", error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Search Wikipedia Articles
      </Typography>
      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item xs={12} sm={8}>
          <TextField
            label="Search Wikipedia"
            fullWidth
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            variant="outlined"
            placeholder="Type a keyword (e.g., AI, History)"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearch}
            fullWidth
            disabled={!keyword || loading}
          >
            {loading ? <CircularProgress size={24} /> : "Search"}
          </Button>
        </Grid>
      </Grid>
      <Typography variant="h6" sx={{ mt: 4 }}>
        Search Results
      </Typography>
      {results.length > 0 ? (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {results.map((result) => (
            <Grid item xs={12} sm={6} key={result.pageid}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Link
                      href={`https://en.wikipedia.org/?curid=${result.pageid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="inherit"
                      style={{ textDecoration: "none" }}
                    >
                      {result.title}
                    </Link>
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                  />
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleSave(result)}
                    startIcon={<Save />}
                    disabled={savedArticles.has(result.pageid)} // Disable if already saved
                  >
                    {savedArticles.has(result.pageid) ? "Saved" : "Save Article"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        !loading && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            No results found. Try searching for something else.
          </Typography>
        )
      )}
    </Container>
  );
};

export default Search;
