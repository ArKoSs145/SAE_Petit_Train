import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import LoginPopup from './popup/LoginPopup';

export default function Accueil({ onContinue, onCustomStart, onAdminLogin }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Fonction pour fermer l'application
  const handleQuit = () => {
    if (window.confirm("Voulez-vous vraiment fermer l'application ?")) {
        window.open("about:blank", "_self");
        window.close();
    }
  };

  // Style des cartes cliquables
  const cardStyle = {
    p: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    borderRadius: '12px',
    border: '1px solid #DFE1E6',
    bgcolor: 'white',
    height: '240px',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 16px rgba(0, 82, 204, 0.1)',
      borderColor: '#0052CC',
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#F4F5F7', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      p: 3,
      fontFamily: "'Inter', sans-serif",
      position: 'relative'
    }}>
      
      {/* --- Bouton QUITTER --- */}
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <Tooltip title="Fermer l'application">
            <IconButton onClick={handleQuit} color="error" size="large">
                <PowerSettingsNewIcon fontSize="large" />
            </IconButton>
        </Tooltip>
      </Box>

      {/* En-tête */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h2" sx={{ fontWeight: 800, color: '#172B4D', mb: 1, letterSpacing: '-1px' }}>
          SAÉ Petit Train
        </Typography>
        <Typography variant="h6" sx={{ color: '#5E6C84', fontWeight: 400 }}>
          Digitalisation du flux Kanban & Pilotage logistique
        </Typography>
      </Box>

      {/* Grille d'actions */}
      <Grid container spacing={4} sx={{ maxWidth: '850px' }}>
        
        {/* OPTION 1 : CONTINUER */}
        <Grid item xs={12} sm={6}>
          <Paper elevation={0} sx={cardStyle} onClick={onContinue}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#172B4D' }}>
              Continuer
            </Typography>
            <Typography variant="body1" sx={{ color: '#5E6C84', mb: 4 }}>
              Reprendre le cycle là où il s'est arrêté
            </Typography>
            <Button variant="contained" sx={{ bgcolor: '#0052CC', textTransform: 'none', fontWeight: 700, px: 4 }}>
              Reprendre
            </Button>
          </Paper>
        </Grid>

        {/* OPTION 2 : CONFIGURATION PERSONNALISÉE */}
        <Grid item xs={12} sm={6}>
          <Paper elevation={0} sx={cardStyle} onClick={onCustomStart}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#172B4D' }}>
              Démarrer
            </Typography>
            <Typography variant="body1" sx={{ color: '#5E6C84', mb: 4 }}>
              Nouvelle configuration de départ
            </Typography>
            <Button variant="contained" sx={{ bgcolor: '#36B37E', textTransform: 'none', fontWeight: 700, px: 4 }}>
              Nouveau cycle
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Accès Admin */}
      <Button 
        variant="text" 
        onClick={() => setIsLoginOpen(true)}
        sx={{ mt: 8, color: '#42526E', textTransform: 'none', fontWeight: 600, fontSize: '1rem' }}
      >
        Espace Administration
      </Button>
      
      {/* LoginPopup */}
      <LoginPopup 
        open={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onLoginSuccess={onAdminLogin} 
      />
    </Box>
  );
}