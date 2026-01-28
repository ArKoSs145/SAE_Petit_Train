import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Typography, TextField, Button, Grid, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
    Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GestionStock({ onRetour }) {
    const [form, setForm] = useState({ nomPiece: "", description: "", codeBarre: "" });
    const [boites, setBoites] = useState([]);

    // Charger les boites avec leurs détails
    const fetchBoites = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/admin/boites-details`);
            if (res.ok) {
                const data = await res.json();
                setBoites(data);
            }
        } catch (e) { console.error("Erreur fetch boites:", e); }
    };

    useEffect(() => { fetchBoites(); }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!form.nomPiece || !form.codeBarre) return alert("Nom et Code Barre requis");
        try {
            const res = await fetch(`${apiUrl}/api/admin/create-piece-et-boite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert("Référence et boîte créées avec succès !");
                setForm({ nomPiece: "", description: "", codeBarre: "" });
                fetchBoites(); 
            }
        } catch (e) { console.error(e); }
    };

    // Modifier la valeur dans l'input du tableau (état local)
    const handleLocalStockChange = (idBoite, value) => {
        setBoites(boites.map(b => b.idBoite === idBoite ? { ...b, nbBoite: value } : b));
    };

    // Sauvegarder la modification en base de données
    const handleSaveStock = async (idBoite, nouveauNb) => {
        try {
            const res = await fetch(`${apiUrl}/api/admin/update-stock-boite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idBoite, nbBoite: parseInt(nouveauNb) })
            });
            if (res.ok) alert("Stock mis à jour en base de données !");
        } catch (e) { alert("Erreur lors de la mise à jour"); }
    };

    return (
        <Box sx={{ p: 4, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
            <Button onClick={onRetour} variant="outlined" sx={{ mb: 3 }}>Retour Admin</Button>
            
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
                Gestion des Pièces & Stocks
            </Typography>

            <Grid container spacing={4}>
                {/* --- SECTION 1 : CRÉATION --- */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom color="primary">Ajouter une Référence</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <TextField fullWidth label="Nom de la pièce *" name="nomPiece" value={form.nomPiece} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Description" name="description" value={form.description} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Code Barre Boîte *" name="codeBarre" value={form.codeBarre} onChange={handleChange} sx={{ mb: 2 }} />
                        <Button variant="contained" onClick={handleSubmit} fullWidth size="large">Créer Pièce + Boîte</Button>
                    </Paper>
                </Grid>

                {/* --- SECTION 2 : TABLEAU DE GESTION --- */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" color="primary">Inventaire des Boîtes</Typography>
                            <Button startIcon={<RefreshIcon />} onClick={fetchBoites}>Actualiser</Button>
                        </Box>
                        
                        <TableContainer sx={{ maxHeight: '60vh' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold' }}>Pièce</TableCell>
                                        <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold' }}>Code Barre</TableCell>
                                        <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold' }} align="center">Stock (Unités)</TableCell>
                                        <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold' }} align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {boites.map((b) => (
                                        <TableRow key={b.idBoite} hover>
                                            <TableCell>{b.nom_piece}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace' }}>{b.code_barre}</TableCell>
                                            <TableCell align="center">
                                                <TextField 
                                                    type="number"
                                                    variant="outlined"
                                                    size="small"
                                                    value={b.nbBoite}
                                                    onChange={(e) => handleLocalStockChange(b.idBoite, e.target.value)}
                                                    sx={{ width: 80, input: { textAlign: 'center' } }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton 
                                                    color="success" 
                                                    onClick={() => handleSaveStock(b.idBoite, b.nbBoite)}
                                                    title="Sauvegarder le stock"
                                                >
                                                    <SaveIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}