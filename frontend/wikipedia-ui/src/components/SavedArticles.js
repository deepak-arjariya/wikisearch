import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Typography,
  Container,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  TextField,
  Grid,
  Box,
  Link,
  CircularProgress,
} from "@mui/material";
import { Delete, Edit, Save } from "@mui/icons-material";

const SavedArticles = () => {
  const [articles, setArticles] = useState([]);
  const [editingTags, setEditingTags] = useState(null);
  const [newTags, setNewTags] = useState("");
  const [loading, setLoading] = useState({ delete: null, saveTags: null });

  const fetchSavedArticles = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/articles/`);
      setArticles(response.data);
    } catch (error) {
      console.error("Error fetching saved articles:", error);
    }
  };

  const handleDelete = async (id) => {
    setLoading((prev) => ({ ...prev, delete: id }));
    try {
      await axios.delete(`http://127.0.0.1:8000/articles/${id}/`);
      fetchSavedArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
    } finally {
      setLoading((prev) => ({ ...prev, delete: null }));
    }
  };

  const handleSaveTags = async (id) => {
    setLoading((prev) => ({ ...prev, saveTags: id }));
    try {
      const updatedTags = newTags.split(",").map((tag) => tag.trim());
      await axios.put(`http://127.0.0.1:8000/articles/${id}/`, {
        tags: updatedTags,
      });
      fetchSavedArticles();
    } catch (error) {
      console.error("Error updating tags:", error);
    } finally {
      setLoading((prev) => ({ ...prev, saveTags: null }));
      setEditingTags(null);
    }
  };

  const stripHtmlTags = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  useEffect(() => {
    fetchSavedArticles();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Saved Articles
      </Typography>
      <Grid container spacing={3}>
        {articles.map((article) => (
          <Grid item xs={12} md={6} key={article.pageid}>
            <Card elevation={3} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {/* Link to the Wikipedia page */}
                  <Link
                    href={`https://en.wikipedia.org/?curid=${article.pageid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    style={{ textDecoration: "none" }}
                  >
                    {article.title}
                  </Link>
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {stripHtmlTags(article.snippet)} {/* Display snippet as plain text */}
                </Typography>
                <Box mt={1}>
                  {article.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      color="primary"
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                {editingTags === article.pageid ? (
                  <>
                    <TextField
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="Comma-separated tags"
                      variant="outlined"
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                    <IconButton
                      color="primary"
                      onClick={() => handleSaveTags(article.pageid)}
                      disabled={loading.saveTags === article.pageid} // Disable while saving
                    >
                      {loading.saveTags === article.pageid ? (
                        <CircularProgress size={24} />
                      ) : (
                        <Save />
                      )}
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton
                      color="primary"
                      onClick={() => {
                        setEditingTags(article.pageid);
                        setNewTags(article.tags.join(", "));
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(article.pageid)}
                      disabled={loading.delete === article.pageid} // Disable while deleting
                    >
                      {loading.delete === article.pageid ? (
                        <CircularProgress size={24} />
                      ) : (
                        <Delete />
                      )}
                    </IconButton>
                  </>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default SavedArticles;
