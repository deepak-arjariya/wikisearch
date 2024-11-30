import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import Search from "./components/Search";
import SavedArticles from "./components/SavedArticles";
import { Container, AppBar, Toolbar, Typography, Button } from "@mui/material";

const App = () => {
  return (
    <Router>
      <Container>
        <AppBar position="static" style={{ marginBottom: "20px" }}>
          <Toolbar>
            <Typography variant="h6" style={{ flexGrow: 1 }}>
              Discover and Save Wikipedia Gems
            </Typography>
            <Button color="inherit" component={Link} to="/search">
              Search
            </Button>
            <Button color="inherit" component={Link} to="/saved">
              Saved Articles
            </Button>
          </Toolbar>
        </AppBar>

        <Routes>
          <Route path="/search" element={<Search />} />
          <Route path="/saved" element={<SavedArticles />} />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;
