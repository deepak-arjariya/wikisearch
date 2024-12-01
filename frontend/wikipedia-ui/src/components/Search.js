import React, { useState, useEffect } from "react";
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
  Snackbar,
  Alert,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { useAuth0 } from "@auth0/auth0-react"; // Import the useAuth0 hook

const Search = () => {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0(); // Get authentication status and login function

  const [keyword, setKeyword] = useState(""); // Keyword for search
  const [results, setResults] = useState([]); // Search results
  const [loading, setLoading] = useState(false); // Loading state
  const [savedArticles, setSavedArticles] = useState(new Set()); // Track saved articles
  const [apiMessage, setApiMessage] = useState(""); // Track API message
  const [openSnackbar, setOpenSnackbar] = useState(false); // Snackbar visibility state

  // Use useEffect to fetch the search keyword from localStorage and initiate search after login
  useEffect(() => {
    if (isAuthenticated) {
      const storedKeyword = localStorage.getItem("searchKeyword");
      if (storedKeyword) {
        setKeyword(storedKeyword);
        handleSearch(storedKeyword); // Trigger search after login
      }
    }
  }, [isAuthenticated]);

  const handleSearch = async (searchKeyword) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/search/`, {
        params: { keyword: searchKeyword },
      });
      setResults(response.data);
    } catch (error) {
      console.error("Error searching Wikipedia:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (article) => {
    if (!isAuthenticated) {
      setApiMessage("Please log in to save articles.");
      setOpenSnackbar(true);
      return;
    }

    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/articles/`,
        {
          title: article.title,
          snippet: article.snippet,
          pageid: article.pageid,
          user_id: user?.sub, // Include the user ID (from Auth0's `sub` field)
        },
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`, // Include the Auth0 token
          },
        }
      );

      setApiMessage(response.data.message);
      setOpenSnackbar(true);
      setSavedArticles((prevSaved) => new Set(prevSaved).add(article.pageid)); // Update saved articles state
    } catch (error) {
      console.error("Error saving article:", error);
      setApiMessage("Error saving article");
      setOpenSnackbar(true);
    }
  };

  // Handle keyword change and trigger search
  const handleKeywordChange = (e) => {
    const newKeyword = e.target.value;
    setKeyword(newKeyword);
    localStorage.setItem("searchKeyword", newKeyword); // Save the keyword to localStorage
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
            onChange={handleKeywordChange}
            variant="outlined"
            placeholder="Type a keyword (e.g., AI, History)"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleSearch(keyword)} // Trigger search on button click
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
                  {isAuthenticated ? (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleSave(result)}
                      startIcon={<Save />}
                      disabled={savedArticles.has(result.pageid)} // Disable if already saved
                    >
                      {savedArticles.has(result.pageid) ? "Saved" : "Save Article"}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => loginWithRedirect()} // Redirect to login page on click
                    >
                      Log in to Save
                    </Button>
                  )}
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

export default Search;
