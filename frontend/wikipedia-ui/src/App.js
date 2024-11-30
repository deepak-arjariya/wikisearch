import React from "react";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
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
              <Button
                color="inherit"
                component={Link}
                to="/"
                sx={{
                  fontWeight: "bold",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                }}
              >
                Home
              </Button>
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
            </Toolbar>
          </AppBar>

          <Container sx={{ mt: 4, flexGrow: 1 }}>
            <Routes>
              {/* Redirect to /search when the user accesses the home path */}
              <Route path="/" element={<Navigate to="/search" />} />
              <Route path="/search" element={<Search />} />
              <Route path="/saved" element={<SavedArticles />} />
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
