import React, { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  IconButton
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// Données simulées pour l'affichage (basées sur l'image)
const TIME_SLOTS = ['Total', '10h25', '10h35', '10h45', '10h55', '11h05', '11h15', '11h25'];

export default function Admin() {
  const [selectedTime, setSelectedTime] = useState('Total');

  // Fonction pour quitter (retour accueil ou fermeture)
  const handleQuit = () => {
    window.location.href = "/"; // Ou window.close() selon le besoin
  };

  // Styles communs pour les boutons gris du header
  const headerBtnStyle = {
    backgroundColor: '#d9d9d9',
    color: 'black',
    textTransform: 'none',
    boxShadow: 'none',
    borderRadius: 0,
    fontSize: '1.1rem',
    px: 3,
    '&:hover': { backgroundColor: '#c0c0c0' }
  };

  // Styles pour les cartes de la grille
  const cardStyle = (bgColor) => ({
    backgroundColor: bgColor,
    height: '100%',
    p: 3,
    borderRadius: 2,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'none',
    color: 'black' // Texte noir
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'white', overflow: 'hidden' }}>
      
      {/* --- 1. HEADER --- */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2,
        pt: 3 
      }}>
        {/* Gauche */}
        <Button variant="contained" sx={headerBtnStyle}>
          Télécharger
        </Button>

        {/* Centre */}
        <Typography variant="h3" sx={{ fontWeight: 400, color: 'black' }}>
          Historique
        </Typography>

        {/* Droite */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" sx={headerBtnStyle}>Échange</Button>
          <Button variant="contained" sx={headerBtnStyle}>Log</Button>
          <Button 
            variant="contained" 
            onClick={handleQuit}
            sx={{ 
              backgroundColor: '#cc0000', // Rouge vif
              color: 'white',
              minWidth: '50px',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              borderRadius: 0,
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#a00000' }
            }}
          >
            X
          </Button>
        </Box>
      </Box>

      {/* --- 2. CONTENU PRINCIPAL (Sidebar + Grid) --- */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', mt: 1 }}>
        
        {/* A. SIDEBAR (Liste des heures) */}
        <Box sx={{ 
          width: '250px', 
          bgcolor: '#d9d9d9', // Gris fond sidebar
          borderRight: '1px solid #ccc',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <List component="nav" sx={{ p: 0 }}>
            {TIME_SLOTS.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <ListItemButton
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  sx={{
                    borderBottom: '1px solid #999',
                    bgcolor: '#d9d9d9',
                    py: 2,
                    '&:hover': { bgcolor: '#c0c0c0' }
                  }}
                >
                  <ListItemText 
                    primary={time} 
                    primaryTypographyProps={{ fontSize: '1.2rem', textAlign: 'center' }} 
                  />
                  {/* Icône flèche (différente pour Total selon l'image) */}
                  {time === 'Total' ? <ArrowDropDownIcon /> : <NavigateNextIcon />}
                </ListItemButton>
              );
            })}
          </List>
          {/* Espace vide en bas de la sidebar pour remplir la hauteur */}
          <Box sx={{ flexGrow: 1, bgcolor: '#d9d9d9', borderRight: '1px solid #ccc' }} />
        </Box>

        {/* B. GRILLE (Postes) */}
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            
            {/* POSTE 1 (Bleu) */}
            <Grid item xs={6} sx={{ height: '50%' }}>
              <Paper sx={cardStyle('#9fc3f1')}> {/* Bleu clair */}
                <Typography variant="h5" gutterBottom>Poste 1</Typography>
                <Box sx={{ mt: 2, fontSize: '1.3rem', lineHeight: 1.6 }}>
                  <div>Vis ABCD : 12/14</div>
                  <div>Ecrou EFGH : 9/9</div>
                </Box>
              </Paper>
            </Grid>

            {/* POSTE 2 (Vert) */}
            <Grid item xs={6} sx={{ height: '50%' }}>
              <Paper sx={cardStyle('#b6fcce')}> {/* Vert clair */}
                <Typography variant="h5" gutterBottom>Poste 2</Typography>
                <Box sx={{ mt: 2, fontSize: '1.3rem', lineHeight: 1.6 }}>
                  <div>Verre IJKLM : 4/4</div>
                </Box>
              </Paper>
            </Grid>

            {/* POSTE 3 (Rouge) */}
            <Grid item xs={6} sx={{ height: '50%' }}>
              <Paper sx={cardStyle('#ff8a80')}> {/* Rouge clair */}
                <Typography variant="h5" gutterBottom>Poste 3</Typography>
                <Box sx={{ mt: 2, fontSize: '1.3rem', lineHeight: 1.6 }}>
                  <div>Vis ABCD : 11/12</div>
                  <div>Led NOPQ : 2/3</div>
                </Box>
              </Paper>
            </Grid>

            {/* MAGASIN (Gris) */}
            <Grid item xs={6} sx={{ height: '50%' }}>
              <Paper sx={{ ...cardStyle('#d9d9d9'), position: 'relative' }}> {/* Gris */}
                <Typography variant="h5" gutterBottom>Magasin / Fournisseur</Typography>
                <Box sx={{ mt: 2, fontSize: '1.3rem', lineHeight: 1.6 }}>
                  <div>Vis ABCD x 26</div>
                  <div>Ecrou EFGH x 9</div>
                  <div>Verre IJKLM x 4</div>
                  <div>Led NOPQ x 3</div>
                </Box>
                {/* Petit curseur souris simulé comme sur l'image (optionnel) */}
                {/* <NavigationIcon sx={{ position: 'absolute', bottom: 20, left: '50%', transform: 'rotate(-45deg)', fontSize: 30 }} /> */}
              </Paper>
            </Grid>

          </Grid>
        </Box>
      </Box>
    </Box>
  );
}