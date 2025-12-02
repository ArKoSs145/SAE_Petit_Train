import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  IconButton,
  Box,
  Link,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Ajout de la prop 'onLoginSuccess'
export default function LoginPopup({ open, onClose, onLoginSuccess }) {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Assurez-vous que l'URL pointe bien vers votre serveur Python (port 8000)
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username, 
          password: formData.password
        }),
      });

      if (response.ok) {
        console.log("Login success");
        // --- MODIFICATION ICI ---
        // Au lieu de recharger la page, on appelle la fonction parent pour changer le composant
        if (onLoginSuccess) {
            onLoginSuccess();
        }
        onClose(); 
      } else {
        setError("Mot de passe ou nom d'utilisateur incorrect");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur de connexion au serveur (Vérifiez le port 8000)");
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    console.log("Action pour mot de passe oublié...");
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: '#CCCCCC',
          borderRadius: '15px',
          width: '450px',
          overflow: 'hidden',
        }
      }}
    >
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 10,
          top: 10,
          color: 'white',
          backgroundColor: 'red',
          width: 32,
          height: 32,
          zIndex: 10,
          '&:hover': {
            backgroundColor: 'darkred',
          },
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ overflow: 'hidden', padding: '30px' }}> 
        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 3,
            mt: 4
          }}
        >
          
          <TextField
            label="Login *"
            type="text" 
            name="username"
            value={formData.username}
            onChange={handleChange}
            variant="filled"
            size="small"
            required
            sx={{ backgroundColor: '#f0f0f0', borderRadius: 1 }}
            InputProps={{ disableUnderline: true }}
          />
          
          <TextField
            label="MDP *"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            variant="filled"
            size="small"
            required
            sx={{ backgroundColor: '#f0f0f0', borderRadius: 1 }}
            InputProps={{ disableUnderline: true }}
          />

          <Box sx={{ textAlign: 'right', mt: -1 }}>
            <Link
              component="button"
              variant="body2"
              onClick={handleForgotPassword}
              sx={{ 
                color: '#555', 
                textDecoration: 'none', 
                fontSize: '0.9rem',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              Mot de passe oublié ?
            </Link>
          </Box>
          
          {error && (
            <Typography 
              color="error" 
              variant="body2" 
              align="center" 
              sx={{ fontWeight: 'bold', mt: 1 }}
            >
              {error}
            </Typography>
          )}
          
          <Box sx={{ textAlign: 'center', mt: 2, mb: 1 }}>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#E0E0E0',
                color: 'black',
                fontWeight: 'bold',
                border: '1px solid #999',
                padding: '10px 40px',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#D0D0D0',
                  boxShadow: 'none',
                },
              }}
            >
              VALIDER
            </Button>
          </Box>
          
        </Box>
      </DialogContent>
    </Dialog>
  );
}