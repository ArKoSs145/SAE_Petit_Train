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
  Grid,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Parametre({ onRetourAdmin }) {
  const fileInputRef = useRef(null);
  
  const [posteNames, setPosteNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPoste, setSelectedPoste] = useState(null);

  const fetchStands = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/stands`);
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

  const handleButtonClick = (id, name) => {
    setSelectedPoste({ id, name });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && selectedPoste) {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const csvContent = e.target.result;
        
        try {
          const response = await fetch(`${apiUrl}/api/admin/upload-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              posteId: parseInt(selectedPoste.id, 10),
              csv_content: csvContent 
            }),
          });

          const result = await response.json();

          if (response.ok) {
            alert(`✅ Importation Réussie : ${result.message}`);
            fetchStands();
          } else {
            alert(`⚠️ Échec de l'importation : ${result.detail || result.message}`);
          }
        } catch (err) {
          console.error("Erreur upload :", err);
          alert("❌ Erreur critique : Impossible de joindre le serveur.");
        }
      };

      reader.readAsText(file);
      event.target.value = ''; 
    }
  };

  // Style des cartes (similaire à Accueil.jsx)
  const cardStyle = {
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    borderRadius: '12px',
    border: '1px solid #DFE1E6',
    bgcolor: 'white',
    height: '100%',
    minHeight: '160px',
    transition: 'all 0.2s ease-in-out',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 16px rgba(0, 82, 204, 0.15)',
      borderColor: '#0052CC',
    }
  };

  return (
    <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        width: '100vw', 
        height: '100vh', 
        bgcolor: '#F4F5F7', // Fond unifié
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden'
    }}>
      
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".csv"
      />

      {/* Header Standardisé */}
      <Paper elevation={0} sx={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          p: 2, bgcolor: 'white', borderBottom: '1px solid #DFE1E6', borderRadius: 0 
      }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
                startIcon={<ArrowBackIcon />} 
                onClick={onRetourAdmin}
                sx={{ 
                    color: '#42526E', 
                    fontWeight: 700, 
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#EBECF0' }
                }}
            >
                Retour
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#172B4D' }}>
                Configuration des Postes
            </Typography>
          </Box>
      </Paper>

      {/* Contenu Principal */}
      <Box sx={{ p: 4, flexGrow: 1, overflowY: 'auto' }}>
        
        <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: '#5E6C84', mb: 1 }}>
                Mise à jour des configurations (Fichiers CSV)
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B778C' }}>
                Cliquez sur un module pour importer sa nouvelle disposition.
            </Typography>
        </Box>

        {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
                <CircularProgress sx={{ color: '#0052CC' }} />
            </Box>
        ) : (
            <Grid container spacing={3}>
            {Object.entries(posteNames).map(([id, name]) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={id}>
                    <Paper 
                        elevation={0} 
                        sx={cardStyle}
                        onClick={() => handleButtonClick(id, name)}
                    >
                        <SettingsInputComponentIcon sx={{ fontSize: 40, color: '#0052CC', mb: 2, opacity: 0.8 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#172B4D', mb: 1 }}>
                            {name}
                        </Typography>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<UploadFileIcon />}
                            sx={{ 
                                mt: 2, 
                                textTransform: 'none', 
                                borderColor: '#DFE1E6', 
                                color: '#42526E',
                                pointerEvents: 'none' // Le clic est géré par la carte parente
                            }}
                        >
                            Importer CSV
                        </Button>
                    </Paper>
                </Grid>
            ))}
            </Grid>
        )}
      </Box>
    </Box>
  );
}