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
  // États pour stocker les données du formulaire et les messages d'erreur
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  // Met à jour l'état du formulaire à chaque saisie de l'utilisateur.
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  /**
   * Gère la soumission du formulaire de connexion.
   * Envoie une requête POST au serveur Python pour vérifier les identifiants.
   */
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
          {/* Champ de saisie pour le nom d'utilisateur */}
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

          {/* Champ de saisie pour le mot de passe */}
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
          
          {/* Affichage des erreurs de connexion */}
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
          
          {/* Bouton de validation */}
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