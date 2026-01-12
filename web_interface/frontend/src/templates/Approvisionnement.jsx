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

export default function Approvisionnement({ onRetourAdmin }) {
  // Liste des boîtes avec leurs informations (nom, code-barre, délai)
  const [boites, setBoites] = useState([]);
  // Gère l'affichage du chargement initial
  const [loading, setLoading] = useState(true);
  // Gère l'état visuel du bouton de sauvegarde pendant l'envoi
  const [saving, setSaving] = useState(false);
  // Message de succès ou d'erreur
  const [message, setMessage] = useState(null);

  // Chargement des données au montage du composant
  useEffect(() => {
    fetchBoites();
  }, []);

   // Récupère la liste des boîtes et leurs délais depuis le backend.
  const fetchBoites = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/boites-delais');
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

  // Met à jour l'état local lorsqu'un utilisateur modifie un délai dans le tableau.
  const handleInputChange = (idBoite, value) => {
    setBoites(prev => prev.map(b => 
      b.idBoite === idBoite ? { ...b, nouveauDelai: value === '' ? '' : parseInt(value, 10) } : b
    ));
  };

  /**
   * Envoie l'ensemble des modifications au serveur.
   * Prépare une liste d'objets contenant uniquement l'ID et le nouveau délai.
   */
  const handleSaveGlobal = async () => {
    setSaving(true);
    setMessage(null);
    
    const updates = boites.map(b => ({
      idBoite: b.idBoite,
      delai: b.nouveauDelai
    }));

    try {
      const res = await fetch('http://localhost:8000/api/admin/update-delais-appro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Délais de réapprovisionnement mis à jour !' });
        fetchBoites(); // Rafraîchissement pour confirmer les données
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
        
        {/* Navigation et bouton Sauvegarder */}
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

        {/* Zone de notifications (Succès/Erreur) */}
        {message && <Alert severity={message.type} onClose={() => setMessage(null)}>{message.text}</Alert>}

        {/* Liste dynamique de toutes les pièces en stock */}
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
                                {/* Affichage de la valeur actuelle en base */}
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <TimerIcon fontSize="small" color="action" />
                                        <Typography sx={{ fontWeight: 'bold' }}>{boite.delai_actuel}s</Typography>
                                    </Box>
                                </TableCell>
                                {/* Champ de saisie pour la modification */}
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