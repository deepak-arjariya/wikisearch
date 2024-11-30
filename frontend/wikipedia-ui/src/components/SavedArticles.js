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
  Button,
  Grid,
  Box,
} from "@mui/material";
import { Delete, Edit, Save } from "@mui/icons-material";

const SavedArticles = () => {
  const [articles, setArticles] = useState([]);
  const [editingTags, setEditingTags] = useState(null);
  const [newTags, setNewTags] = useState("");

  const fetchSavedArticles = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/articles/`);
      setArticles(response.data);
    } catch (error) {
      console.error("Error fetching saved articles:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/articles/${id}/`);
      alert("Article deleted!");
      fetchSavedArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
    }
  };

  const handleSaveTags = async (id) => {
    try {
      const updatedTags = newTags.split(",").map((tag) => tag.trim());
      await axios.put(`http://127.0.0.1:8000/articles/${id}/`, {
        tags: updatedTags,
      });
      alert("Tags updated successfully!");
      setEditingTags(null);
      fetchSavedArticles();
    } catch (error) {
      console.error("Error updating tags:", error);
    }
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
          <Grid item xs={12} md={6} key={article.id}>
            <Card elevation={3} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {article.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {article.snippet}
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
                {editingTags === article.id ? (
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
                      onClick={() => handleSaveTags(article.id)}
                    >
                      <Save />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton
                      color="primary"
                      onClick={() => {
                        setEditingTags(article.id);
                        setNewTags(article.tags.join(", "));
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(article.id)}
                    >
                      <Delete />
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
