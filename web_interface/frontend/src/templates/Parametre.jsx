import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Divider, 
  Grid, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';

// On reprend la liste des postes définie dans Base.jsx
const POSTE_NAMES = {
  '1': 'Arrêt Poste 1',
  '2': 'Arrêt Poste 2',
  '3': 'Arrêt Poste 3',
  '4': 'Presse à Injecter',
  '5': 'Presse à Emboutir',
  '6': 'Tour CN',
  '7': 'Magasin Externe',
};

export default function Parametre({ onRetourAdmin }) {
  const [selectedPoste, setSelectedPoste] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleOpenPopup = (id) => {
    setSelectedPoste({ id, name: POSTE_NAMES[id] });
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedPoste(null);
  };

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh', bgcolor: '#333', p: 2, boxSizing: 'border-box' }}>
      <Paper sx={{ 
          flexGrow: 1, 
          bgcolor: 'white', 
          p: 4, 
          borderRadius: 2, 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3
      }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
                variant="outlined" 
                startIcon={<ArrowBackIcon />} 
                onClick={onRetourAdmin}
                sx={{ color: 'black', borderColor: '#ccc' }}
            >
                Retour
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Configuration des Postes</Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />}
            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
          >
            Enregistrer Global
          </Button>
        </Box>

        <Divider />

        <Typography variant="h6" sx={{ color: '#1976d2', mb: 1 }}>
            Sélectionnez un poste ou une machine à configurer :
        </Typography>

        {/* Grille de boutons pour chaque poste */}
        <Grid container spacing={3}>
          {Object.entries(POSTE_NAMES).map(([id, name]) => (
            <Grid item xs={12} sm={6} md={4} key={id}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SettingsIcon />}
                onClick={() => handleOpenPopup(id)}
                sx={{
                  py: 3,
                  fontSize: '1.1rem',
                  backgroundColor: '#f5f5f5',
                  color: 'black',
                  border: '2px solid #1976d2',
                  boxShadow: 2,
                  '&:hover': {
                    backgroundColor: '#e3f2fd',
                    boxShadow: 4,
                  }
                }}
              >
                {name}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Section Info bas de page */}
        <Box sx={{ mt: 'auto', pt: 2, color: 'gray', textAlign: 'center' }}>
            <Typography variant="body2">Cliquez sur un module pour modifier ses paramètres spécifiques (IP, Lecteur, Délais).</Typography>
        </Box>
      </Paper>

      {/* Popup de modification (à personnaliser après) */}
      <Dialog 
        open={isPopupOpen} 
        onClose={handleClosePopup}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white', fontWeight: 'bold' }}>
          Configuration : {selectedPoste?.name} (ID: {selectedPoste?.id})
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1">
            C'est ici que vous pourrez ajouter les champs spécifiques pour le **{selectedPoste?.name}**.
          </Typography>
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f0f0', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
                Note : Vous pouvez modifier ici les adresses de destination, les capteurs associés ou les temps de cycle de cette machine.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClosePopup} variant="outlined" color="error">
            Annuler
          </Button>
          <Button onClick={handleClosePopup} variant="contained" color="success">
            Valider les modifications
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}