/**
 * Page de configuration des postes et magasins.
 * Cette interface permet à l'administrateur de sélectionner un stand (poste ou magasin)
 * et d'importer un fichier CSV pour définir son nom et sa disposition physique (grille).
 */
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Divider, 
  Grid,
  CircularProgress
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function Parametre({ onRetourAdmin }) {
  const fileInputRef = useRef(null);
  
  // États pour gérer les noms des postes, l'affichage du chargement et le poste sélectionné
  const [posteNames, setPosteNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPoste, setSelectedPoste] = useState(null);

  // Récupère la liste des stands (ID et noms) depuis le serveur.
  const fetchStands = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/stands');
      if (res.ok) {
        const data = await res.json();
        setPosteNames(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des postes :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStands();
  }, []);

  // Enregistre le poste cible et déclenche l'ouverture de l'explorateur de fichiers.
  const handleButtonClick = (id, name) => {
    setSelectedPoste({ id, name });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Gère la lecture du fichier CSV et son envoi au backend.
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    // On vérifie qu'on a bien un fichier et un poste sélectionné
    if (file && selectedPoste) {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const csvContent = e.target.result;
        
        try {
          const response = await fetch('http://localhost:8000/api/admin/upload-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              posteId: parseInt(selectedPoste.id, 10),
              csv_content: csvContent 
            }),
          });

          const result = await response.json();

          if (response.ok) {
            alert(`Importation Réussie : ${result.message}`);
            fetchStands();
          } else {
            alert(`Échec de l'importation : ${result.detail || result.message}`);
          }
        } catch (err) {
          console.error("Erreur upload :", err);
          alert("Erreur critique : Impossible de joindre le serveur.");
        }
      };

      reader.readAsText(file);
      event.target.value = ''; 
    }
  };

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh', bgcolor: '#333', p: 2, boxSizing: 'border-box' }}>
      
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".csv"
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
        {/* Entête avec bouton de retour et titre */}
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
        </Box>

        <Divider />

        <Typography variant="h6" sx={{ color: '#1976d2' }}>
            Sélectionnez un poste pour importer sa configuration :
        </Typography>

        {/* Grille de boutons dynamique */}
        {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        ) : (
            <Grid container spacing={3}>
            {Object.entries(posteNames).map(([id, name]) => (
                <Grid item xs={12} sm={6} md={4} key={id}>
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<UploadFileIcon />}
                    onClick={() => handleButtonClick(id, name)}
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
        )}

        <Box sx={{ mt: 'auto', pt: 2, color: 'gray', textAlign: 'center' }}>
            <Typography variant="body2">
                Cliquez sur un module pour charger un fichier de configuration spécifique.
            </Typography>
        </Box>
      </Paper>
    </Box>
  );
}