import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Search from "./components/Search";
import SavedArticles from "./components/SavedArticles";
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  CssBaseline,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#ff4081",
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
  },
});

const App = () => {
  const { loginWithRedirect, logout, isAuthenticated, isLoading, user } = useAuth0();

  // We no longer need the isRedirecting state to handle automatic login redirection
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // If the user is authenticated, we stop the redirect
    if (!isLoading && isAuthenticated) {
      setIsRedirecting(false);
    }
  }, [isAuthenticated, isLoading]);

  // Show loading spinner while the authentication status is being determined
  if (isLoading || isRedirecting) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box
          sx={{
            backgroundColor: "#f5f5f5",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AppBar position="sticky" sx={{ backgroundColor: "primary.main" }}>
            <Toolbar>
              <Typography
                variant="h6"
                sx={{ flexGrow: 1, fontWeight: "bold", letterSpacing: 1 }}
              >
                Discover and Save Wikipedia Gems
              </Typography>

              {/* Display 'Hi [user's name]' if authenticated */}
              {isAuthenticated && user && (
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: "bold",
                    color: "white",
                    mr: 2,
                    display: "inline-block",
                  }}
                >
                  Hi, {user.name}
                </Typography>
              )}

              <Button
                color="inherit"
                component={Link}
                to="/search"
                sx={{
                  fontWeight: "bold",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                }}
              >
                Search
              </Button>
              {/* Show 'Saved Articles' only if user is authenticated */}
              {isAuthenticated && (
                <Button
                  color="inherit"
                  component={Link}
                  to="/saved"
                  sx={{
                    fontWeight: "bold",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                  }}
                >
                  Saved Articles
                </Button>
              )}
              {isAuthenticated ? (
                <Button
                  color="inherit"
                  onClick={() => logout({ returnTo: window.location.origin })}
                  sx={{
                    fontWeight: "bold",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                  }}
                >
                  Log Out
                </Button>
              ) : (
                <Button
                  color="inherit"
                  onClick={() => loginWithRedirect()} // Trigger login redirect only on button click
                  sx={{
                    fontWeight: "bold",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                  }}
                >
                  Log In
                </Button>
              )}
            </Toolbar>
          </AppBar>

          <Container sx={{ mt: 4, flexGrow: 1 }}>
            {/* Routes for authenticated users */}
            <Routes>
              <Route path="/" element={<Navigate to="/search" />} />
              <Route path="/search" element={<Search />} />
              {/* Show SavedArticles page only if authenticated */}
              <Route
                path="/saved"
                element={
                  isAuthenticated ? <SavedArticles /> : <Navigate to="/search" />
                }
              />
            </Routes>
          </Container>

          <Box
            component="footer"
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              py: 2,
              textAlign: "center",
              mt: "auto",
            }}
          >
            <Typography variant="body2">
              © {new Date().getFullYear()} Wikipedia Gems. All Rights Reserved.
            </Typography>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
