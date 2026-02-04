/**
 * Gère l'authentification des utilisateurs en communiquant avec le backend
 * et déclenche la redirection vers la page Admin.
 */

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

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username, 
          password: formData.password,
        }),
      });

      if (response.ok) {
        if (onLoginSuccess) onLoginSuccess();
        onClose(); 
      } else {
        setError("Identifiants incorrects");
      }
    } catch (err) {
      setError("Erreur de connexion");
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
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }
      }}
    >
      {/* Bouton Fermer discret et élégant */}
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          color: '#97A0AF',
          zIndex: 10,
          '&:hover': {
            backgroundColor: '#F4F5F7',
            color: '#172B4D',
          },
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ padding: '40px' }}> 
        {/* En-tête de la popup */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#172B4D', mb: 1 }}>
            Connexion Administration
          </Typography>
          <Typography variant="body2" sx={{ color: '#5E6C84' }}>
            Veuillez vous identifier pour accéder au panneau de contrôle.
          </Typography>
        </Box>

        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2.5
          }}
        >
          {/* Login - Style épuré */}
          <TextField
            label="Utilisateur *"
            type="text" 
            name="username"
            value={formData.username}
            onChange={handleChange}
            variant="outlined"
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: '#FAFBFC',
                '&:hover fieldset': { borderColor: '#4C9AFF' },
                '&.Mui-focused fieldset': { borderColor: '#0052CC' },
              }
            }}
          />

          {/* Mot de passe - Style épuré */}
          <TextField
            label="Mot de passe *"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            variant="outlined"
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: '#FAFBFC',
                '&:hover fieldset': { borderColor: '#4C9AFF' },
                '&.Mui-focused fieldset': { borderColor: '#0052CC' },
              }
            }}
          />

          <Box sx={{ textAlign: 'right', mt: -1 }}>
            <Link
              component="button"
              variant="caption"
              onClick={handleForgotPassword}
              sx={{ 
                color: '#0052CC', 
                textDecoration: 'none', 
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              Mot de passe oublié ?
            </Link>
          </Box>
          
          {/* Message d'erreur stylisé en badge */}
          {error && (
            <Typography 
              color="error" 
              variant="caption" 
              align="center" 
              sx={{ 
                fontWeight: 700, 
                p: 1.2, 
                backgroundColor: '#FFEBE6', 
                borderRadius: '6px',
                border: '1px solid #FFBDAD'
              }}
            >
              {error}
            </Typography>
          )}
          
          {/* Bouton de validation bleu professionnel */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              backgroundColor: '#0052CC',
              color: 'white',
              fontWeight: 700,
              padding: '12px',
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: 'none',
              mt: 1,
              '&:hover': {
                backgroundColor: '#0747A6',
                boxShadow: 'none',
              },
            }}
          >
            VALIDER
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}