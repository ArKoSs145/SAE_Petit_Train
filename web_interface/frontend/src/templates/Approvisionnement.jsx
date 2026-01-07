import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Divider 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// onRetourAdmin : fonction passée depuis main.jsx pour revenir en arrière
export default function Approvisionnement({ onRetourAdmin }) {

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
                variant="outlined" 
                startIcon={<ArrowBackIcon />} 
                onClick={onRetourAdmin}
                sx={{ color: 'black', borderColor: '#ccc' }}
            >
                Retour
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                Approvisionnement
            </Typography>
        </Box>

        <Divider />

        {/* Contenu vide pour l'instant */}
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'gray' }}>
            <Typography variant="h6" fontStyle="italic">
                Interface d'approvisionnement (En construction)
            </Typography>
        </Box>

      </Paper>
    </Box>
  );
}