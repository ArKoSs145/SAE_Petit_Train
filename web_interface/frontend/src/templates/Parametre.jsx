import React, { useState, useRef } from 'react'; // Ajout de useRef
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Divider, 
  Grid 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile'; // Nouveau icône plus adapté

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
  // Référence pour l'input de fichier caché
  const fileInputRef = useRef(null);
  
  // État pour savoir quelle machine on est en train de configurer
  const [selectedPoste, setSelectedPoste] = useState(null);

  const handleButtonClick = (id) => {
    setSelectedPoste({ id, name: POSTE_NAMES[id] });
    // On déclenche le clic sur l'input caché
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && selectedPoste) {
      console.log(`Fichier sélectionné pour ${selectedPoste.name} (ID: ${selectedPoste.id}) :`, file.name);
      
      // Ici, vous pouvez traiter le fichier (lecture FileReader, upload, etc.)
      
      // Reset de l'input pour permettre de sélectionner le même fichier deux fois de suite si besoin
      event.target.value = '';
    }
  };

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh', bgcolor: '#333', p: 2, boxSizing: 'border-box' }}>
      
      {/* INPUT CACHÉ */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        // accept=".json,.csv,.txt" // Optionnel : limiter les types de fichiers
      />

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
            Sélectionnez un poste pour importer sa configuration :
        </Typography>

        {/* Grille de boutons */}
        <Grid container spacing={3}>
          {Object.entries(POSTE_NAMES).map(([id, name]) => (
            <Grid item xs={12} sm={6} md={4} key={id}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<UploadFileIcon />}
                onClick={() => handleButtonClick(id)}
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

        <Box sx={{ mt: 'auto', pt: 2, color: 'gray', textAlign: 'center' }}>
            <Typography variant="body2">
                Cliquez sur un module pour charger un fichier de configuration spécifique.
            </Typography>
        </Box>
      </Paper>
    </Box>
  );
}