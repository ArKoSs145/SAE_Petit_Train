import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Divider, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TextField, CircularProgress, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import TimerIcon from '@mui/icons-material/Timer';
const apiUrl = import.meta.env.VITE_API_URL;

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
        // On initialise 'nouveauDelai' avec la valeur actuelle 'delai_actuel'
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
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh', bgcolor: '#333', p: 2, boxSizing: 'border-box' }}>
      <Paper sx={{ flexGrow: 1, bgcolor: 'white', p: 4, borderRadius: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onRetourAdmin} sx={{ color: 'black', borderColor: '#ccc' }}>
                    Retour
                </Button>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Configuration des Délais</Typography>
            </Box>

            <Button 
                variant="contained" 
                color="primary"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveGlobal}
                disabled={loading || saving}
            >
                Enregistrer les paramètres
            </Button>
        </Box>

        <Divider />

        {message && <Alert severity={message.type} onClose={() => setMessage(null)}>{message.text}</Alert>}

        {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>
        ) : (
            <TableContainer component={Paper} variant="outlined">
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Objet / Pièce</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Code Barre</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="center">Délai Actuel (sec)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="center">Nouveau Délai (sec)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {boites.map((boite) => (
                            <TableRow key={boite.idBoite} hover>
                                <TableCell>{boite.nom_piece}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace', color: 'gray' }}>{boite.code_barre}</TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <TimerIcon fontSize="small" color="action" />
                                        <Typography sx={{ fontWeight: 'bold' }}>{boite.delai_actuel}s</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="center">
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={boite.nouveauDelai}
                                        onChange={(e) => handleInputChange(boite.idBoite, e.target.value)}
                                        sx={{ width: 120 }}
                                        inputProps={{ min: 0, style: { textAlign: 'center' } }}
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
  );
}