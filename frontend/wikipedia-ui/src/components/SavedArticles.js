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
  Snackbar,
  Alert,
} from "@mui/material";
import { Delete, Edit, Save } from "@mui/icons-material";
import { useAuth0 } from "@auth0/auth0-react";

const SavedArticles = () => {
  const { loginWithRedirect, logout, user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [articles, setArticles] = useState([]);
  const [editingTags, setEditingTags] = useState(null);
  const [newTags, setNewTags] = useState("");
  const [loading, setLoading] = useState({ delete: null, saveTags: null, fetch: false });
  const [apiMessage, setApiMessage] = useState(""); 
  const [openSnackbar, setOpenSnackbar] = useState(false); 

  
  const fetchSavedArticles = async () => {
    setLoading((prev) => ({ ...prev, fetch: true }));
    if (!isAuthenticated) {
      setApiMessage("Please log in to view saved articles.");
      setOpenSnackbar(true);
      setLoading((prev) => ({ ...prev, fetch: false }));
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/articles/${user?.sub}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setArticles(response.data);
    } catch (error) {
      console.error("Error fetching saved articles:", error);
      setApiMessage("Error fetching saved articles");
      setOpenSnackbar(true);
    } finally {
      setLoading((prev) => ({ ...prev, fetch: false }));
    }
  };

  const handleDelete = async (id) => {
    setLoading((prev) => ({ ...prev, delete: id }));
    try {
      const token = await getAccessTokenSilently();
      console.log("++++++++++++++++++++++++++++++++++++++++++")
      console.log(`${user?.sub}`)
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/articles/${user?.sub}/${id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setApiMessage("Article deleted successfully");
      setOpenSnackbar(true);
      fetchSavedArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
      setApiMessage("Error deleting article");
      setOpenSnackbar(true);
    } finally {
      setLoading((prev) => ({ ...prev, delete: null }));
    }
  };

  const handleSaveTags = async (id) => {
    setLoading((prev) => ({ ...prev, saveTags: id }));
    try {
      const token = await getAccessTokenSilently();
      const updatedTags = newTags.split(",").map((tag) => tag.trim());
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/articles/${id}/`,
        { tags: updatedTags, user_id: user?.sub },  
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setApiMessage("Tags updated successfully");
      setOpenSnackbar(true);
      fetchSavedArticles();
      setNewTags(""); 
      setEditingTags(null); 
    } catch (error) {
      console.error("Error updating tags:", error);
      setApiMessage("Error updating tags");
      setOpenSnackbar(true);
    } finally {
      setLoading((prev) => ({ ...prev, saveTags: null }));
    }
  };

  const stripHtmlTags = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSavedArticles();
    }
  }, [isAuthenticated]);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Saved Articles
      </Typography>
      {!isAuthenticated ? (
        <Box textAlign="center">
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Please log in to view saved articles.
          </Typography>
          <IconButton color="primary" onClick={() => loginWithRedirect()}>
            Log in with Auth0
          </IconButton>
        </Box>
      ) : (
        <>
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
                          disabled={loading.saveTags === article.pageid} 
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
                          disabled={loading.delete === article.pageid} 
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
        </>
      )}

      {/* Snackbar for displaying the API message */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={apiMessage.includes("Error") ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {apiMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SavedArticles;
