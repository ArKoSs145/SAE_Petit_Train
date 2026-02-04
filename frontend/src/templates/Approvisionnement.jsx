/**
 * Interface de gestion des stocks et délais.
 * Permet à l'administrateur de visualiser toutes les boîtes de pièces
 * enregistrées et de modifier le délai de réapprovisionnement automatique 
 */
import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Divider, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TextField, CircularProgress, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import TimerIcon from '@mui/icons-material/Timer';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Approvisionnement({ onRetourAdmin }) {
  const [boites, setBoites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchBoites();
  }, []);

  const fetchBoites = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/boites-delais`);
      if (res.ok) {
        const data = await res.json();
        const initializedData = data.map(b => ({ ...b, nouveauDelai: b.delai_actuel }));
        setBoites(initializedData);
      }
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (idBoite, value) => {
    setBoites(prev => prev.map(b => 
      b.idBoite === idBoite ? { ...b, nouveauDelai: value === '' ? '' : parseInt(value, 10) } : b
    ));
  };

  const handleSaveGlobal = async () => {
    setSaving(true);
    setMessage(null);
    
    const updates = boites.map(b => ({
      idBoite: b.idBoite,
      delai: b.nouveauDelai
    }));

    try {
      const res = await fetch(`${apiUrl}/api/admin/update-delais-appro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Délais de réapprovisionnement mis à jour !' });
        fetchBoites(); 
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Serveur injoignable.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      width: '100vw', 
      height: '100vh', 
      bgcolor: '#F4F5F7',
      fontFamily: "'Inter', sans-serif",
      overflow: 'hidden'
    }}>
      
      {/* Header unifié avec Admin.jsx */}
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
                  Configuration des Délais
              </Typography>
          </Box>

          <Button 
              variant="contained" 
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveGlobal}
              disabled={loading || saving}
              sx={{ 
                  bgcolor: '#0052CC', // Bleu "Pro"
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#0747A6', boxShadow: 'none' }
              }}
          >
              Enregistrer les paramètres
          </Button>
      </Paper>

      {/* Contenu principal */}
      <Box sx={{ p: 4, flexGrow: 1, overflowY: 'auto' }}>
        
        {message && (
            <Alert 
                severity={message.type} 
                onClose={() => setMessage(null)} 
                sx={{ mb: 3, borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            >
                {message.text}
            </Alert>
        )}

        <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #DFE1E6', overflow: 'hidden' }}>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
                    <CircularProgress sx={{ color: '#0052CC' }}/>
                </Box>
            ) : (
                <TableContainer>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#5E6C84', bgcolor: '#FAFBFC' }}>OBJET / PIÈCE</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#5E6C84', bgcolor: '#FAFBFC' }}>CODE BARRE</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#5E6C84', bgcolor: '#FAFBFC' }} align="center">DÉLAI ACTUEL (SEC)</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#5E6C84', bgcolor: '#FAFBFC' }} align="center">NOUVEAU DÉLAI</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {boites.map((boite) => (
                                <TableRow key={boite.idBoite} hover>
                                    <TableCell sx={{ fontWeight: 600, color: '#172B4D' }}>{boite.nom_piece}</TableCell>
                                    <TableCell sx={{ fontFamily: "'Fira Code', monospace", color: '#5E6C84', fontSize: '0.85rem' }}>
                                        {boite.code_barre}
                                    </TableCell>
                                    
                                    <TableCell align="center">
                                        <Box sx={{ 
                                            display: 'inline-flex', alignItems: 'center', gap: 1, 
                                            bgcolor: '#EBECF0', px: 1.5, py: 0.5, borderRadius: '16px' 
                                        }}>
                                            <TimerIcon sx={{ fontSize: 16, color: '#42526E' }} />
                                            <Typography sx={{ fontWeight: 700, color: '#172B4D', fontSize: '0.9rem' }}>
                                                {boite.delai_actuel}s
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    
                                    <TableCell align="center">
                                        <TextField
                                            type="number"
                                            size="small"
                                            value={boite.nouveauDelai}
                                            onChange={(e) => handleInputChange(boite.idBoite, e.target.value)}
                                            sx={{ 
                                                width: 100,
                                                '& .MuiOutlinedInput-root': { 
                                                    borderRadius: '8px',
                                                    '&.Mui-focused fieldset': { borderColor: '#0052CC' }
                                                }
                                            }}
                                            inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 'bold' } }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
      </Box>
    </Box>
  );
}