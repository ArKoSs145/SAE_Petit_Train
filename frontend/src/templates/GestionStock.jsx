import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Typography, TextField, Button, Grid, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
    Divider, Popover, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import CategoryIcon from '@mui/icons-material/Category';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GestionStock({ onRetour }) {
    const [form, setForm] = useState({ nomPiece: "", description: "", codeBarre: "" });
    const [boites, setBoites] = useState([]);
    
    // État pour le Popover (Explication Code-Barre)
    const [anchorEl, setAnchorEl] = useState(null);

    // --- LOGIQUE FETCH ---
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

    // --- GESTION FORMULAIRE ---
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

    // --- GESTION STOCK TABLEAU ---
    const handleLocalStockChange = (idBoite, value) => {
        setBoites(boites.map(b => b.idBoite === idBoite ? { ...b, nbBoite: value } : b));
    };

    const handleSaveStock = async (idBoite, nouveauNb) => {
        try {
            const res = await fetch(`${apiUrl}/api/admin/update-stock-boite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idBoite, nbBoite: parseInt(nouveauNb) })
            });
            if (res.ok) alert("Stock mis à jour !");
        } catch (e) { alert("Erreur lors de la mise à jour"); }
    };

    // --- GESTION POPOVER ---
    const handlePopOpen = (event) => { setAnchorEl(event.currentTarget); };
    const handlePopClose = () => { setAnchorEl(null); };
    const openPop = Boolean(anchorEl);

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
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6" color="primary">Ajouter une Référence</Typography>
                            <IconButton onClick={handlePopOpen} color="info" size="small">
                                <InfoIcon />
                            </IconButton>
                        </Box>

                        {/* BULLE D'AIDE : LOGIQUE CODE-BARRE */}
                        <Popover
                            open={openPop}
                            anchorEl={anchorEl}
                            onClose={handlePopClose}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                            <Box sx={{ p: 2, maxWidth: 320 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    Structure des Codes-Barres
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    Utilisez le format <strong>PREFIXE-NUMERO</strong> pour une meilleure organisation :
                                </Typography>
                                <List dense sx={{ py: 0 }}>
                                    {[
                                        { c: 'PHA', d: 'Phares et optiques' },
                                        { c: 'VIS', d: 'Visserie (vis, écrous, rondelles)' },
                                        { c: 'FIX', d: 'Fixations, supports et cadres' },
                                        { c: 'ELE', d: 'Composants électriques et fils' },
                                        { c: 'CAT', d: 'Catadioptres et réflecteurs' },
                                        { c: 'PKG', d: 'Packaging (sachets, notices)' },
                                    ].map((item) => (
                                        <ListItem key={item.c} sx={{ px: 0, py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 35 }}>
                                                <CategoryIcon fontSize="inherit" />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary={<Typography variant="body2"><strong>{item.c}</strong> - {item.d}</Typography>} 
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                    Exemple : PHA-0005, VIS-0012
                                </Typography>
                            </Box>
                        </Popover>

                        <Divider sx={{ mb: 2 }} />
                        
                        <TextField 
                            fullWidth label="Nom de la pièce *" name="nomPiece" 
                            value={form.nomPiece} onChange={handleChange} sx={{ mb: 2 }} 
                        />
                        <TextField 
                            fullWidth label="Description" name="description" 
                            value={form.description} onChange={handleChange} sx={{ mb: 2 }} 
                        />
                        <TextField 
                            fullWidth label="Code Barre Boîte *" name="codeBarre" 
                            placeholder="Ex: PHA-0001"
                            value={form.codeBarre} onChange={handleChange} sx={{ mb: 2 }} 
                        />
                        
                        <Button 
                            variant="contained" onClick={handleSubmit} 
                            fullWidth size="large" sx={{ mt: 1 }}
                        >
                            Créer Pièce + Boîte
                        </Button>
                    </Paper>
                </Grid>

                {/* --- SECTION 2 : TABLEAU DE GESTION --- */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" color="primary">Inventaire des Boîtes</Typography>
                            <Button startIcon={<RefreshIcon />} onClick={fetchBoites}>Actualiser</Button>
                        </Box>
                        
                        <TableContainer sx={{ maxHeight: '65vh' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold' }}>Pièce</TableCell>
                                        <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold' }}>Code Barre</TableCell>
                                        <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold' }} align="center">Stock</TableCell>
                                        <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold' }} align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {boites.map((b) => (
                                        <TableRow key={b.idBoite} hover>
                                            <TableCell>{b.nom_piece}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#555' }}>
                                                {b.code_barre}
                                            </TableCell>
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